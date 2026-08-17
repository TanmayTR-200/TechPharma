const fs = require('fs');
const path = require('path');
const { withLock } = require('./lock');

const RESERVATION_FILE = path.join(__dirname, '../../data/reservations.json');
const PRODUCTS_FILE = path.join(__dirname, '../../data/products.json');
const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

function readJson(filePath) {
  const colName = path.basename(filePath, '.json');
  if (global.dataCache && global.dataCache[colName] !== undefined) {
    return global.dataCache[colName];
  }
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  const colName = path.basename(filePath, '.json');
  if (global.dataCache) {
    global.dataCache[colName] = data;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Migrate product schema: stock → total_stock + available_stock + reserved_stock + sold
function migrateProducts() {
  const products = readJson(PRODUCTS_FILE);
  let changed = false;
  products.forEach(p => {
    if (p.total_stock === undefined) {
      const currentStock = p.stock || 0;
      p.total_stock = currentStock;
      p.available_stock = currentStock;
      p.reserved_stock = 0;
      p.sold = 0;
      changed = true;
    }
  });
  if (changed) writeJson(PRODUCTS_FILE, products);
  return products;
}

// Generate reservation ID
function generateReservationId() {
  return 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

// Reserve inventory atomically
async function reserve({ productId, quantity, userId, idempotencyKey }) {
  return withLock(() => {
    const reservations = readJson(RESERVATION_FILE);

    // Idempotency check — if same key exists, return existing reservation
    const existing = reservations.find(r => r.idempotency_key === idempotencyKey);
    if (existing && (existing.status === 'ACTIVE' || existing.status === 'CONFIRMED')) {
      return { reservation: existing, idempotent: true };
    }

    const products = readJson(PRODUCTS_FILE);
    const product = products.find(p => p._id === productId);

    if (!product) {
      throw { status: 404, message: 'Product not found' };
    }

    // Ensure migrated schema
    if (product.total_stock === undefined) {
      product.total_stock = product.stock || 0;
      product.available_stock = product.stock || 0;
      product.reserved_stock = 0;
      product.sold = 0;
    }

    // Atomic conditional check — the core of oversell prevention
    if (product.available_stock < quantity) {
      throw { status: 409, message: `Insufficient stock. Available: ${product.available_stock}, Requested: ${quantity}` };
    }

    // Move stock from available to reserved
    product.available_stock -= quantity;
    product.reserved_stock += quantity;

    // Keep legacy stock field in sync for backwards compatibility
    product.stock = product.available_stock;

    writeJson(PRODUCTS_FILE, products);

    // Create reservation record
    const now = new Date();
    const reservation = {
      reservation_id: generateReservationId(),
      product_id: productId,
      quantity: quantity,
      user_id: userId,
      status: 'ACTIVE',
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + RESERVATION_TTL_MS).toISOString(),
      idempotency_key: idempotencyKey
    };

    reservations.push(reservation);
    writeJson(RESERVATION_FILE, reservations);

    return { reservation, idempotent: false };
  });
}

// Confirm a reservation (move reserved → sold)
async function confirm(reservationId) {
  return withLock(() => {
    const reservations = readJson(RESERVATION_FILE);
    const reservation = reservations.find(r => r.reservation_id === reservationId);

    if (!reservation) {
      throw { status: 404, message: 'Reservation not found' };
    }

    if (reservation.status !== 'ACTIVE') {
      throw { status: 409, message: `Reservation is not active (status: ${reservation.status})` };
    }

    // Check if expired
    if (new Date(reservation.expires_at) < new Date()) {
      // Treat as expired — release stock
      releaseReservation(reservation, reservations);
      writeJson(RESERVATION_FILE, reservations);
      throw { status: 410, message: 'Reservation has expired' };
    }

    // Move reserved → sold
    const products = readJson(PRODUCTS_FILE);
    const product = products.find(p => p._id === reservation.product_id);

    if (product) {
      product.reserved_stock = Math.max(0, product.reserved_stock - reservation.quantity);
      product.sold = (product.sold || 0) + reservation.quantity;
      writeJson(PRODUCTS_FILE, products);
    }

    reservation.status = 'CONFIRMED';
    writeJson(RESERVATION_FILE, reservations);

    return { success: true };
  });
}

// Cancel a reservation (move reserved → available)
async function cancel(reservationId) {
  return withLock(() => {
    const reservations = readJson(RESERVATION_FILE);
    const reservation = reservations.find(r => r.reservation_id === reservationId);

    if (!reservation) {
      throw { status: 404, message: 'Reservation not found' };
    }

    if (reservation.status !== 'ACTIVE') {
      throw { status: 409, message: `Reservation is not active (status: ${reservation.status})` };
    }

    releaseReservation(reservation, reservations);
    writeJson(RESERVATION_FILE, reservations);

    return { success: true };
  });
}

// Helper: release a reservation's stock back to available
function releaseReservation(reservation, reservations) {
  const products = readJson(PRODUCTS_FILE);
  const product = products.find(p => p._id === reservation.product_id);

  if (product) {
    product.reserved_stock = Math.max(0, product.reserved_stock - reservation.quantity);
    product.available_stock = product.available_stock + reservation.quantity;
    product.stock = product.available_stock;
    writeJson(PRODUCTS_FILE, products);
  }

  reservation.status = reservation.status === 'ACTIVE' ? 'CANCELLED' : reservation.status;
  // If called from expiration, override status
}

// Release expired reservations (called by background interval)
async function releaseExpired() {
  return withLock(() => {
    const reservations = readJson(RESERVATION_FILE);
    const now = new Date();
    let released = 0;

    const products = readJson(PRODUCTS_FILE);
    const productMap = new Map(products.map(p => [p._id, p]));

    reservations.forEach(r => {
      if (r.status === 'ACTIVE' && new Date(r.expires_at) < now) {
        const product = productMap.get(r.product_id);
        if (product) {
          product.reserved_stock = Math.max(0, product.reserved_stock - r.quantity);
          product.available_stock += r.quantity;
          product.stock = product.available_stock;
        }
        r.status = 'EXPIRED';
        released++;
      }
    });

    if (released > 0) {
      writeJson(PRODUCTS_FILE, products);
      writeJson(RESERVATION_FILE, reservations);
    }

    return { released };
  });
}

// Get inventory status for a product
function getProductInventory(productId) {
  const products = readJson(PRODUCTS_FILE);
  const product = products.find(p => p._id === productId);
  if (!product) return null;
  return {
    product_id: product._id,
    name: product.name,
    total_stock: product.total_stock ?? product.stock ?? 0,
    available_stock: product.available_stock ?? product.stock ?? 0,
    reserved_stock: product.reserved_stock ?? 0,
    sold: product.sold ?? 0
  };
}

// Start background expiration job
function startExpirationJob(intervalMs = 60000) {
  setInterval(async () => {
    try {
      const result = await releaseExpired();
      if (result.released > 0) {
        console.log(`[inventory] Released ${result.released} expired reservations`);
      }
    } catch (e) {
      console.error('[inventory] Expiration job error:', e.message);
    }
  }, intervalMs);
}

module.exports = {
  migrateProducts,
  reserve,
  confirm,
  cancel,
  releaseExpired,
  getProductInventory,
  startExpirationJob,
};
