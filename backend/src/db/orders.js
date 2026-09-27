'use strict';

// Orders repository - owns the `orders` + `order_items` tables in PostgreSQL
// and data/orders.json while PostgreSQL is not configured.
//
// Document shape (identical in both modes):
//   { _id, orderNumber?, trackingId?, userId, buyerName, buyerEmail,
//     items: [{ product: { _id, name }, quantity, price, sellerId }],
//     totalAmount, status, paymentMethod, shippingAddress, archived?,
//     shippedAt?, deliveredAt?, idempotency_key?, createdAt, updatedAt? }
//
// An order item is stored normalised across orders + order_items; on read the
// item is rebuilt as the nested `product` snapshot the API has always used.
// Order-level extras land in the `metadata` JSONB column.

const db = require('./postgres');
const legacy = require('./legacy');

const COLLECTION = 'orders';

function toIso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// order_items row -> legacy item shape ({ product, quantity, price, sellerId })
function rowToItem(row) {
  if (!row) return null;
  const item = {
    product: { _id: row.product_id || null, name: row.product_name || '' },
    quantity: row.quantity,
    price: Number(row.price) || 0,
  };
  if (row.seller_id) item.sellerId = row.seller_id;
  return item;
}

/** order doc item -> order_items column values. */
function itemToRow(orderId, item) {
  const productId = (item && item.product && item.product._id) || item.productId || null;
  return [
    orderId,
    productId ? String(productId) : null,
    (item && item.product && item.product.name) || '',
    Math.max(1, Math.trunc(Number(item.quantity) || 1)),
    Number(item.price) || 0,
    item.sellerId ? String(item.sellerId) : null,
  ];
}

const ORDER_NON_META = new Set([
  '_id', 'id', 'userId', 'items', 'trackingId', 'orderNumber', 'buyerName',
  'buyerEmail', 'status', 'paymentMethod', 'totalAmount', 'shippingAddress',
  'archived', 'shippedAt', 'deliveredAt', 'idempotency_key', 'createdAt', 'updatedAt',
]);

/** orders row + its order_items rows -> API document. */
function rowToOrder(row, itemRows) {
  if (!row) return null;
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const doc = { ...meta };
  doc._id = row.id;
  if (row.order_number) doc.orderNumber = row.order_number;
  if (row.tracking_id) doc.trackingId = row.tracking_id;
  doc.userId = row.user_id || null;
  doc.buyerName = row.buyer_name || '';
  doc.buyerEmail = row.buyer_email || '';
  doc.items = (itemRows || []).map(rowToItem);
  doc.totalAmount = Number(row.total_amount) || 0;
  doc.status = row.status || 'pending';
  doc.paymentMethod = row.payment_method || 'cod';
  doc.shippingAddress = row.shipping_address || {};
  if (row.archived) doc.archived = true;
  if (row.shipped_at) doc.shippedAt = toIso(row.shipped_at);
  if (row.delivered_at) doc.deliveredAt = toIso(row.delivered_at);
  if (row.idempotency_key) doc.idempotency_key = row.idempotency_key;
  doc.createdAt = toIso(row.created_at);
  if (row.updated_at) doc.updatedAt = toIso(row.updated_at);
  return doc;
}

/** API order document -> orders column values + metadata payload. */
function docToRow(doc) {
  const meta = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!ORDER_NON_META.has(key) && value !== undefined) meta[key] = value;
  }
  return {
    user_id: doc.userId ? String(doc.userId) : null,
    tracking_id: doc.trackingId ? String(doc.trackingId) : null,
    order_number: doc.orderNumber ? String(doc.orderNumber) : null,
    buyer_name: doc.buyerName || '',
    buyer_email: doc.buyerEmail || '',
    status: doc.status || 'pending',
    payment_method: doc.paymentMethod || 'cod',
    total_amount: Number(doc.totalAmount) || 0,
    shipping_address: doc.shippingAddress || {},
    archived: !!doc.archived,
    shipped_at: toDateOrNull(doc.shippedAt),
    delivered_at: toDateOrNull(doc.deliveredAt),
    idempotency_key: doc.idempotency_key ? String(doc.idempotency_key) : null,
    metadata: meta,
    created_at: toDateOrNull(doc.createdAt) || new Date(),
    updated_at: toDateOrNull(doc.updatedAt),
  };
}

const ORDER_COL_LIST = `id, user_id, tracking_id, order_number, buyer_name,
  buyer_email, status, payment_method, total_amount, shipping_address, archived,
  shipped_at, delivered_at, idempotency_key, metadata, created_at, updated_at`;

function orderRowParams(id, r) {
  return [id, r.user_id, r.tracking_id, r.order_number, r.buyer_name,
    r.buyer_email, r.status, r.payment_method, r.total_amount,
    r.shipping_address, r.archived, r.shipped_at, r.delivered_at,
    r.idempotency_key, r.metadata, r.created_at, r.updated_at];
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// order_id -> [order_items rows] for the given orders (insertion order).
async function itemsFor(orderIds) {
  if (orderIds.length === 0) return new Map();
  const { rows } = await db.query(
    'SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id ASC',
    [orderIds]
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.order_id)) map.set(row.order_id, []);
    map.get(row.order_id).push(row);
  }
  return map;
}

async function list() {
  if (db.isEnabled()) {
    const { rows } = await db.query('SELECT * FROM orders ORDER BY created_at ASC, id ASC');
    const items = await itemsFor(rows.map((r) => r.id));
    return rows.map((row) => rowToOrder(row, items.get(row.id) || []));
  }
  return legacy.read(COLLECTION);
}

async function findById(id) {
  if (id === undefined || id === null) return null;
  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT * FROM orders WHERE id = $1', [String(id)]);
    if (!row) return null;
    const items = await itemsFor([row.id]);
    return rowToOrder(row, items.get(row.id) || []);
  }
  return legacy.findById(COLLECTION, id);
}

async function findByTrackingId(trackingId) {
  if (trackingId === undefined || trackingId === null) return null;
  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT * FROM orders WHERE tracking_id = $1', [String(trackingId)]);
    if (!row) return null;
    const items = await itemsFor([row.id]);
    return rowToOrder(row, items.get(row.id) || []);
  }
  const match = legacy.read(COLLECTION)
    .find((o) => String(o.trackingId) === String(trackingId));
  return match || null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Transitional (Phases 6-11): read paths not migrated yet still read the JSON
// cache. Removed in Phase 12 with the JSON layer.
async function mirrorAll() {
  if (!db.isEnabled() || !legacy.isMirrorEnabled() || !legacy.hasSharedStore()) return;
  try {
    const { rows } = await db.query('SELECT * FROM orders ORDER BY created_at ASC, id ASC');
    const items = await itemsFor(rows.map((r) => r.id));
    legacy.write(COLLECTION, rows.map((row) => rowToOrder(row, items.get(row.id) || [])));
  } catch (err) {
    console.error('[db:orders] legacy mirror failed:', err.message);
  }
}

/**
 * Insert an order + its items on an EXISTING transaction client so checkout
 * can commit the order atomically with the stock decrement. Does not mirror -
 * the caller decides when (see finalizeCheckout).
 *
 * FK note: user_id/seller_id/product_id must exist or be null; checkout
 * validates the buyer and products before calling (same as the import).
 */
async function insertInTransaction(tx, doc) {
  const id = String(doc._id);
  const r = docToRow(doc);
  await tx.query(
    `INSERT INTO orders (${ORDER_COL_LIST})
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    orderRowParams(id, r)
  );
  for (const item of doc.items || []) {
    await tx.query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, seller_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      itemToRow(id, item)
    );
  }
  return doc;
}

async function create(doc) {
  if (db.isEnabled()) {
    await db.transaction((tx) => insertInTransaction(tx, doc));
    await mirrorAll();
    return doc;
  }
  const rows = legacy.read(COLLECTION);
  rows.push(doc);
  legacy.write(COLLECTION, rows);
  return doc;
}

/**
 * Post-checkout persistence. The SQLite checkout transaction cannot span
 * databases, so in PostgreSQL mode the order row is inserted here -
 * idempotently, because a PG-native checkout will have written it on its own
 * transaction already (ordersRepo.insertInTransaction). In JSON mode this is
 * the actual write (the old post-commit push). Safe to call on replays.
 */
async function finalizeCheckout(doc) {
  if (db.isEnabled()) {
    const existing = await findById(doc._id);
    if (!existing) {
      await db.transaction((tx) => insertInTransaction(tx, doc));
    }
    await mirrorAll();
    return doc;
  }
  const rows = legacy.read(COLLECTION);
  if (!rows.some((o) => String(o._id) === String(doc._id))) {
    rows.push(doc);
    legacy.write(COLLECTION, rows);
  }
  return doc;
}

/**
 * Read-modify-write of an order (same semantics as mutating the JSON doc).
 * Only scalar order fields are written; order_items are never touched here.
 */
async function update(id, patch) {
  if (db.isEnabled()) {
    const current = await findById(id);
    if (!current) return null;
    const merged = { ...current, ...patch, _id: current._id };
    const r = docToRow(merged);
    const setCols = ORDER_COL_LIST.split(',').map((c) => c.trim())
      .filter((c) => c && c !== 'id');
    const sets = setCols.map((c, i) => `${c} = $${i + 2}`).join(', ');
    await db.query(`UPDATE orders SET ${sets} WHERE id = $1`, orderRowParams(String(id), r));
    await mirrorAll();
    return findById(id);
  }
  const rows = legacy.read(COLLECTION);
  const order = rows.find((o) => String(o._id) === String(id));
  if (!order) return null;
  Object.assign(order, patch);
  legacy.write(COLLECTION, rows);
  return order;
}

async function clear() {
  if (db.isEnabled()) {
    await db.query('DELETE FROM orders'); // cascades order_items
    await mirrorAll();
    return;
  }
  legacy.write(COLLECTION, []);
}

module.exports = {
  // reads
  list,
  findById,
  findByTrackingId,
  // writes
  create,
  insertInTransaction,
  finalizeCheckout,
  update,
  clear,
  // helpers (used by checkout/tests)
  mirrorAll,
  rowToOrder,
};