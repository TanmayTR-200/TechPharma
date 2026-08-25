// SQLite ACID storage layer for inventory operations.
// Replaces the in-process mutex + JSON file approach with database-level
// transactions and CHECK constraints for true cross-process safety.
//
// Why SQLite: free, zero-infra, real ACID transactions, WAL mode for
// concurrent readers + single writer, cross-process file locking.
// Mongo Atlas free tier has no multi-document transactions.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

const PRODUCTS_FILE = path.join(__dirname, '../../data/products.json');

function getDb() {
  if (db) return db;

  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/techpharma.db');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);
  // WAL: concurrent readers don't block the writer, survives crashes
  db.pragma('journal_mode = WAL');
  // FULL: every transaction is durably flushed before commit returns
  db.pragma('synchronous = FULL');
  // Wait up to 5s for locks held by other processes before SQLITE_BUSY
  db.pragma('busy_timeout = 5000');

  initSchema(db);
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory_stock (
      product_id      TEXT PRIMARY KEY,
      total_stock     INTEGER NOT NULL DEFAULT 0,
      available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
      reserved_stock  INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
      sold            INTEGER NOT NULL DEFAULT 0,
      sales_count     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reservations (
      reservation_id   TEXT PRIMARY KEY,
      product_id       TEXT NOT NULL,
      quantity         INTEGER NOT NULL,
      user_id          TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','CONFIRMED','CANCELLED','EXPIRED')),
      created_at       TEXT NOT NULL,
      expires_at       TEXT NOT NULL,
      idempotency_key  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_res_product ON reservations(product_id);
    CREATE INDEX IF NOT EXISTS idx_res_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_res_expires ON reservations(expires_at) WHERE status = 'ACTIVE';
    -- Partial unique index: only one ACTIVE/CONFIRMED reservation per idempotency key.
    -- Expired/cancelled keys can be reused for a fresh reservation.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_res_idem_active
      ON reservations(idempotency_key)
      WHERE status IN ('ACTIVE','CONFIRMED') AND idempotency_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS orders (
      _id              TEXT PRIMARY KEY,
      doc              TEXT NOT NULL,
      idempotency_key  TEXT,
      created_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_idem ON orders(idempotency_key);
  `);
}

// Sync a single product's stock from SQLite back to the JSON cache + products.json
// so existing read paths (readJsonFile / global.dataCache) see updated values.
function syncProductToCache(productId) {
  const database = getDb();
  const stock = database.prepare('SELECT * FROM inventory_stock WHERE product_id = ?').get(productId);
  if (!stock) return;

  if (global.dataCache && Array.isArray(global.dataCache.products)) {
    const product = global.dataCache.products.find(p => p._id === productId);
    if (product) {
      product.total_stock = stock.total_stock;
      product.available_stock = stock.available_stock;
      product.reserved_stock = stock.reserved_stock;
      product.sold = stock.sold;
      product.salesCount = stock.sales_count;
      product.stock = stock.available_stock; // legacy field

      try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(global.dataCache.products, null, 2));
      } catch (err) {
        console.error('[store] products.json sync failed:', err.message);
      }
    }
  }
}

// Sync ALL products from SQLite to JSON cache + products.json
function syncAllProductsToCache() {
  const database = getDb();
  const stocks = database.prepare('SELECT * FROM inventory_stock').all();
  const stockMap = new Map(stocks.map(s => [s.product_id, s]));

  if (global.dataCache && Array.isArray(global.dataCache.products)) {
    let changed = false;
    global.dataCache.products.forEach(p => {
      const stock = stockMap.get(p._id);
      if (stock) {
        p.total_stock = stock.total_stock;
        p.available_stock = stock.available_stock;
        p.reserved_stock = stock.reserved_stock;
        p.sold = stock.sold;
        p.salesCount = stock.sales_count;
        p.stock = stock.available_stock;
        changed = true;
      }
    });

    if (changed) {
      try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(global.dataCache.products, null, 2));
      } catch (err) {
        console.error('[store] products.json sync failed:', err.message);
      }
    }
  }
}

// Upsert product stock — called when a product is created or stock is edited.
// Preserves reserved_stock: available = total - reserved.
function upsertProduct(productId, stock) {
  const database = getDb();
  database.prepare(`
    INSERT INTO inventory_stock (product_id, total_stock, available_stock, reserved_stock, sold, sales_count)
    VALUES (?, ?, ?, 0, 0, 0)
    ON CONFLICT(product_id) DO UPDATE SET
      total_stock = excluded.total_stock,
      available_stock = excluded.total_stock - reserved_stock
  `).run(productId, stock, stock);
  syncProductToCache(productId);
}

function deleteProduct(productId) {
  const database = getDb();
  database.prepare('DELETE FROM inventory_stock WHERE product_id = ?').run(productId);
}

// Clear all tables — for testing only
function resetForTesting() {
  const database = getDb();
  database.prepare('DELETE FROM inventory_stock').run();
  database.prepare('DELETE FROM reservations').run();
  database.prepare('DELETE FROM orders').run();
}

module.exports = {
  getDb,
  initSchema,
  syncProductToCache,
  syncAllProductsToCache,
  upsertProduct,
  deleteProduct,
  resetForTesting,
  PRODUCTS_FILE,
};
