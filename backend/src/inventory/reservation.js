// SQLite-backed ACID inventory reservation system.
//
// All mutations are protected by database transactions + CHECK constraints,
// providing cross-process safety without an in-process mutex.
//
// Core invariants enforced at the DB level:
//   - available_stock >= 0  (CHECK constraint)
//   - reserved_stock >= 0   (CHECK constraint)
//   - reservation status transitions are conditional (WHERE status = 'ACTIVE')
//   - idempotency keys are unique among ACTIVE/CONFIRMED reservations (partial unique index)
//
// Exports the same API as the previous JSON-file version so callers
// (routes/inventory.js, server.js) work unchanged.

const fs = require('fs');
const {
  getDb,
  syncProductToCache,
  syncAllProductsToCache,
  upsertProduct,
  deleteProduct,
  resetForTesting,
  PRODUCTS_FILE,
} = require('./store');

const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// Migration / initialization
// ---------------------------------------------------------------------------

function migrateProducts() {
  const db = getDb();

  let products = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  }

  // Add inventory fields to JSON products if missing (backward compat)
  let jsonChanged = false;
  products.forEach(p => {
    if (p.total_stock === undefined) {
      const currentStock = p.stock || 0;
      p.total_stock = currentStock;
      p.available_stock = currentStock;
      p.reserved_stock = 0;
      p.sold = 0;
      jsonChanged = true;
    }
  });

  // Insert new products into SQLite — don't overwrite existing rows
  // (SQLite is source of truth once seeded)
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO inventory_stock
       (product_id, total_stock, available_stock, reserved_stock, sold, sales_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const migrate = db.transaction(() => {
    for (const p of products) {
      const totalStock = p.total_stock !== undefined ? p.total_stock : (p.stock || 0);
      const availableStock = p.available_stock !== undefined ? p.available_stock : (p.stock || 0);
      const reservedStock = p.reserved_stock || 0;
      const sold = p.sold || 0;
      const salesCount = p.salesCount || 0;
      insertStmt.run(p._id, totalStock, availableStock, reservedStock, sold, salesCount);
    }
  });
  migrate();

  // Sync SQLite state back to JSON (SQLite is source of truth)
  const stockRows = db.prepare('SELECT * FROM inventory_stock').all();
  const stockMap = new Map(stockRows.map(r => [r.product_id, r]));

  products.forEach(p => {
    const stock = stockMap.get(p._id);
    if (stock) {
      p.total_stock = stock.total_stock;
      p.available_stock = stock.available_stock;
      p.reserved_stock = stock.reserved_stock;
      p.sold = stock.sold;
      p.salesCount = stock.sales_count;
      p.stock = stock.available_stock;
      jsonChanged = true;
    }
  });

  if (jsonChanged) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    if (global.dataCache) global.dataCache.products = products;
  }

  return products;
}

// ---------------------------------------------------------------------------
// Reservation operations
// ---------------------------------------------------------------------------

function generateReservationId() {
  return 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

function rowToReservation(row) {
  return {
    reservation_id: row.reservation_id,
    product_id: row.product_id,
    quantity: row.quantity,
    user_id: row.user_id,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    idempotency_key: row.idempotency_key,
  };
}

// Reserve stock atomically.
// Returns { reservation, idempotent } or throws { status, message }.
async function reserve({ productId, quantity, userId, idempotencyKey }) {
  const db = getDb();

  return db.transaction(() => {
    // Idempotency: return existing ACTIVE/CONFIRMED reservation with same key
    const existing = db.prepare(
      `SELECT * FROM reservations WHERE idempotency_key = ? AND status IN ('ACTIVE','CONFIRMED')`
    ).get(idempotencyKey);

    if (existing) {
      return { reservation: rowToReservation(existing), idempotent: true };
    }

    // Conditional atomic stock decrement — the core oversell prevention.
    // If available_stock < quantity, zero rows are updated → 409.
    // The partial unique index on idempotency_key also prevents a race
    // where two processes insert the same key simultaneously.
    const result = db.prepare(
      `UPDATE inventory_stock
         SET available_stock = available_stock - ?,
             reserved_stock  = reserved_stock + ?
       WHERE product_id = ? AND available_stock >= ?`
    ).run(quantity, quantity, productId, quantity);

    if (result.changes === 0) {
      const product = db.prepare('SELECT available_stock FROM inventory_stock WHERE product_id = ?').get(productId);
      if (!product) {
        throw { status: 404, message: 'Product not found' };
      }
      throw {
        status: 409,
        message: `Insufficient stock. Available: ${product.available_stock}, Requested: ${quantity}`,
      };
    }

    const now = new Date();
    const reservation = {
      reservation_id: generateReservationId(),
      product_id: productId,
      quantity: quantity,
      user_id: userId,
      status: 'ACTIVE',
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + RESERVATION_TTL_MS).toISOString(),
      idempotency_key: idempotencyKey,
    };

    db.prepare(
      `INSERT INTO reservations
         (reservation_id, product_id, quantity, user_id, status, created_at, expires_at, idempotency_key)
       VALUES
         (@reservation_id, @product_id, @quantity, @user_id, @status, @created_at, @expires_at, @idempotency_key)`
    ).run(reservation);

    syncProductToCache(productId);
    return { reservation, idempotent: false };
  })();
}

// Confirm a reservation: ACTIVE → CONFIRMED + move reserved → sold.
// If expired, transitions to EXPIRED + releases stock + throws 410.
async function confirm(reservationId) {
  const db = getDb();
  const now = new Date();

  return db.transaction(() => {
    const res = db.prepare('SELECT * FROM reservations WHERE reservation_id = ?').get(reservationId);
    if (!res) {
      throw { status: 404, message: 'Reservation not found' };
    }

    if (res.status !== 'ACTIVE') {
      throw { status: 409, message: `Reservation is not active (status: ${res.status})` };
    }

    // If expired, transition to EXPIRED + release stock atomically
    if (new Date(res.expires_at) < now) {
      db.prepare(
        `UPDATE reservations SET status = 'EXPIRED' WHERE reservation_id = ? AND status = 'ACTIVE'`
      ).run(reservationId);

      db.prepare(
        `UPDATE inventory_stock
           SET reserved_stock  = MAX(0, reserved_stock - ?),
               available_stock = available_stock + ?
         WHERE product_id = ?`
      ).run(res.quantity, res.quantity, res.product_id);

      syncProductToCache(res.product_id);
      throw { status: 410, message: 'Reservation has expired' };
    }

    // Conditional state transition: ACTIVE → CONFIRMED
    // If another process changed the status between our SELECT and UPDATE,
    // zero rows are updated → 409.
    const result = db.prepare(
      `UPDATE reservations SET status = 'CONFIRMED' WHERE reservation_id = ? AND status = 'ACTIVE'`
    ).run(reservationId);

    if (result.changes === 0) {
      throw { status: 409, message: 'Reservation is not active' };
    }

    // Move reserved → sold
    db.prepare(
      `UPDATE inventory_stock
         SET reserved_stock = MAX(0, reserved_stock - ?),
             sold           = sold + ?
       WHERE product_id = ?`
    ).run(res.quantity, res.quantity, res.product_id);

    syncProductToCache(res.product_id);
    return { success: true };
  })();
}

// Cancel a reservation: ACTIVE → CANCELLED + release stock back to available.
async function cancel(reservationId) {
  const db = getDb();

  return db.transaction(() => {
    // Conditional state transition: ACTIVE → CANCELLED
    const result = db.prepare(
      `UPDATE reservations SET status = 'CANCELLED' WHERE reservation_id = ? AND status = 'ACTIVE'`
    ).run(reservationId);

    if (result.changes === 0) {
      const res = db.prepare('SELECT status FROM reservations WHERE reservation_id = ?').get(reservationId);
      if (!res) {
        throw { status: 404, message: 'Reservation not found' };
      }
      throw { status: 409, message: `Reservation is not active (status: ${res.status})` };
    }

    // Release stock: reserved → available
    const res = db.prepare('SELECT product_id, quantity FROM reservations WHERE reservation_id = ?').get(reservationId);
    db.prepare(
      `UPDATE inventory_stock
         SET reserved_stock  = MAX(0, reserved_stock - ?),
             available_stock = available_stock + ?
       WHERE product_id = ?`
    ).run(res.quantity, res.quantity, res.product_id);

    syncProductToCache(res.product_id);
    return { success: true };
  })();
}

// Release all expired ACTIVE reservations (called by background job).
// Each reservation is transitioned to EXPIRED and its stock restored.
async function releaseExpired() {
  const db = getDb();
  const nowIso = new Date().toISOString();

  return db.transaction(() => {
    const expired = db.prepare(
      `SELECT reservation_id, product_id, quantity
         FROM reservations
        WHERE status = 'ACTIVE' AND expires_at < ?`
    ).all(nowIso);

    if (expired.length === 0) return { released: 0 };

    // Transition all expired ACTIVE reservations to EXPIRED
    db.prepare(
      `UPDATE reservations SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expires_at < ?`
    ).run(nowIso);

    // Restore stock for each expired reservation
    const restoreStmt = db.prepare(
      `UPDATE inventory_stock
         SET reserved_stock  = MAX(0, reserved_stock - ?),
             available_stock = available_stock + ?
       WHERE product_id = ?`
    );

    const affectedProducts = new Set();
    for (const r of expired) {
      restoreStmt.run(r.quantity, r.quantity, r.product_id);
      affectedProducts.add(r.product_id);
    }

    for (const pid of affectedProducts) {
      syncProductToCache(pid);
    }

    return { released: expired.length };
  })();
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

function getProductInventory(productId) {
  const db = getDb();
  const stock = db.prepare('SELECT * FROM inventory_stock WHERE product_id = ?').get(productId);
  if (!stock) return null;

  const products = (global.dataCache && global.dataCache.products) || [];
  const product = products.find(p => p._id === productId);

  return {
    product_id: stock.product_id,
    name: product ? product.name : '',
    total_stock: stock.total_stock,
    available_stock: stock.available_stock,
    reserved_stock: stock.reserved_stock,
    sold: stock.sold,
  };
}

// ---------------------------------------------------------------------------
// Background expiration job
// ---------------------------------------------------------------------------

function startExpirationJob(intervalMs = 60000) {
  setInterval(() => {
    try {
      const result = releaseExpired();
      if (result.released > 0) {
        console.log(`[inventory] Released ${result.released} expired reservations`);
      }
    } catch (e) {
      console.error('[inventory] Expiration job error:', e.message);
    }
  }, intervalMs);
}

// ---------------------------------------------------------------------------
// Checkout: atomic multi-item stock decrement + order creation
// ---------------------------------------------------------------------------

// Creates an order with atomic stock decrement for all items.
// If ANY item has insufficient stock, the entire transaction rolls back.
// Idempotency: if idempotencyKey matches an existing order, returns it.
//
// Returns { order, idempotent } or throws { status, message }.
async function createOrder({ userId, cartItems, buyerUser, paymentMethod, shippingAddress, idempotencyKey }) {
  const db = getDb();

  return db.transaction(() => {
    // Idempotency check (inside transaction → race-safe across processes)
    if (idempotencyKey) {
      const existing = db.prepare('SELECT doc FROM orders WHERE idempotency_key = ?').get(idempotencyKey);
      if (existing) {
        return { order: JSON.parse(existing.doc), idempotent: true };
      }
    }

    const products = (global.dataCache && global.dataCache.products) || [];
    const orderItems = [];

    // Validate + atomically decrement stock for ALL items.
    // If any item fails, the transaction rolls back all previous decrements.
    for (const item of cartItems) {
      const productId = item.productId;
      const quantity = item.quantity;

      // Check product exists and is active (metadata from JSON cache)
      const product = products.find(p => p._id === productId);
      if (!product) {
        throw { status: 400, message: `Product no longer exists: ${item.product ? item.product.name : productId}` };
      }
      if (product.status && product.status !== 'active') {
        throw { status: 400, message: `Product is no longer available: ${product.name}` };
      }

      // Conditional atomic decrement — oversell prevention
      const result = db.prepare(
        `UPDATE inventory_stock
           SET available_stock = available_stock - ?,
               sales_count    = sales_count + ?
         WHERE product_id = ? AND available_stock >= ?`
      ).run(quantity, quantity, productId, quantity);

      if (result.changes === 0) {
        const stock = db.prepare('SELECT available_stock FROM inventory_stock WHERE product_id = ?').get(productId);
        if (!stock) {
          throw { status: 400, message: `Product no longer exists: ${item.product ? item.product.name : productId}` };
        }
        throw {
          status: 409,
          message: `Insufficient stock for ${product.name}. Available: ${stock.available_stock}, Requested: ${quantity}`,
        };
      }

      orderItems.push({
        product: { _id: item.product ? item.product._id : productId, name: item.product ? item.product.name : 'Product' },
        quantity: quantity,
        price: product.price || 0,
        sellerId: product.userId || product.supplierId || null,
      });
    }

    // Create order
    const orderId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    const order = {
      _id: orderId,
      trackingId: 'TP' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 5).toUpperCase(),
      userId: userId,
      buyerName: buyerUser.name || '',
      buyerEmail: buyerUser.email || '',
      items: orderItems,
      totalAmount: cartItems.reduce((sum, item) => sum + ((item.product ? item.product.price : 0) * item.quantity), 0),
      status: 'pending',
      paymentMethod: paymentMethod || 'cod',
      shippingAddress: shippingAddress || {},
      createdAt: new Date().toISOString(),
      idempotency_key: idempotencyKey || null,
    };

    db.prepare(
      'INSERT INTO orders (_id, doc, idempotency_key, created_at) VALUES (?, ?, ?, ?)'
    ).run(orderId, JSON.stringify(order), idempotencyKey || null, order.createdAt);

    // Sync stock changes to JSON cache
    for (const item of cartItems) {
      syncProductToCache(item.productId);
    }

    return { order, idempotent: false };
  })();
}

module.exports = {
  migrateProducts,
  reserve,
  confirm,
  cancel,
  releaseExpired,
  getProductInventory,
  startExpirationJob,
  createOrder,
  upsertProduct,
  deleteProduct,
  resetForTesting,
  syncProductToCache,
  syncAllProductsToCache,
};
