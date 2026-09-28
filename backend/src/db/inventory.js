'use strict';

// Inventory repository - owns `inventory_stock` + `reservations` in PostgreSQL
// and the SQLite store in src/inventory/* while PostgreSQL is not configured.
//
// Public API mirrors the old src/inventory/reservation.js exactly:
//   migrateProducts, reserve, confirm, cancel, releaseExpired,
//   getProductInventory, startExpirationJob, createOrder, upsertProduct,
//   ensureProductSeeded, setMongoStockSyncer, deleteProduct, resetForTesting,
//   syncProductToCache, syncAllProductsToCache
//
// PostgreSQL semantics (same invariants as the SQLite layer):
//   * single-flight in-process mutex so concurrent callers queue
//   * conditional UPDATEs for reserve/confirm/cancel/expire/checkout so a lost
//     race fails safely instead of overselling
//   * idempotency keys unique among ACTIVE/CONFIRMED reservations
//     (partial unique index reservations_idem_active_key)
//   * after every stock mutation the denormalised mirror on products
//     (products.stock/total_stock/...) is refreshed via products.updateStockMirror
//     and the legacy syncs run so not-yet-migrated readers keep working.

const db = require('./postgres');
const products = require('./products');
const { pickItemName } = require('./order-item-name');

const sqlite = require('../inventory/reservation');

function usePg() {
  return db.isEnabled();
}

// --- In-process mutex (serialises concurrent PG callers) -------------------

let locked = false;
const waiters = [];

function acquire() {
  if (!locked) {
    locked = true;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

function release() {
  const next = waiters.shift();
  if (next) next();
  else locked = false;
}

async function withPgLock(fn) {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

// --- Shared helpers --------------------------------------------------------

const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

function genReservationId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 10);
}

function toIso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToStock(row) {
  if (!row) return null;
  return {
    product_id: row.product_id,
    total_stock: row.total_stock,
    available_stock: row.available_stock,
    reserved_stock: row.reserved_stock,
    sold: row.sold,
    sales_count: row.sales_count,
  };
}

function rowToReservation(row) {
  if (!row) return null;
  return {
    reservation_id: row.reservation_id,
    product_id: row.product_id,
    quantity: row.quantity,
    user_id: row.user_id,
    status: row.status,
    created_at: toIso(row.created_at),
    expires_at: toIso(row.expires_at),
    idempotency_key: row.idempotency_key || null,
  };
}

function toLegacyInventory(meta, stock) {
  return {
    product_id: String(meta.id),
    name: meta.name || '',
    total_stock: stock.total_stock,
    available_stock: stock.available_stock,
    reserved_stock: stock.reserved_stock,
    sold: stock.sold,
  };
}

function err(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}


// --- Internal PG primitives (run inside withPgLock) -------------------------

async function fetchStock(productId) {
  return db.queryOne('SELECT * FROM inventory_stock WHERE product_id = $1', [String(productId)]);
}

async function fetchProductMeta(productId) {
  return db.queryOne('SELECT id, name, status FROM products WHERE id = $1', [String(productId)]);
}

// Mirror one stock row into products.* + legacy cache + Mongo hook.
// Same fan-out the SQLite layer does via syncProductToCache/pushStockToMongo.
async function syncStock(productId) {
  const row = await fetchStock(productId);
  if (!row) return null;
  const stock = rowToStock(row);
  try {
    await products.updateStockMirror(productId, {
      stock: stock.available_stock,
      total_stock: stock.total_stock,
      available_stock: stock.available_stock,
      reserved_stock: stock.reserved_stock,
      sold: stock.sold,
      sales_count: stock.sales_count,
    });
  } catch (e) {
    console.error('[db:inventory] products mirror failed:', e.message);
  }
  // NOTE: deliberately does NOT call sqlite.syncProductToCache() here. In
  // PostgreSQL mode any SQLite row is stale history from the JSON days -
  // syncing from it would clobber the cache/products.json/Mongo hook that
  // mirrorAll() (invoked by updateStockMirror above) just refreshed from the
  // authoritative PostgreSQL row. The setMongoStockSyncer hook is likewise
  // driven only by the SQLite layer in JSON mode; in PG mode Mongo stays in
  // sync via the products delta write inside writeJsonFile.
  return stock;
}

// Expire overdue ACTIVE reservations and restore their stock atomically.
// Callers hold withPgLock; the transaction also protects multi-process callers.
async function expireOverdue() {
  const result = await db.transaction(async (tx) => {
    const { rows } = await tx.query(
      `UPDATE reservations SET status = 'EXPIRED'
        WHERE status = 'ACTIVE' AND expires_at < now()
        RETURNING reservation_id, product_id, quantity`
    );
    if (rows.length === 0) return { count: 0, productIds: [] };

    const byProduct = new Map();
    for (const r of rows) {
      byProduct.set(r.product_id, (byProduct.get(r.product_id) || 0) + Number(r.quantity));
    }
    for (const [pid, qty] of byProduct) {
      await tx.query(
        `UPDATE inventory_stock
            SET available_stock = available_stock + $2,
                reserved_stock   = GREATEST(0, reserved_stock - $2),
                updated_at = now()
          WHERE product_id = $1`,
        [pid, qty]
      );
    }
    return { count: rows.length, productIds: [...byProduct.keys()] };
  });

  // Mirrors must run only after commit, matching the SQLite store's cache sync.
  for (const pid of result.productIds) {
    await syncStock(pid); // eslint-disable-line no-await-in-loop
  }
  return result.count;
}

// --- Reads -----------------------------------------------------------------

function getProductInventory(productId) {
  if (!usePg()) return sqlite.getProductInventory(productId);
  throw err(500, 'getProductInventory: use getProductInventoryAsync when PostgreSQL is enabled');
}

// Total ACTIVE reservation quantity per product: Map<String(productId), qty>.
// Reservations live in SQLite/PostgreSQL - never in the old reservations.json
// file (which stopped being written when the store moved to SQLite). Powers
// /api/debug/fix-stock's reserved-stock recomputation.
async function getActiveReservationTotals() {
  if (!usePg()) {
    const rows = require('../inventory/store')
      .getDb()
      .prepare(`SELECT product_id, SUM(quantity) AS qty
                  FROM reservations
                 WHERE status = 'ACTIVE'
                 GROUP BY product_id`)
      .all();
    return new Map(rows.map((r) => [String(r.product_id), Number(r.qty) || 0]));
  }
  const { rows } = await db.query(
    `SELECT product_id, SUM(quantity)::int AS qty
       FROM reservations
      WHERE status = 'ACTIVE'
      GROUP BY product_id`
  );
  return new Map(rows.map((r) => [String(r.product_id), Number(r.qty) || 0]));
}

async function getProductInventoryAsync(productId) {
  if (!usePg()) return sqlite.getProductInventory(productId);
  const meta = await fetchProductMeta(productId);
  if (!meta) return null;
  const stock = await fetchStock(productId);
  if (!stock) return null;
  return toLegacyInventory(meta, rowToStock(stock));
}

// --- Writes ----------------------------------------------------------------

async function reserve({ productId, quantity, userId, idempotencyKey }) {
  if (!usePg()) return sqlite.reserve({ productId, quantity, userId, idempotencyKey });
  return withPgLock(async () => {
    const qty = Number(quantity);
    if (!productId || !Number.isInteger(qty) || qty < 1) {
      throw err(400, 'productId and integer quantity (>=1) are required');
    }
    if (!userId) throw err(400, 'userId is required');

    const product = String(productId);
    const amount = Math.trunc(qty);
    const key = idempotencyKey ? String(idempotencyKey) : null;
    const now = new Date();
    let created = false;

    try {
      // The decrement, product check and reservation insert form one unit of
      // work. If the insert fails, the stock decrement rolls back with it.
      const row = await db.transaction(async (tx) => {
        if (key) {
          const existing = await tx.queryOne(
            `SELECT * FROM reservations
              WHERE idempotency_key = $1 AND status IN ('ACTIVE','CONFIRMED')`,
            [key]
          );
          if (existing) return existing;
        }

        const meta = await tx.queryOne(
          'SELECT id, name, status FROM products WHERE id = $1 FOR SHARE',
          [product]
        );
        if (!meta) throw err(404, 'Product not found');
        if (meta.status && meta.status !== 'active') {
          throw err(400, `Product is no longer available: ${meta.name}`);
        }

        const updated = await tx.queryOne(
          `UPDATE inventory_stock
              SET available_stock = available_stock - $2,
                  reserved_stock   = reserved_stock + $2,
                  updated_at = now()
            WHERE product_id = $1 AND available_stock >= $2
            RETURNING product_id`,
          [product, amount]
        );
        if (!updated) {
          const stock = await tx.queryOne(
            'SELECT available_stock FROM inventory_stock WHERE product_id = $1',
            [product]
          );
          if (!stock) throw err(404, 'Product not found');
          throw err(409, `Insufficient stock. Available: ${stock.available_stock}, Requested: ${amount}`);
        }

        const inserted = await tx.queryOne(
          `INSERT INTO reservations
             (reservation_id, product_id, quantity, user_id, status, created_at, expires_at, idempotency_key)
           VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6,$7)
           RETURNING *`,
          [
            genReservationId(), product, amount, String(userId),
            now, new Date(now.getTime() + RESERVATION_TTL_MS), key,
          ]
        );
        created = true;
        return inserted;
      });

      if (!created) {
        return { reservation: rowToReservation(row), idempotent: true };
      }
      await syncStock(product);
      return { reservation: rowToReservation(row), idempotent: false };
    } catch (insertErr) {
      // A competing process can win the partial unique idempotency index while
      // this transaction is in flight. Its stock update remains authoritative.
      if (insertErr && insertErr.code === '23505' && key) {
        const winner = await db.queryOne(
          `SELECT * FROM reservations
            WHERE idempotency_key = $1 AND status IN ('ACTIVE','CONFIRMED')`,
          [key]
        );
        if (winner) return { reservation: rowToReservation(winner), idempotent: true };
      }
      throw insertErr;
    }
  });
}

async function confirm(reservationId) {
  if (!usePg()) return sqlite.confirm(reservationId);
  return withPgLock(async () => {
    const id = String(reservationId);
    const now = new Date();
    const result = await db.transaction(async (tx) => {
      // Lock the reservation before inspecting it. Cancel and bulk expiry also
      // write this row, so a multi-process caller must not race this decision.
      const res = await tx.queryOne(
        'SELECT * FROM reservations WHERE reservation_id = $1 FOR UPDATE',
        [id]
      );
      if (!res) throw err(404, 'Reservation not found');
      if (res.status !== 'ACTIVE') {
        throw err(409, `Reservation is not active (status: ${res.status})`);
      }

      let outcome = 'CONFIRMED';
      if (new Date(res.expires_at) < now) outcome = 'EXPIRED';

      const changed = await tx.queryOne(
        `UPDATE reservations SET status = $2
          WHERE reservation_id = $1 AND status = 'ACTIVE'
          RETURNING *`,
        [id, outcome]
      );
      if (!changed) throw err(409, 'Reservation is not active');
      if (outcome === 'EXPIRED') {
        await tx.query(
          `UPDATE inventory_stock
              SET reserved_stock  = GREATEST(0, reserved_stock - $2),
                  available_stock = available_stock + $2,
                  updated_at = now()
            WHERE product_id = $1`,
          [res.product_id, Number(res.quantity)]
        );
      } else {
        await tx.query(
          `UPDATE inventory_stock
              SET reserved_stock = GREATEST(0, reserved_stock - $2),
                  sold           = sold + $2,
                  updated_at = now()
            WHERE product_id = $1`,
          [res.product_id, Number(res.quantity)]
        );
      }
      return { expired: outcome === 'EXPIRED', productId: res.product_id };
    });

    await syncStock(result.productId);
    if (result.expired) throw err(410, 'Reservation has expired');
    return { success: true };
  });
}

async function cancel(reservationId) {
  if (!usePg()) return sqlite.cancel(reservationId);
  return withPgLock(async () => {
    const id = String(reservationId);
    const result = await db.transaction(async (tx) => {
      const active = await tx.queryOne(
        'SELECT * FROM reservations WHERE reservation_id = $1 FOR UPDATE',
        [id]
      );
      if (!active) throw err(404, 'Reservation not found');
      if (active.status !== 'ACTIVE') {
        throw err(409, `Reservation is not active (status: ${active.status})`);
      }

      const cancelled = await tx.queryOne(
        `UPDATE reservations SET status = 'CANCELLED'
          WHERE reservation_id = $1 AND status = 'ACTIVE'
          RETURNING *`,
        [id]
      );
      if (!cancelled) throw err(409, 'Reservation is not active');
      await tx.query(
        `UPDATE inventory_stock
            SET available_stock = available_stock + $2,
                reserved_stock   = GREATEST(0, reserved_stock - $2),
                updated_at = now()
          WHERE product_id = $1`,
        [cancelled.product_id, Number(cancelled.quantity)]
      );
      return { productId: cancelled.product_id };
    });

    await syncStock(result.productId);
    return { success: true };
  });
}

async function releaseExpired() {
  if (!usePg()) return sqlite.releaseExpired();
  // Same return shape as the SQLite layer: { released: n }
  return withPgLock(async () => ({ released: await expireOverdue() }));
}

// Atomic checkout: decrement stock for every cart line, then create the order
// (+ items) in the same Postgres transaction. Any failure rolls everything back.
async function createOrder({ userId, cartItems, buyerUser, paymentMethod, shippingAddress, idempotencyKey }) {
  if (!usePg()) {
    return sqlite.createOrder({ userId, cartItems, buyerUser, paymentMethod, shippingAddress, idempotencyKey });
  }
  return withPgLock(async () => {
    if (idempotencyKey) {
      const existing = await db.queryOne(
        'SELECT id FROM orders WHERE idempotency_key = $1',
        [String(idempotencyKey)]
      );
      if (existing) {
        const orders = require('./orders');
        const order = await orders.findById(existing.id);
        return { order, idempotent: true };
      }
    }

    const items = Array.isArray(cartItems) ? cartItems : [];
    const orderItems = [];
    const touchedProducts = new Set();

    const order = await db.transaction(async (tx) => {
      for (const item of items) {
        const productId = String(item.productId);
        const qty = Math.trunc(Number(item.quantity));
        if (!Number.isFinite(qty) || qty < 1) {
          throw err(400, `Invalid quantity for ${productId}`);
        }
        const meta = await tx.queryOne(
          'SELECT id, name, price, status, seller_id FROM products WHERE id = $1',
          [productId]
        );
        if (!meta) {
          throw err(400, `Product no longer exists: ${item.product ? item.product.name : productId}`);
        }
        if (meta.status && meta.status !== 'active') {
          throw err(400, `Product is no longer available: ${meta.name}`);
        }
        const dec = await tx.queryOne(
          `UPDATE inventory_stock
              SET available_stock = available_stock - $2,
                  sales_count = sales_count + $2,
                  updated_at = now()
            WHERE product_id = $1 AND available_stock >= $2
            RETURNING available_stock`,
          [productId, qty]
        );
        if (!dec) {
          const stock = await tx.queryOne(
            'SELECT available_stock FROM inventory_stock WHERE product_id = $1',
            [productId]
          );
          if (!stock) throw err(400, `Product no longer exists: ${item.product ? item.product.name : productId}`);
          throw err(409, `Insufficient stock for ${meta.name}. Available: ${stock.available_stock}, Requested: ${qty}`);
        }
        orderItems.push({
          product: {
            _id: (item.product && item.product._id) || productId,
            // Capture the catalog name: the cart's snapshot is a convenience
            // copy that legacy carts may lack, while products.name is NOT NULL.
            // Never a placeholder - an unusable name stays empty and is resolved
            // from the catalog when the order is read.
            name: pickItemName(item.product && item.product.name, meta.name),
          },
          quantity: qty,
          price: Number(meta.price) || 0,
          sellerId: meta.seller_id || null,
        });
        touchedProducts.add(productId);
      }

      const orderId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
      const createdAt = new Date();
      const totalAmount = items.reduce(
        (sum, it) => sum + (Number(it.product ? it.product.price : 0) || 0) * Number(it.quantity),
        0
      );
      await tx.query(
        `INSERT INTO orders
           (id, user_id, tracking_id, buyer_name, buyer_email, status,
            payment_method, total_amount, shipping_address, idempotency_key, created_at)
         VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10)`,
        [
          orderId, userId ? String(userId) : null,
          'TP' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 5).toUpperCase(),
          (buyerUser && buyerUser.name) || '', (buyerUser && buyerUser.email) || '',
          paymentMethod || 'cod', totalAmount, JSON.stringify(shippingAddress || {}),
          idempotencyKey ? String(idempotencyKey) : null, createdAt,
        ]
      );
      for (const oi of orderItems) {
        await tx.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, seller_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            orderId,
            oi.product._id ? String(oi.product._id) : null,
            oi.product.name, oi.quantity, oi.price,
            oi.sellerId ? String(oi.sellerId) : null,
          ]
        );
      }
      return {
        _id: orderId,
        userId,
        buyerName: (buyerUser && buyerUser.name) || '',
        buyerEmail: (buyerUser && buyerUser.email) || '',
        items: orderItems,
        totalAmount,
        status: 'pending',
        paymentMethod: paymentMethod || 'cod',
        shippingAddress: shippingAddress || {},
        createdAt: createdAt.toISOString(),
        idempotency_key: idempotencyKey || null,
      };
    });

    // Post-commit mirrors (outside the tx, like the SQLite post-commit syncs).
    for (const pid of touchedProducts) {
      await syncStock(pid); // eslint-disable-line no-await-in-loop
    }
    try {
      const orders = require('./orders');
      await orders.mirrorAll();
    } catch (e) {
      console.error('[db:inventory] orders mirror failed:', e.message);
    }

    return { order, idempotent: false };
  });
}

// --- Product lifecycle / seeding -------------------------------------------

function migrateProducts() {
  if (!usePg()) return sqlite.migrateProducts();
  // PG mode: the import script + ensureProductSeeded keep inventory_stock
  // populated. Also run the legacy migration so products.json stays coherent
  // for readers still on the JSON path (harmless when files are empty).
  try {
    sqlite.migrateProducts();
  } catch (e) {
    console.error('[db:inventory] legacy migrateProducts failed:', e.message);
  }
}

async function upsertProduct(productId, stock) {
  if (!usePg()) return sqlite.upsertProduct(productId, stock);
  const s = Math.max(0, Math.trunc(Number(stock) || 0));
  await db.query(
    `INSERT INTO inventory_stock (product_id, total_stock, available_stock, reserved_stock, sold, sales_count)
     VALUES ($1,$2,$2,0,0,0)
     ON CONFLICT (product_id) DO UPDATE SET
       total_stock = EXCLUDED.total_stock,
       available_stock = EXCLUDED.total_stock - inventory_stock.reserved_stock,
       updated_at = now()`,
    [String(productId), s]
  );
  await syncStock(productId);
}

async function ensureProductSeeded(productId, stock) {
  if (!usePg()) return sqlite.ensureProductSeeded(productId, stock);
  const s = Math.max(0, Math.trunc(Number(stock) || 0));
  await db.query(
    `INSERT INTO inventory_stock (product_id, total_stock, available_stock, reserved_stock, sold, sales_count)
     VALUES ($1,$2,$2,0,0,0)
     ON CONFLICT (product_id) DO NOTHING`,
    [String(productId), s]
  );
}

async function deleteProduct(productId) {
  if (!usePg()) return sqlite.deleteProduct(productId);
  await db.query('DELETE FROM inventory_stock WHERE product_id = $1', [String(productId)]);
}

function setMongoStockSyncer(fn) {
  // Both modes share the hook in the SQLite layer, which also drives the
  // products.json sync - PG mode reuses it via syncStock().
  return sqlite.setMongoStockSyncer(fn);
}

function syncProductToCache(productId) {
  return sqlite.syncProductToCache(productId);
}

function syncAllProductsToCache() {
  return sqlite.syncAllProductsToCache();
}

async function resetForTesting() {
  if (!usePg()) return sqlite.resetForTesting();
  await db.query('DELETE FROM reservations');
  await db.query('DELETE FROM inventory_stock');
}

// --- Expiration job --------------------------------------------------------

let expirationTimer = null;

function startExpirationJob(intervalMs = 60000) {
  if (expirationTimer) return expirationTimer;
  if (!usePg()) return sqlite.startExpirationJob(intervalMs);
  expirationTimer = setInterval(async () => {
    try {
      await withPgLock(() => expireOverdue());
    } catch (e) {
      console.error('[db:inventory] expiration sweep failed:', e.message);
    }
  }, intervalMs);
  if (expirationTimer.unref) expirationTimer.unref();
  return expirationTimer;
}

module.exports = {
  migrateProducts,
  reserve,
  confirm,
  cancel,
  releaseExpired,
  getProductInventory,
  getProductInventoryAsync,
  getActiveReservationTotals,
  startExpirationJob,
  createOrder,
  upsertProduct,
  ensureProductSeeded,
  setMongoStockSyncer,
  deleteProduct,
  resetForTesting,
  syncProductToCache,
  syncAllProductsToCache,
};

