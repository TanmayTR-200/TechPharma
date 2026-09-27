'use strict';

// One-time (and safely repeatable) migration of live MongoDB Atlas data into
// PostgreSQL.
//
//   node scripts/migrate-mongo-to-postgres.js [--dry-run] [--only=products,orders]
//
// Why this exists
//   The application previously stored data in MongoDB Atlas. PostgreSQL is now
//   the source of truth, so the Atlas collections must be copied across or the
//   site serves empty pages. Unlike import-json-to-postgres.js (which reads
//   data/*.json), this reads the live database, so it is the accurate source.
//
// Properties, matching the JSON importer:
//   * original _id values are preserved
//   * timestamps are preserved
//   * parents are upserted, children rebuilt -> re-running is safe
//   * invalid records are REPORTED, never silently dropped
//   * DRY_RUN writes nothing
//   * MongoDB is never modified - it stays as a backup
//
// Env: MONGODB_URI (source) and DATABASE_URL (target, required).
//
// Notes
//   * documents whose id is a number (legacy seeded rows) are normalised to the
//     string form, because the PostgreSQL key columns are TEXT. A product with
//     id 1 becomes id '1' - the same value the API already used.
//   * users are imported BEFORE products, and products before orders, so the
//     foreign keys (products.seller_id, orders.user_id, order_items.product_id)
//     resolve. Rows whose parent is missing are reported, not silently dropped.

require('dotenv').config();

const { MongoClient } = require('mongodb');
const { getPool, closePool } = require('../src/db/postgres');
const { runMigrations } = require('../src/db/migrate');

const DRY_RUN = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim()) : null;

const report = {
  imported: {},
  invalid: [],
  warnings: [],
  skipped: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mongo _id (ObjectId/number/string) -> TEXT primary key. */
function toId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString(); // ObjectId -> hex string
  }
  return String(value);
}

function toDate(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback === undefined ? new Date() : fallback;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return fallback === undefined ? new Date() : fallback;
  }
  return d;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function invalid(collection, id, reason) {
  report.invalid.push({ collection, id, reason });
}

/** The id under which a document is stored, checking the usual spellings. */
function docId(doc) {
  return toId(doc._id !== undefined ? doc._id : doc.id);
}

/** Everything not mapped to a column goes to the metadata JSONB payload. */
function collectMeta(doc, consumed) {
  const meta = {};
  for (const key of Object.keys(doc)) {
    if (!consumed.has(key) && doc[key] !== undefined) meta[key] = doc[key];
  }
  return meta;
}

// ---------------------------------------------------------------------------
// Per-collection mappers. Each returns an object ready for its upsert.
// ---------------------------------------------------------------------------

const USER_COLUMNS = new Set([
  '_id', 'id', 'email', 'password', 'name', 'role', 'phone', 'state', 'company',
  'createdAt', 'updatedAt', 'failedAttempts',
]);

function mapUser(doc) {
  const id = docId(doc);
  if (!id) return null;
  if (!doc.email) {
    invalid('users', id, 'missing email (required)');
    return null;
  }
  // Password hashes carry over verbatim: re-hashing would invalidate every
  // existing login. Seed rows without a hash get a locked random value so the
  // row still satisfies NOT NULL and cannot be logged into.
  const password = typeof doc.password === 'string' && doc.password.length > 0
    ? doc.password
    : '!unusable-' + id;

  // The users table has no metadata column, so unmapped fields cannot be
  // stored. They are reported once per field name so the loss is visible
  // rather than silent.
  const extra = Object.keys(doc).filter(
    (k) => !USER_COLUMNS.has(k) && doc[k] !== undefined);
  for (const key of extra) {
    const note = 'users.' + key + ' has no column - not migrated';
    if (report.warnings.indexOf(note) === -1) report.warnings.push(note);
  }

  return {
    id: id,
    params: [
      String(doc.email).toLowerCase(),
      password,
      doc.name || String(doc.email).split('@')[0],
      doc.role === 'admin' ? 'admin' : 'user',
      doc.phone || '',
      doc.state || '',
      JSON.stringify(doc.company && typeof doc.company === 'object' ? doc.company : {}),
      toDate(doc.createdAt),
      toDate(doc.updatedAt, null),
      num(doc.failedAttempts, 0),
    ],
  };
}

const PRODUCT_COLUMNS = new Set([
  '_id', 'id', 'userId', 'supplierId', 'seller_id', 'createdAt', 'updatedAt',
  'name', 'description', 'price', 'category', 'state', 'images', 'status',
  'version', 'stock', 'total_stock', 'available_stock', 'reserved_stock',
  'sold', 'salesCount',
]);

function mapProduct(doc) {
  const id = docId(doc);
  if (!id) return null;
  if (!doc.name) {
    invalid('products', id, 'missing name (required)');
    return null;
  }
  const seller = doc.userId !== undefined ? doc.userId
    : (doc.supplierId !== undefined ? doc.supplierId : doc.seller_id);

  return {
    id: id,
    // seller_id has a FK to users; handled by the caller, which knows the
    // imported user ids.
    params: [
      toId(seller === undefined ? null : seller),
      doc.name,
      doc.description || '',
      num(doc.price, 0),
      doc.category || '',
      doc.state || '',
      JSON.stringify(Array.isArray(doc.images) ? doc.images : []),
      doc.status || 'active',
      num(doc.version, 0),
      doc.stock === undefined ? null : doc.stock,
      doc.total_stock === undefined ? null : doc.total_stock,
      doc.available_stock === undefined ? null : doc.available_stock,
      doc.reserved_stock === undefined ? null : doc.reserved_stock,
      doc.sold === undefined ? null : doc.sold,
      doc.salesCount === undefined ? null : doc.salesCount,
      toDate(doc.createdAt),
      toDate(doc.updatedAt, null),
      collectMeta(doc, PRODUCT_COLUMNS),
    ],
  };
}

const ORDER_COLUMNS = new Set([
  '_id', 'id', 'userId', 'items', 'orderNumber', 'order_number', 'totalAmount',
  'total_amount', 'trackingId', 'tracking_id', 'status', 'paymentMethod',
  'payment_method', 'buyerName', 'buyer_name', 'buyerEmail', 'buyer_email',
  'archived', 'shippedAt', 'shipped_at', 'deliveredAt', 'delivered_at',
  'shippingAddress', 'shipping_address', 'createdAt', 'updatedAt',
]);

function mapOrder(doc) {
  const id = docId(doc);
  if (!id) return null;
  const first = (a, b) => (doc[a] !== undefined ? doc[a] : doc[b]);

  return {
    id: id,
    buyer: toId(doc.userId === undefined ? null : doc.userId),
    items: Array.isArray(doc.items) ? doc.items : [],
    params: [
      toId(first('trackingId', 'tracking_id') || null),
      first('orderNumber', 'order_number') || null,
      first('buyerName', 'buyer_name') || '',
      first('buyerEmail', 'buyer_email') || '',
      doc.status || 'pending',
      first('paymentMethod', 'payment_method') || 'cod',
      num(first('totalAmount', 'total_amount'), 0),
      JSON.stringify(first('shippingAddress', 'shipping_address') || {}),
      Boolean(doc.archived),
      toDate(first('shippedAt', 'shipped_at') || null, null),
      toDate(first('deliveredAt', 'delivered_at') || null, null),
      toDate(doc.createdAt),
      toDate(doc.updatedAt, null),
      collectMeta(doc, ORDER_COLUMNS),
    ],
  };
}

function mapMessage(doc) {
  const id = docId(doc);
  if (!id) return null;
  return {
    id: id,
    params: [
      toId(doc.senderId === undefined ? null : doc.senderId),
      toId(doc.receiverId === undefined ? null : doc.receiverId),
      doc.content || doc.message || '',
      Boolean(doc.read),
      // server_timestamp is BIGINT. Mongo may hold a Date (legacy) or a real
      // epoch-ms number; only a finite number can go in, otherwise NULL.
      (function () {
        const raw = doc.serverTimestamp !== undefined ? doc.serverTimestamp : null;
        if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
        if (raw && typeof raw === 'object' && typeof raw.getTime === 'function') {
          return raw.getTime(); // Date -> epoch ms
        }
        const d = toDate(doc.timestamp || doc.createdAt, null);
        return d ? d.getTime() : null;
      })(),
      toDate(doc.timestamp || doc.createdAt),
    ],
  };
}

function mapNotification(doc) {
  const id = docId(doc);
  if (!id) return null;
  return {
    id: id,
    params: [
      toId(doc.userId === undefined ? null : doc.userId),
      doc.title || '',
      doc.message || '',
      doc.type || 'info',
      Boolean(doc.read),
      Boolean(doc.archived),
      JSON.stringify(doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : {}),
      toDate(doc.timestamp || doc.createdAt),
    ],
  };
}

function mapReservation(doc) {
  const raw = doc._id !== undefined ? doc._id
    : (doc.reservationId !== undefined ? doc.reservationId : doc.reservation_id);
  const id = toId(raw);
  if (!id) return null;
  const productId = toId(doc.productId === undefined ? null : doc.productId);
  if (!productId) {
    invalid('reservations', id, 'missing productId (required)');
    return null;
  }
  return {
    id: id,
    productId: productId,
    params: [
      id,
      productId,
      num(doc.quantity, 1),
      toId(doc.userId === undefined ? null : doc.userId) || '',
      doc.status || 'ACTIVE',
      toDate(doc.createdAt),
      toDate(doc.expiresAt),
      doc.idempotencyKey || null,
    ],
  };
}


// ---------------------------------------------------------------------------
// Upserts. Every statement is idempotent so the script can be re-run.
// ---------------------------------------------------------------------------

const SQL = {};

// NOTE: the users table has NO metadata column (it carries fixed auth columns
// instead: password_changed_at, locked_until, last_failed_at, reset_token...).
// Unmapped user fields therefore cannot be stored as JSONB and are reported as
// warnings rather than silently discarded.
SQL.users = [
  'INSERT INTO users (id, email, password, name, role, phone, state,',
  '  company, created_at, updated_at, failed_attempts)',
  'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
  'ON CONFLICT (id) DO UPDATE SET',
  '  email = EXCLUDED.email, password = EXCLUDED.password,',
  '  name = EXCLUDED.name, role = EXCLUDED.role, phone = EXCLUDED.phone,',
  '  state = EXCLUDED.state, company = EXCLUDED.company,',
  '  created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at,',
  '  failed_attempts = EXCLUDED.failed_attempts',
].join(' ');

SQL.products = [
  'INSERT INTO products (id, seller_id, name, description, price, category,',
  '  state, images, status, version, stock, total_stock, available_stock,',
  '  reserved_stock, sold, sales_count, created_at, updated_at, metadata)',
  'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)',
  'ON CONFLICT (id) DO UPDATE SET',
  '  seller_id = EXCLUDED.seller_id, name = EXCLUDED.name,',
  '  description = EXCLUDED.description, price = EXCLUDED.price,',
  '  category = EXCLUDED.category, state = EXCLUDED.state,',
  '  images = EXCLUDED.images, status = EXCLUDED.status,',
  '  version = EXCLUDED.version, stock = EXCLUDED.stock,',
  '  total_stock = EXCLUDED.total_stock,',
  '  available_stock = EXCLUDED.available_stock,',
  '  reserved_stock = EXCLUDED.reserved_stock, sold = EXCLUDED.sold,',
  '  sales_count = EXCLUDED.sales_count, created_at = EXCLUDED.created_at,',
  '  updated_at = EXCLUDED.updated_at, metadata = EXCLUDED.metadata',
].join(' ');

SQL.orders = [
  'INSERT INTO orders (id, user_id, tracking_id, order_number, buyer_name,',
  '  buyer_email, status, payment_method, total_amount, shipping_address,',
  '  archived, shipped_at, delivered_at, created_at, updated_at, metadata)',
  'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
  'ON CONFLICT (id) DO UPDATE SET',
  '  user_id = EXCLUDED.user_id, tracking_id = EXCLUDED.tracking_id,',
  '  order_number = EXCLUDED.order_number, buyer_name = EXCLUDED.buyer_name,',
  '  buyer_email = EXCLUDED.buyer_email, status = EXCLUDED.status,',
  '  payment_method = EXCLUDED.payment_method,',
  '  total_amount = EXCLUDED.total_amount,',
  '  shipping_address = EXCLUDED.shipping_address,',
  '  archived = EXCLUDED.archived, shipped_at = EXCLUDED.shipped_at,',
  '  delivered_at = EXCLUDED.delivered_at, created_at = EXCLUDED.created_at,',
  '  updated_at = EXCLUDED.updated_at, metadata = EXCLUDED.metadata',
].join(' ');

// order_items.id is BIGSERIAL, so children are deleted and rebuilt per parent.
SQL.order_items = [
  'INSERT INTO order_items (order_id, product_id, product_name, quantity,',
  '  price, seller_id) VALUES ($1,$2,$3,$4,$5,$6)',
].join(' ');

// carts is keyed by user_id, NOT by a document id.
SQL.carts = [
  'INSERT INTO carts (user_id, version, total, updated_at)',
  'VALUES ($1,$2,$3,$4)',
  'ON CONFLICT (user_id) DO UPDATE SET',
  '  version = EXCLUDED.version, total = EXCLUDED.total,',
  '  updated_at = EXCLUDED.updated_at',
].join(' ');

// cart_items is keyed by (cart_user_id, product_id); the add-time price lives
// inside the snapshot, there is no price column.
SQL.cart_items = [
  'INSERT INTO cart_items (cart_user_id, product_id, quantity, snapshot)',
  'VALUES ($1,$2,$3,$4)',
].join(' ');

// messages: the read flag is `read`, and there is no metadata column.
SQL.messages = [
  'INSERT INTO messages (id, sender_id, receiver_id, content, read,',
  '  server_timestamp, created_at)',
  'VALUES ($1,$2,$3,$4,$5,$6,$7)',
  'ON CONFLICT (id) DO UPDATE SET',
  '  content = EXCLUDED.content, read = EXCLUDED.read,',
  '  created_at = EXCLUDED.created_at',
].join(' ');

// notifications: the read flag is `read`.
SQL.notifications = [
  'INSERT INTO notifications (id, user_id, title, message, type, read,',
  '  archived, metadata, created_at)',
  'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
  'ON CONFLICT (id) DO UPDATE SET',
  '  title = EXCLUDED.title, message = EXCLUDED.message, type = EXCLUDED.type,',
  '  read = EXCLUDED.read, archived = EXCLUDED.archived,',
  '  metadata = EXCLUDED.metadata, created_at = EXCLUDED.created_at',
].join(' ');

SQL.reservations = [
  'INSERT INTO reservations (reservation_id, product_id, quantity, user_id,',
  '  status, created_at, expires_at, idempotency_key)',
  'VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
  'ON CONFLICT (reservation_id) DO UPDATE SET',
  '  quantity = EXCLUDED.quantity, status = EXCLUDED.status,',
  '  expires_at = EXCLUDED.expires_at',
].join(' ');

// ---------------------------------------------------------------------------
// Import steps
// ---------------------------------------------------------------------------

async function importUsers(client, src) {
  const docs = await src.users.find({}).toArray();
  let n = 0;
  for (const doc of docs) {
    const m = mapUser(doc);
    if (!m) continue;
    if (!DRY_RUN) await client.query(SQL.users, m.params);
    n++;
  }
  report.imported.users = n;
}

async function importProducts(client, src, userIds) {
  const docs = await src.products.find({}).toArray();
  let n = 0;
  for (const doc of docs) {
    const m = mapProduct(doc);
    if (!m) continue;

    // seller_id is a FK: only set it when that user is present, otherwise
    // report it and store NULL (the column is nullable, ON DELETE SET NULL).
    if (m.params[0] && !userIds.has(m.params[0])) {
      report.skipped.push({
        collection: 'products',
        id: m.id,
        reason: 'seller ' + m.params[0] + ' not in MongoDB - seller_id set to NULL',
      });
      m.params[0] = null;
    }

    if (!DRY_RUN) {
      await client.query(SQL.products, m.params);
      // Mirror stock into inventory_stock, the checkout authority. Written so
      // available + reserved = total, which inventory_stock_available_check
      // requires.
      const total = num(m.params[10] !== null ? m.params[10] : m.params[9], 0);
      const reserved = num(m.params[12], 0);
      await client.query(SQL.inventory_stock, [
        m.id,
        total,
        Math.max(total - reserved, 0),
        reserved,
        num(m.params[13], 0),
        num(m.params[14], 0),
      ]);
    }
    n++;
  }
  report.imported.products = n;
}

async function importOrders(client, src, userIds, productIds) {
  const docs = await src.orders.find({}).toArray();
  let n = 0;
  let items = 0;

  for (const doc of docs) {
    const m = mapOrder(doc);
    if (!m) continue;

    // orders.user_id is a FK: a missing buyer becomes NULL so the order is
    // still kept for accounting, and the loss of the link is reported.
    let buyer = m.buyer;
    if (buyer && !userIds.has(buyer)) {
      report.skipped.push({
        collection: 'orders',
        id: m.id,
        reason: 'buyer ' + buyer + ' not in MongoDB - user_id set to NULL',
      });
      buyer = null;
    }

    if (!DRY_RUN) {
      await client.query('DELETE FROM order_items WHERE order_id = $1', [m.id]);
      await client.query(SQL.orders, [m.id, buyer].concat(m.params));

      for (const item of m.items) {
        const productId = toId(item.productId === undefined
          ? (item._id === undefined ? null : item._id)
          : item.productId);
        // product_id is a FK: a missing product leaves the line intact with
        // NULL, because order history keeps the captured name and price.
        let link = productId;
        if (productId && !productIds.has(productId)) {
          report.skipped.push({
            collection: 'order_items',
            id: m.id + '/' + productId,
            reason: 'product ' + productId + ' missing - product_id set to NULL',
          });
          link = null;
        }
        await client.query(SQL.order_items, [
          m.id,
          link,
          item.name || item.productName || '',
          num(item.quantity, 1),
          num(item.price, 0),
          toId(item.sellerId === undefined ? null : item.sellerId),
        ]);
        items++;
      }
    } else {
      items += m.items.length;
    }
    n++;
  }
  report.imported.orders = n;
  report.imported.order_items = items;
}

async function importCarts(client, src, userIds) {
  const docs = await src.carts.find({}).toArray();
  let n = 0;
  let items = 0;

  for (const doc of docs) {
    const userId = toId(doc.userId === undefined
      ? (doc._id === undefined ? null : doc._id)
      : doc.userId);
    if (!userId) {
      invalid('carts', String(doc._id), 'missing userId (required)');
      continue;
    }
    // carts.user_id is a FK: skip carts whose owner is not being migrated.
    if (!userIds.has(userId)) {
      report.skipped.push({
        collection: 'carts',
        id: userId,
        reason: 'owner not in MongoDB - cart skipped (carts.user_id is a FK)',
      });
      continue;
    }

    const list = Array.isArray(doc.items) ? doc.items : [];
    const total = list.reduce(
      (sum, it) => sum + num(it.price, 0) * num(it.quantity, 1), 0);

    if (!DRY_RUN) {
      await client.query(SQL.carts, [userId, num(doc.version, 1), total, toDate(doc.updatedAt)]);
      await client.query('DELETE FROM cart_items WHERE cart_user_id = $1', [userId]);
      for (const it of list) {
        const productId = toId(it.productId === undefined
          ? (it._id === undefined ? null : it._id)
          : it.productId);
        if (!productId) continue;
        await client.query(SQL.cart_items, [
          userId,
          productId,
          num(it.quantity, 1),
          JSON.stringify(it.product && typeof it.product === 'object' ? it.product : it),
        ]);
        items++;
      }
    } else {
      items += list.length;
    }
    n++;
  }
  report.imported.carts = n;
  report.imported.cart_items = items;
}

async function importMessages(client, src) {
  const docs = await src.messages.find({}).toArray();
  let n = 0;
  for (const doc of docs) {
    const m = mapMessage(doc);
    if (!m) continue;
    // messages has no FK to users (conversations outlive account deletion),
    // but sender/receiver are NOT NULL, so they are required.
    if (!m.params[0] || !m.params[1]) {
      invalid('messages', m.id, 'missing senderId/receiverId (required)');
      continue;
    }
    if (!DRY_RUN) await client.query(SQL.messages, m.params);
    n++;
  }
  report.imported.messages = n;
}

async function importNotifications(client, src) {
  const docs = await src.notifications.find({}).toArray();
  let n = 0;
  for (const doc of docs) {
    const m = mapNotification(doc);
    if (!m) continue;
    // user_id is nullable: NULL means platform-wide, which is preserved.
    if (!DRY_RUN) await client.query(SQL.notifications, m.params);
    n++;
  }
  report.imported.notifications = n;
}

async function importReservations(client, src, productIds) {
  const docs = await src.reservations.find({}).toArray();
  let n = 0;
  for (const doc of docs) {
    const m = mapReservation(doc);
    if (!m) continue;
    // product_id is a FK: a reservation without its product is meaningless.
    if (!productIds.has(m.productId)) {
      report.skipped.push({
        collection: 'reservations',
        id: m.id,
        reason: 'product ' + m.productId + ' missing - skipped (product_id is a FK)',
      });
      continue;
    }
    if (!DRY_RUN) await client.query(SQL.reservations, m.params);
    n++;
  }
  report.imported.reservations = n;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function printReport() {
  const bar = '-'.repeat(70);
  console.log('\n' + bar);
  console.log(DRY_RUN
    ? 'Migration report (DRY RUN - nothing was written)'
    : 'Migration report');
  console.log(bar);

  const entries = Object.keys(report.imported)
    .filter((k) => report.imported[k] > 0)
    .map((k) => [k, report.imported[k]]);
  if (entries.length) {
    for (const entry of entries) {
      console.log('  ' + entry[0].padEnd(18) + entry[1] + ' upserted');
    }
  } else {
    console.log('  (no documents found in MongoDB)');
  }

  if (report.skipped.length) {
    console.log('\nSkipped / adjusted (foreign keys):');
    for (const s of report.skipped) {
      console.log('  ' + s.collection + '/' + s.id + ': ' + s.reason);
    }
  }
  if (report.invalid.length) {
    console.log('\nInvalid records (NOT written):');
    for (const i of report.invalid) {
      console.log('  ' + i.collection + '/' + i.id + ': ' + i.reason);
    }
  }
  if (report.warnings.length) {
    console.log('\nWarnings:');
    for (const w of report.warnings) console.log('  ' + w);
  }
  if (!report.skipped.length && !report.invalid.length) {
    console.log('\nNo skipped or invalid records.');
  }
  console.log(bar + '\n');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set - nothing to migrate into.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set - nothing to migrate from.');
    process.exit(1);
  }

  const mongo = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
    tlsAllowInvalidCertificates: true,
  });
  let pool = null;
  let client = null;

  try {
    console.log('[migrate] connecting to MongoDB Atlas...');
    await mongo.connect();
    // MONGODB_DATABASE overrides the database named in the URI. Atlas projects
    // frequently keep the application data in a database other than the one in
    // the connection string (this project uses `test`), and reading the wrong
    // one silently migrates nothing.
    const src = process.env.MONGODB_DATABASE
      ? mongo.db(process.env.MONGODB_DATABASE)
      : mongo.db();
    console.log('[migrate] source database: ' + src.databaseName);

    // Fail loudly rather than importing zero documents: an empty source is
    // almost always a wrong database name, and a silent no-op is worse than
    // an error because it looks like success.
    const probe = await src.listCollections({}, { nameOnly: true }).toArray();
    if (probe.length === 0) {
      const known = await mongo.db('admin').command({ listDatabases: 1 })
        .then((r) => r.databases.map((d) => d.name))
        .catch(() => []);
      console.error('[migrate] database "' + src.databaseName + '" has no collections.');
      if (known.length) {
        console.error('[migrate] databases on this cluster: ' + known.join(', '));
        console.error('[migrate] set MONGODB_DATABASE=<name> to pick one.');
      }
      process.exitCode = 1;
      return;
    }

    // One transaction for the whole run: a partial import cannot happen.
    pool = getPool();
    client = await pool.connect();
    await client.query('BEGIN');

    const applied = await runMigrations({ silent: true });
    if (applied.applied && applied.applied.length) {
      console.log('[migrate] applied migrations: ' + applied.applied.join(', '));
    }

    // Ids present in the source, so foreign keys can be resolved.
    const userDocs = await src.users.find({}, { projection: { _id: 1 } }).toArray();
    const productDocs = await src.products.find({}, { projection: { _id: 1 } }).toArray();
    const userIds = new Set(userDocs.map((d) => toId(d._id)));
    const productIds = new Set(productDocs.map((d) => toId(d._id)));
    console.log('[migrate] source has ' + userIds.size + ' user(s), '
      + productIds.size + ' product(s)');

    const wanted = (name) => !ONLY || ONLY.indexOf(name) !== -1;

    // Parents first: users -> products -> everything else.
    if (wanted('users')) await importUsers(client, src);
    if (wanted('products')) await importProducts(client, src, userIds);
    if (wanted('orders')) await importOrders(client, src, userIds, productIds);
    if (wanted('carts')) await importCarts(client, src, userIds);
    if (wanted('messages')) await importMessages(client, src);
    if (wanted('notifications')) await importNotifications(client, src);
    if (wanted('reservations')) await importReservations(client, src, productIds);

    if (DRY_RUN) {
      await client.query('ROLLBACK');
      console.log('[migrate] dry run - transaction rolled back');
    } else {
      await client.query('COMMIT');
      console.log('[migrate] committed');
    }

    printReport();
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[migrate] rolled back - nothing was written');
    }
    console.error('[migrate] FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    if (pool) await closePool().catch(() => {});
    await mongo.close().catch(() => {});
  }
}

main();
