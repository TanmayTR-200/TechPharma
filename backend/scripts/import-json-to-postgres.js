'use strict';

// One-time (and safely repeatable) import of the legacy JSON data into PostgreSQL.
//
//   node scripts/import-json-to-postgres.js [--dry-run] [--strict]
//
// Properties required of this script (see docs/POSTGRES_MIGRATION.md):
//   * original ids are preserved (users/products/orders/messages keep their _id)
//   * timestamps are preserved (ISO strings -> timestamptz)
//   * relationships are preserved (order items -> orders/products, addresses -> users)
//   * required fields are validated; invalid records are REPORTED, never silently dropped
//   * every record is written inside one transaction - partial imports cannot happen
//   * re-running is safe: parents are upserted, child rows are rebuilt for that parent
//
// It never deletes source data: the JSON files stay untouched as a backup.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../src/db/postgres');
const { runMigrations } = require('../src/db/migrate');
const { pickItemName } = require('../src/db/order-item-name');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DRY_RUN = process.argv.includes('--dry-run');
const STRICT = process.argv.includes('--strict');

const report = {
  imported: {},     // collection -> rows written
  rebuilt: {},      // collection -> child rows rebuilt
  invalid: [],      // { collection, id, reason }
  warnings: [],     // free-form notes (unresolved relationships, unmapped fields, ...)
  unmapped: [],     // files present in data/ that are intentionally not imported
};

// Collections that exist as JSON but are NOT imported, with the reason.
const UNMAPPED_COLLECTIONS = {
  conversations: 'derived data - the chat API groups messages on the fly',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCollection(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    report.invalid.push({ collection: name, id: '-', reason: `unreadable JSON: ${err.message}` });
    return [];
  }
}

function warn(message) {
  report.warnings.push(message);
}

function fail(collection, record, reason) {
  report.invalid.push({
    collection,
    id: record && (record._id || record.id || record.userId) ? String(record._id || record.id || record.userId) : '-',
    reason,
  });
  return false;
}

function toIso(value) {
  if (value === null || value === undefined || value === '') return null;
  // Numbers (epoch ms) and ISO strings are both accepted by the legacy data
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function str(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function intOrNull(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function jsonOr(value, fallback) {
  if (value === null || value === undefined) return JSON.stringify(fallback);
  return JSON.stringify(value);
}

function bump(bucket, key, by = 1) {
  bucket[key] = (bucket[key] || 0) + by;
}

// ---------------------------------------------------------------------------
// Import: users (+ password_history, saved_addresses)
// ---------------------------------------------------------------------------

async function importUsers(client) {
  const users = readCollection('users');
  const knownIds = new Set(users.map((u) => String(u._id)));

  for (const u of users) {
    if (!u._id) { fail('users', u, 'missing _id'); continue; }
    if (!u.email) { fail('users', u, 'missing email'); continue; }
    if (!u.password) { fail('users', u, 'missing password hash'); continue; }
    if (!u.name) { fail('users', u, 'missing name'); continue; }

    await client.query(
      `INSERT INTO users (
         id, email, password, name, role, phone, state, company,
         created_at, updated_at, password_changed_at,
         failed_attempts, locked_until, last_failed_at, last_reset_email_at,
         reset_token, reset_token_expires_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,
         COALESCE($9, now()), $10, $11,
         $12,$13,$14,$15,
         $16,$17
       )
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password = EXCLUDED.password,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         phone = EXCLUDED.phone,
         state = EXCLUDED.state,
         company = EXCLUDED.company,
         password_changed_at = EXCLUDED.password_changed_at,
         failed_attempts = EXCLUDED.failed_attempts,
         locked_until = EXCLUDED.locked_until,
         last_failed_at = EXCLUDED.last_failed_at,
         last_reset_email_at = EXCLUDED.last_reset_email_at,
         reset_token = EXCLUDED.reset_token,
         reset_token_expires_at = EXCLUDED.reset_token_expires_at`,
      [
        String(u._id),
        String(u.email).toLowerCase(),
        u.password,
        u.name,
        u.role === 'admin' ? 'admin' : 'user',
        str(u.phone),
        str(u.state),
        jsonOr(u.company, {}),
        toIso(u.createdAt),
        toIso(u.updatedAt),
        toIso(u.passwordChangedAt),
        num(u.failedAttempts, 0),
        toIso(u.lockedUntil),
        toIso(u.lastFailedAt),
        toIso(u.lastResetEmailAt),
        u.resetToken && u.resetToken.token ? String(u.resetToken.token) : null,
        u.resetToken ? toIso(u.resetToken.expiresAt) : null,
      ]
    );
    bump(report.imported, 'users');
  }
  return knownIds;
}

/** Child rows for users: password history + saved addresses (rebuilt per user). */
async function importUserChildren(client, knownUserIds) {
  const users = readCollection('users');

  for (const u of users) {
    const id = String(u._id);
    if (!knownUserIds.has(id)) continue;

    // password_history - oldest -> newest, newest gets the highest serial id
    const history = Array.isArray(u.passwordHistory) ? u.passwordHistory : [];
    await client.query('DELETE FROM password_history WHERE user_id = $1', [id]);
    for (const hash of history) {
      if (!hash) { warn(`users/${id}: empty password history entry skipped`); continue; }
      await client.query(
        'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
        [id, String(hash)]
      );
      bump(report.rebuilt, 'password_history');
    }

    // saved_addresses - original order preserved via `position`
    const addresses = Array.isArray(u.savedAddresses) ? u.savedAddresses : [];
    await client.query('DELETE FROM saved_addresses WHERE user_id = $1', [id]);
    for (const a of addresses) {
      if (!a || !a.line1 || !a.city || !a.pincode) {
        fail('saved_addresses', { ...a, userId: id }, 'missing line1/city/pincode');
        continue;
      }
      await client.query(
        `INSERT INTO saved_addresses (id, user_id, label, name, phone, line1, city, state, pincode)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          String(a._id || `${id}-${a.pincode}-${Math.random().toString(36).slice(2, 8)}`),
          id, str(a.label, 'Home'), str(a.name), str(a.phone),
          str(a.line1), str(a.city), str(a.state), str(a.pincode),
        ]
      );
      bump(report.rebuilt, 'saved_addresses');
    }
  }
}

// ---------------------------------------------------------------------------
// Import: otps
// ---------------------------------------------------------------------------

async function importOtps(client) {
  const entries = readCollection('otps');
  for (const e of entries) {
    if (!e.email || !e.purpose || !e.otp) { fail('otps', e, 'missing email/purpose/otp'); continue; }
    const expiresAt = toIso(e.expiresAt);
    if (!expiresAt) { fail('otps', e, 'missing/invalid expiresAt'); continue; }

    await client.query(
      `INSERT INTO otps (id, email, purpose, otp, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         purpose = EXCLUDED.purpose,
         otp = EXCLUDED.otp,
         expires_at = EXCLUDED.expires_at`,
      [
        String(e._id || `${String(e.email).toLowerCase()}__${e.purpose}`),
        String(e.email).toLowerCase(), str(e.purpose), String(e.otp), expiresAt,
      ]
    );
    bump(report.imported, 'otps');
  }
}

// ---------------------------------------------------------------------------
// Import: products (+ inventory_stock)
// ---------------------------------------------------------------------------

// Structured product fields -> columns. Everything else lands in `metadata`,
// so no legacy field is ever dropped.
const PRODUCT_COLUMNS = {
  name: 'name',
  description: 'description',
  price: 'price',
  category: 'category',
  state: 'state',
  status: 'status',
  version: 'version',
  stock: 'stock',
  total_stock: 'total_stock',
  available_stock: 'available_stock',
  reserved_stock: 'reserved_stock',
  sold: 'sold',
  salesCount: 'sales_count',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

async function importProducts(client, knownUserIds) {
  const products = readCollection('products');
  const knownProductIds = new Set(products.map((p) => String(p._id)));

  for (const p of products) {
    if (!p._id) { fail('products', p, 'missing _id'); continue; }
    if (!p.name) { fail('products', p, 'missing name'); continue; }

    const id = String(p._id);
    const rawSellerId = p.sellerId || p.userId || p.supplierId || null;
    let sellerId = null;
    if (rawSellerId) {
      if (knownUserIds.has(String(rawSellerId))) {
        sellerId = String(rawSellerId);
      } else {
        // Never invent a user: keep the raw id in metadata and report it
        warn(`products/${id}: seller ${rawSellerId} not in users.json - seller_id left NULL`);
      }
    }

    const metadata = { ...(p.metadata && typeof p.metadata === 'object' ? p.metadata : {}) };
    for (const [key, value] of Object.entries(p)) {
      if (['_id', 'id', 'sellerId', 'userId', 'supplierId', 'images', 'metadata'].includes(key)) continue;
      if (Object.prototype.hasOwnProperty.call(PRODUCT_COLUMNS, key)) continue;
      metadata[key] = value;
    }
    if (rawSellerId && !sellerId) metadata.legacy_seller_id = String(rawSellerId);

    await client.query(
      `INSERT INTO products (
         id, seller_id, name, description, price, category, state, images, status, version,
         stock, total_stock, available_stock, reserved_stock, sold, sales_count,
         metadata, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
         $11,$12,$13,$14,$15,$16,
         $17, COALESCE($18, now()), $19
       )
       ON CONFLICT (id) DO UPDATE SET
         seller_id = EXCLUDED.seller_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price = EXCLUDED.price,
         category = EXCLUDED.category,
         state = EXCLUDED.state,
         images = EXCLUDED.images,
         status = EXCLUDED.status,
         version = EXCLUDED.version,
         stock = EXCLUDED.stock,
         total_stock = EXCLUDED.total_stock,
         available_stock = EXCLUDED.available_stock,
         reserved_stock = EXCLUDED.reserved_stock,
         sold = EXCLUDED.sold,
         sales_count = EXCLUDED.sales_count,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [
        id, sellerId, str(p.name), str(p.description), num(p.price, 0), str(p.category),
        str(p.state), jsonOr(Array.isArray(p.images) ? p.images : [], []),
        p.status && p.status !== 'undefined' ? String(p.status) : 'active', num(p.version, 0),
        intOrNull(p.stock), intOrNull(p.total_stock), intOrNull(p.available_stock),
        intOrNull(p.reserved_stock), intOrNull(p.sold), intOrNull(p.salesCount),
        JSON.stringify(metadata), toIso(p.createdAt), toIso(p.updatedAt),
      ]
    );
    bump(report.imported, 'products');

    // Inventory row. The SQLite store is the authority for live stock; these are the
    // same fields the JSON <-> SQLite sync used, so nothing is invented here.
    if (p.total_stock !== undefined || p.available_stock !== undefined || p.stock !== undefined) {
      const total = intOrNull(p.total_stock) ?? intOrNull(p.stock) ?? 0;
      const available = intOrNull(p.available_stock) ?? intOrNull(p.stock) ?? 0;
      const reserved = intOrNull(p.reserved_stock) ?? 0;
      const sold = intOrNull(p.sold) ?? 0;
      await client.query(
        `INSERT INTO inventory_stock (product_id, total_stock, available_stock, reserved_stock, sold, sales_count)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (product_id) DO UPDATE SET
           total_stock = EXCLUDED.total_stock,
           available_stock = EXCLUDED.available_stock,
           reserved_stock = EXCLUDED.reserved_stock,
           sold = EXCLUDED.sold,
           sales_count = EXCLUDED.sales_count,
           updated_at = now()`,
        [id, Math.max(0, total), Math.max(0, available), Math.max(0, reserved),
          Math.max(0, sold), intOrNull(p.salesCount) ?? 0]
      );
      bump(report.imported, 'inventory_stock');
    }
  }
  return knownProductIds;
}

// ---------------------------------------------------------------------------
// Import: orders (+ order_items)
// ---------------------------------------------------------------------------

async function importOrders(client, knownUserIds, knownProductIds) {
  const orders = readCollection('orders');
  // Catalog names by id: an order item snapshot is what the order history and
  // the invoice show, so fall back to the product's real name when the document
  // does not carry one - never to a placeholder (see src/db/order-item-name.js).
  const productNames = new Map(
    readCollection('products').map((p) => [String(p._id), p.name])
  );

  for (const o of orders) {
    if (!o._id) { fail('orders', o, 'missing _id'); continue; }

    const id = String(o._id);
    const rawUserId = o.userId || null;
    let userId = null;
    if (rawUserId) {
      if (knownUserIds.has(String(rawUserId))) userId = String(rawUserId);
      else warn(`orders/${id}: buyer ${rawUserId} not in users.json - user_id left NULL`);
    }

    const metadata = { ...(o.metadata && typeof o.metadata === 'object' ? o.metadata : {}) };
    for (const [key, value] of Object.entries(o)) {
      if (['_id', 'id', 'userId', 'items', 'shippingAddress', 'metadata'].includes(key)) continue;
      if (['trackingId', 'orderNumber', 'buyerName', 'buyerEmail', 'status', 'paymentMethod',
        'totalAmount', 'archived', 'shippedAt', 'deliveredAt', 'idempotency_key',
        'createdAt', 'updatedAt'].includes(key)) continue;
      metadata[key] = value;
    }
    if (rawUserId && !userId) metadata.legacy_user_id = String(rawUserId);

    await client.query(
      `INSERT INTO orders (
         id, user_id, tracking_id, order_number, buyer_name, buyer_email, status,
         payment_method, total_amount, shipping_address, archived, shipped_at,
         delivered_at, idempotency_key, metadata, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,$12,
         $13,$14,$15, COALESCE($16, now()), $17
       )
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         tracking_id = EXCLUDED.tracking_id,
         order_number = EXCLUDED.order_number,
         buyer_name = EXCLUDED.buyer_name,
         buyer_email = EXCLUDED.buyer_email,
         status = EXCLUDED.status,
         payment_method = EXCLUDED.payment_method,
         total_amount = EXCLUDED.total_amount,
         shipping_address = EXCLUDED.shipping_address,
         archived = EXCLUDED.archived,
         shipped_at = EXCLUDED.shipped_at,
         delivered_at = EXCLUDED.delivered_at,
         idempotency_key = EXCLUDED.idempotency_key,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [
        id, userId, o.trackingId ? String(o.trackingId) : null,
        o.orderNumber ? String(o.orderNumber) : null,
        str(o.buyerName), str(o.buyerEmail), str(o.status, 'pending'),
        str(o.paymentMethod, 'cod'), num(o.totalAmount, 0), jsonOr(o.shippingAddress, {}),
        !!o.archived, toIso(o.shippedAt), toIso(o.deliveredAt),
        o.idempotency_key ? String(o.idempotency_key) : null,
        JSON.stringify(metadata), toIso(o.createdAt), toIso(o.updatedAt),
      ]
    );
    bump(report.imported, 'orders');

    // Items are rebuilt for this order so re-running cannot duplicate them
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) {
      const productId = item.product && item.product._id ? String(item.product._id) : (item.productId ? String(item.productId) : null);
      const knownProduct = productId && knownProductIds.has(productId) ? productId : null;
      if (productId && !knownProduct) {
        warn(`orders/${id}: product ${productId} not in products.json - product_id left NULL`);
      }
      const sellerId = item.sellerId && knownUserIds.has(String(item.sellerId)) ? String(item.sellerId) : null;
      if (item.sellerId && !sellerId) {
        warn(`orders/${id}: seller ${item.sellerId} not in users.json - seller_id left NULL`);
      }
      if (!num(item.quantity, 0)) {
        fail('order_items', { _id: `${id}/${productId}` }, 'quantity must be >= 1');
        continue;
      }
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, seller_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          id, knownProduct,
          pickItemName(
            item.product && item.product.name,
            item.name,
            knownProduct ? productNames.get(knownProduct) : null
          ),
          Math.max(1, Math.trunc(num(item.quantity, 1))),
          num(item.price, 0), sellerId,
        ]
      );
      bump(report.rebuilt, 'order_items');
    }
  }
}

// ---------------------------------------------------------------------------
// Import: carts (+ cart_items)
// ---------------------------------------------------------------------------

async function importCarts(client, knownUserIds) {
  const carts = readCollection('carts');

  for (const c of carts) {
    const userId = c.userId ? String(c.userId) : null;
    if (!userId) { fail('carts', c, 'missing userId'); continue; }
    if (!knownUserIds.has(userId)) {
      // carts.user_id is a FK to users - a cart without its owner cannot exist
      fail('carts', c, `user ${userId} not in users.json (FK would be violated)`);
      continue;
    }

    await client.query(
      `INSERT INTO carts (user_id, version, total)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET
         version = EXCLUDED.version,
         total = EXCLUDED.total,
         updated_at = now()`,
      [userId, num(c.version, 1), num(c.total, 0)]
    );
    bump(report.imported, 'carts');

    await client.query('DELETE FROM cart_items WHERE cart_user_id = $1', [userId]);
    const items = Array.isArray(c.items) ? c.items : [];
    const seen = new Set();
    for (const item of items) {
      const productId = item.productId ? String(item.productId) : null;
      if (!productId) { fail('cart_items', { userId }, 'missing productId'); continue; }
      if (seen.has(productId)) {
        warn(`carts/${userId}: duplicate line for product ${productId} merged`);
        continue; // PK is (cart_user_id, product_id)
      }
      seen.add(productId);
      await client.query(
        `INSERT INTO cart_items (cart_user_id, product_id, quantity, added_at, snapshot)
         VALUES ($1,$2,$3, COALESCE($4, now()), $5)`,
        [
          userId, productId, Math.max(1, Math.trunc(num(item.quantity, 1))),
          toIso(item.addedAt), jsonOr(item.product, {}),
        ]
      );
      bump(report.rebuilt, 'cart_items');
    }
  }
}

// ---------------------------------------------------------------------------
// Import: messages / notifications / reservations
// ---------------------------------------------------------------------------

async function importMessages(client) {
  const messages = readCollection('messages');
  for (const m of messages) {
    if (!m._id) { fail('messages', m, 'missing _id'); continue; }
    if (!m.senderId || !m.receiverId) { fail('messages', m, 'missing senderId/receiverId'); continue; }
    await client.query(
      `INSERT INTO messages (id, sender_id, receiver_id, content, read, server_timestamp, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, now()))
       ON CONFLICT (id) DO UPDATE SET
         sender_id = EXCLUDED.sender_id,
         receiver_id = EXCLUDED.receiver_id,
         content = EXCLUDED.content,
         read = EXCLUDED.read,
         server_timestamp = EXCLUDED.server_timestamp,
         created_at = EXCLUDED.created_at`,
      [
        String(m._id), String(m.senderId), String(m.receiverId), str(m.content),
        !!m.read, intOrNull(m.serverTimestamp), toIso(m.timestamp),
      ]
    );
    bump(report.imported, 'messages');
  }
}

async function importNotifications(client) {
  const notifications = readCollection('notifications');
  for (const n of notifications) {
    if (!n._id) { fail('notifications', n, 'missing _id'); continue; }
    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, type, read, archived, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, now()))
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         title = EXCLUDED.title,
         message = EXCLUDED.message,
         type = EXCLUDED.type,
         read = EXCLUDED.read,
         archived = EXCLUDED.archived,
         metadata = EXCLUDED.metadata,
         created_at = EXCLUDED.created_at`,
      [
        String(n._id), n.userId ? String(n.userId) : null, str(n.title), str(n.message),
        str(n.type, 'info'), !!n.read, !!n.archived, jsonOr(n.metadata, {}), toIso(n.createdAt),
      ]
    );
    bump(report.imported, 'notifications');
  }
}

async function importReservations(client, knownProductIds) {
  const reservations = readCollection('reservations');
  for (const r of reservations) {
    const reservationId = r.reservation_id || r._id;
    if (!reservationId) { fail('reservations', r, 'missing reservation_id'); continue; }
    const productId = r.product_id ? String(r.product_id) : null;
    if (!productId) { fail('reservations', r, 'missing product_id'); continue; }
    if (!knownProductIds.has(productId)) {
      fail('reservations', r, `product ${productId} not in products.json (FK would be violated)`);
      continue;
    }
    if (!r.created_at || !r.expires_at) { fail('reservations', r, 'missing created_at/expires_at'); continue; }

    await client.query(
      `INSERT INTO reservations (
         reservation_id, product_id, quantity, user_id, status, created_at, expires_at, idempotency_key
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (reservation_id) DO UPDATE SET
         product_id = EXCLUDED.product_id,
         quantity = EXCLUDED.quantity,
         user_id = EXCLUDED.user_id,
         status = EXCLUDED.status,
         expires_at = EXCLUDED.expires_at,
         idempotency_key = EXCLUDED.idempotency_key`,
      [
        String(reservationId), productId, Math.max(1, Math.trunc(num(r.quantity, 1))),
        str(r.user_id), str(r.status, 'ACTIVE'), toIso(r.created_at), toIso(r.expires_at),
        r.idempotency_key ? String(r.idempotency_key) : null,
      ]
    );
    bump(report.imported, 'reservations');
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printReport() {
  const line = '-'.repeat(66);
  console.log(`\n${line}\nImport report${DRY_RUN ? ' (DRY RUN - nothing was written)' : ''}\n${line}`);

  const keys = new Set([...Object.keys(report.imported), ...Object.keys(report.rebuilt)]);
  if (keys.size === 0) {
    console.log('No records found to import.');
  }
  for (const key of [...keys].sort()) {
    const imported = report.imported[key] || 0;
    const rebuilt = report.rebuilt[key] || 0;
    const parts = [];
    if (imported) parts.push(`${imported} upserted`);
    if (rebuilt) parts.push(`${rebuilt} child rows rebuilt`);
    console.log(`  ${key.padEnd(18)} ${parts.join(', ')}`);
  }

  // Collections present on disk that are deliberately not imported
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (!file.endsWith('.json')) continue;
    const name = file.replace(/\.json$/, '');
    if (UNMAPPED_COLLECTIONS[name]) {
      report.unmapped.push(`${name}: ${UNMAPPED_COLLECTIONS[name]}`);
    }
  }
  if (report.unmapped.length) {
    console.log('\nNot imported (by design):');
    report.unmapped.forEach((u) => console.log(`  - ${u}`));
  }

  if (report.warnings.length) {
    console.log(`\nWarnings (${report.warnings.length}) - unresolved relationships:`);
    report.warnings.slice(0, 50).forEach((w) => console.log(`  ! ${w}`));
    if (report.warnings.length > 50) console.log(`  ... and ${report.warnings.length - 50} more`);
  }

  if (report.invalid.length) {
    console.log(`\nInvalid records (${report.invalid.length}) - NOT imported:`);
    report.invalid.slice(0, 50).forEach((i) =>
      console.log(`  x [${i.collection}] id=${i.id}: ${i.reason}`)
    );
    if (report.invalid.length > 50) console.log(`  ... and ${report.invalid.length - 50} more`);
    console.log('\nNothing was deleted or modified: fix the records above and re-run.');
  } else {
    console.log('\nNo invalid records.');
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set - nothing to import into.');
    process.exit(1);
  }

  console.log(`[import] source: ${DATA_DIR}`);
  if (!DRY_RUN) {
    const { applied } = await runMigrations();
    if (applied.length) console.log(`[import] applied migrations: ${applied.join(', ')}`);
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const knownUserIds = await importUsers(client);
    await importUserChildren(client, knownUserIds);
    await importOtps(client);
    const knownProductIds = await importProducts(client, knownUserIds);
    await importOrders(client, knownUserIds, knownProductIds);
    await importCarts(client, knownUserIds);
    await importMessages(client);
    await importNotifications(client);
    await importReservations(client, knownProductIds);

    if (DRY_RUN) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[import] failed, rolled back:', err.message);
    printReport();
    throw err;
  } finally {
    client.release();
  }

  printReport();

  // Post-import verification: which NOT VALID constraints the imported data satisfies
  if (!DRY_RUN) {
    await verifyConstraints();
  }

  if (STRICT && report.invalid.length > 0) {
    console.error('[import] --strict: exiting with code 1 because of invalid records');
    process.exit(1);
  }
}

/**
 * Old JSON data may predate a rule, so constraints are added NOT VALID (see
 * 003_constraints.sql). This reports which ones the imported data already
 * satisfies - those can be promoted with VALIDATE CONSTRAINT once an operator
 * confirms it.
 */
async function verifyConstraints() {
  const client = await getPool().connect();
  const checks = [
    ['users_role_check', "SELECT COUNT(*)::int AS n FROM users WHERE role NOT IN ('user','admin')"],
    ['users_failed_attempts_check', 'SELECT COUNT(*)::int AS n FROM users WHERE failed_attempts < 0'],
    ['products_price_check', 'SELECT COUNT(*)::int AS n FROM products WHERE price < 0'],
    ['products_version_check', 'SELECT COUNT(*)::int AS n FROM products WHERE version < 0'],
    ['inventory_stock_available_check', 'SELECT COUNT(*)::int AS n FROM inventory_stock WHERE available_stock < 0'],
    ['reservations_quantity_check', 'SELECT COUNT(*)::int AS n FROM reservations WHERE quantity <= 0'],
    ['orders_status_check', "SELECT COUNT(*)::int AS n FROM orders WHERE status NOT IN ('pending','processing','shipped','delivered','cancelled','completed')"],
    ['order_items_quantity_check', 'SELECT COUNT(*)::int AS n FROM order_items WHERE quantity <= 0'],
  ];

  try {
    const { rows: pending } = await client.query(
      'SELECT conname FROM pg_constraint WHERE convalidated = false'
    );
    const notValid = new Set(pending.map((r) => r.conname));
    if (notValid.size === 0) return;

    console.log('\nConstraint status (added NOT VALID - enforced for new rows only):');
    for (const [name, sql] of checks) {
      if (!notValid.has(name)) continue;
      const { rows: [count] } = await client.query(sql);
      console.log(
        `  ${name.padEnd(34)} ${count.n === 0 ? 'satisfied - may be VALIDATED' : `${count.n} offending row(s)`}`
      );
    }

    const dup = await client.query(
      'SELECT lower(email) AS email, COUNT(*)::int AS n FROM users GROUP BY lower(email) HAVING COUNT(*) > 1'
    );
    if (dup.rowCount > 0) {
      console.log('\nDuplicate emails (case-insensitive) - resolve before trusting the UNIQUE index:');
      dup.rows.forEach((r) => console.log(`  x ${r.email}: ${r.n} rows`));
    }
  } finally {
    client.release();
  }
}

main()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    try { await closePool(); } catch (e) { /* ignore */ }
    console.error('[import]', err.message);
    process.exit(1);
  });
