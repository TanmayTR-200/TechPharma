'use strict';

// Products repository - owns the `products` table in PostgreSQL and
// data/products.json while PostgreSQL is not configured.
//
// API document shape (identical in both modes):
//   { id, _id, name, description, price, category, images, status, version,
//     userId, supplierId, createdAt, updatedAt, stock?, total_stock?,
//     available_stock?, reserved_stock?, sold?, salesCount?, ...extra }
//
// Fields with a column map to columns; everything else (views, brand, model,
// condition, specifications, hsn, gst, ...) goes into the `metadata` JSONB
// column and is spread back on read, so routes cannot tell the difference.
// Stock columns are a denormalised mirror refreshed by the inventory layer -
// inventory_stock stays the authority for checkout.

const db = require('./postgres');
const legacy = require('./legacy');

const COLLECTION = 'products';

function toIso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// document field -> column. Fixed map: column names never come from input.
const COLUMN_FIELDS = {
  name: 'name', description: 'description', price: 'price',
  category: 'category', state: 'state', images: 'images', status: 'status',
  version: 'version', stock: 'stock', total_stock: 'total_stock',
  available_stock: 'available_stock', reserved_stock: 'reserved_stock',
  sold: 'sold', salesCount: 'sales_count',
  createdAt: 'created_at', updatedAt: 'updated_at',
};

// Fields that are NOT metadata (derived from / folded into columns).
const NON_META_FIELDS = new Set([
  '_id', 'id', 'userId', 'supplierId', ...Object.keys(COLUMN_FIELDS),
]);

/** PostgreSQL row -> API document. */
function rowToProduct(row) {
  if (!row) return null;
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const doc = { ...meta };
  doc._id = row.id;
  doc.id = row.id;
  doc.name = row.name;
  doc.description = row.description || '';
  doc.price = Number(row.price) || 0;
  doc.category = row.category || '';
  if (row.state) doc.state = row.state;
  doc.images = Array.isArray(row.images) ? row.images : [];
  doc.status = row.status || 'active';
  doc.version = row.version || 0;
  const mirror = {
    stock: row.stock, total_stock: row.total_stock,
    available_stock: row.available_stock, reserved_stock: row.reserved_stock,
    sold: row.sold, salesCount: row.sales_count,
  };
  for (const [field, value] of Object.entries(mirror)) {
    if (value !== null && value !== undefined) doc[field] = value;
  }
  if (row.seller_id) {
    doc.userId = row.seller_id;
    doc.supplierId = row.seller_id;
  }
  doc.createdAt = toIso(row.created_at);
  doc.updatedAt = toIso(row.updated_at) || doc.createdAt;
  return doc;
}

/** API document -> column values + metadata payload for INSERT/UPDATE. */
function docToRow(doc) {
  const meta = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!NON_META_FIELDS.has(key) && value !== undefined) meta[key] = value;
  }
  const pick = (f) => (doc[f] === undefined ? null : doc[f]);
  return {
    seller_id: doc.userId || doc.supplierId || null,
    name: doc.name,
    description: doc.description || '',
    price: Number(doc.price) || 0,
    category: doc.category || '',
    state: doc.state || '',
    images: Array.isArray(doc.images) ? doc.images : [],
    status: doc.status || 'active',
    version: Number(doc.version) || 0,
    stock: pick('stock'),
    total_stock: pick('total_stock'),
    available_stock: pick('available_stock'),
    reserved_stock: pick('reserved_stock'),
    sold: pick('sold'),
    sales_count: pick('salesCount'),
    created_at: toDateOrNull(doc.createdAt) || new Date(),
    updated_at: toDateOrNull(doc.updatedAt),
    metadata: meta,
  };
}

const COL_LIST = `id, seller_id, name, description, price, category, state,
  images, status, version, stock, total_stock, available_stock, reserved_stock,
  sold, sales_count, metadata, created_at, updated_at`;

const SET_SQL = `seller_id = $2, name = $3, description = $4, price = $5,
  category = $6, state = $7, images = $8, status = $9, version = $10,
  stock = $11, total_stock = $12, available_stock = $13, reserved_stock = $14,
  sold = $15, sales_count = $16, metadata = $17, created_at = $18,
  updated_at = $19`;

function rowParams(r) {
  return [r.seller_id, r.name, r.description, r.price, r.category, r.state,
    r.images, r.status, r.version, r.stock, r.total_stock, r.available_stock,
    r.reserved_stock, r.sold, r.sales_count, r.metadata, r.created_at,
    r.updated_at];
}

function placeholders() {
  return Array.from({ length: 19 }, (_, i) => `$${i + 1}`).join(', ');
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function list() {
  if (db.isEnabled()) {
    const { rows } = await db.query(
      'SELECT * FROM products ORDER BY created_at ASC, id ASC'
    );
    return rows.map(rowToProduct);
  }
  return legacy.read(COLLECTION);
}

async function findById(id) {
  if (id === undefined || id === null) return null;
  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT * FROM products WHERE id = $1', [String(id)]);
    return rowToProduct(row);
  }
  return legacy.findById(COLLECTION, id);
}

async function listBySeller(sellerId) {
  const sid = String(sellerId || '');
  if (db.isEnabled()) {
    const { rows } = await db.query(
      'SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at ASC, id ASC',
      [sid]
    );
    return rows.map(rowToProduct);
  }
  return legacy.read(COLLECTION).filter(
    (p) => String(p.userId || '') === sid || String(p.supplierId || '') === sid
  );
}

async function count() {
  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT COUNT(*)::int AS n FROM products');
    return row ? row.n : 0;
  }
  return legacy.read(COLLECTION).length;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Transitional (Phases 6-11): read paths not migrated yet (dashboard, cart,
// invoice, seed/debug) still read the JSON cache - mirror PG writes there so
// they never see stale products. Removed in Phase 12 with the JSON layer.
async function mirrorAll() {
  if (!db.isEnabled() || !legacy.isMirrorEnabled() || !legacy.hasSharedStore()) return;
  try {
    const { rows } = await db.query(
      'SELECT * FROM products ORDER BY created_at ASC, id ASC'
    );
    legacy.write(COLLECTION, rows.map(rowToProduct));
  } catch (err) {
    console.error('[db:products] legacy mirror failed:', err.message);
  }
}

async function create(doc) {
  if (db.isEnabled()) {
    const r = docToRow(doc);
    const row = await db.queryOne(
      `INSERT INTO products (${COL_LIST}) VALUES (${placeholders()}) RETURNING *`,
      [String(doc._id || doc.id), ...rowParams(r)]
    );
    await mirrorAll();
    return rowToProduct(row);
  }
  const rows = legacy.read(COLLECTION);
  rows.push(doc);
  legacy.write(COLLECTION, rows);
  return doc;
}

async function update(id, patch) {
  if (db.isEnabled()) {
    const current = await findById(id);
    if (!current) return null;
    const merged = { ...current, ...patch, _id: current._id, id: current.id };
    const r = docToRow(merged);
    const row = await db.queryOne(
      `UPDATE products SET ${SET_SQL} WHERE id = $1 RETURNING *`,
      [String(id), ...rowParams(r)]
    );
    await mirrorAll();
    return rowToProduct(row);
  }
  const rows = legacy.read(COLLECTION);
  const index = rows.findIndex((p) => String(p._id) === String(id));
  if (index === -1) return null;
  rows[index] = { ...rows[index], ...patch };
  legacy.write(COLLECTION, rows);
  return rows[index];
}

async function remove(id) {
  if (db.isEnabled()) {
    const deleted = await findById(id);
    if (!deleted) return null;
    await db.query('DELETE FROM products WHERE id = $1', [String(id)]);
    await mirrorAll();
    return deleted;
  }
  const rows = legacy.read(COLLECTION);
  const index = rows.findIndex((p) => String(p._id) === String(id));
  if (index === -1) return null;
  const [removed] = rows.splice(index, 1);
  legacy.write(COLLECTION, rows);
  return removed;
}

async function clear() {
  if (db.isEnabled()) {
    // Cascades to inventory_stock / reservations (order_items SET NULL)
    await db.query('DELETE FROM products');
    await mirrorAll();
    return;
  }
  legacy.write(COLLECTION, []);
}

/**
 * Refresh the denormalised stock mirror after an inventory mutation (PG only).
 * @param {string} id product id
 * @param {{stock?:number,total_stock?:number,available_stock?:number,
 *          reserved_stock?:number,sold?:number,sales_count?:number}} stock
 */
async function updateStockMirror(id, stock) {
  if (!db.isEnabled() || id === undefined || id === null) return;
  await db.query(
    `UPDATE products
        SET stock = $2, total_stock = $3, available_stock = $4,
            reserved_stock = $5, sold = $6, sales_count = $7
      WHERE id = $1`,
    [String(id), stock.stock ?? null, stock.total_stock ?? 0,
      stock.available_stock ?? 0, stock.reserved_stock ?? 0,
      stock.sold ?? 0, stock.sales_count ?? 0]
  );
  await mirrorAll();
}

module.exports = {
  // reads
  list,
  findById,
  listBySeller,
  count,
  // writes
  create,
  update,
  remove,
  clear,
  updateStockMirror,
  // helpers (used by the import script and tests)
  rowToProduct,
};