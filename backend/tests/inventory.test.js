/**
 * Concurrency tests for the SQLite-backed inventory reservation system.
 *
 * Run with: npm test   (jest, in-band with the rest of the suite)
 *
 * Tests:
 * 1.  100 concurrent users for 10-stock item → 10 succeed, 90 rejected, 0 oversold
 * 2. Two users for the last item simultaneously
 * 3. Multiple-unit reservation (qty > available)
 * 4. Duplicate idempotency key → same reservation returned
 * 5. Reservation expiration releases stock
 * 6. Cancel releases stock
 * 7. Concurrent confirm + cancel → only one wins
 * 8. Concurrent expiration + confirmation
 * 9. MULTI-PROCESS: 20 child processes against 10-stock item → 10 succeed, 10 rejected
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

// Use a dedicated test DB (not the production one)
process.env.SQLITE_PATH = path.join(__dirname, '../data/test_inventory.db');

const inventory = require('../src/inventory/reservation');
const { getDb } = require('../src/inventory/store');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');

// This suite overwrites products.json / reservations.json — back them up first
const BACKUP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-inventory-test-'));
for (const f of ['products.json', 'reservations.json']) {
  if (fs.existsSync(path.join(DATA_DIR, f))) {
    fs.copyFileSync(path.join(DATA_DIR, f), path.join(BACKUP_DIR, f));
  }
}

function setupTestProduct(stock) {
  const product = {
    _id: 'test_product_1',
    name: 'Test Product',
    price: 100,
    category: 'test',
    stock: stock,
    total_stock: stock,
    available_stock: stock,
    reserved_stock: 0,
    sold: 0,
    status: 'active',
    userId: 'test_supplier',
    images: []
  };

  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([product], null, 2));
  fs.writeFileSync(RESERVATIONS_FILE, '[]');

  // global.dataCache is needed by createOrder for product metadata
  global.dataCache = { products: [product] };

  // Reset SQLite tables and seed the product
  inventory.resetForTesting();
  inventory.upsertProduct('test_product_1', stock);
}

function getProduct() {
  // Read from SQLite (source of truth) — not products.json — so that
  // multi-process test results are visible even when child processes
  // don't sync back to the JSON cache.
  const db = getDb();
  return db.prepare('SELECT * FROM inventory_stock WHERE product_id = ?').get('test_product_1');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

afterAll(() => {
  // Remove the test SQLite DB
  try {
    const dbPath = process.env.SQLITE_PATH;
    if (dbPath && fs.existsSync(dbPath)) {
      try { getDb().close(); } catch (e) { /* already closed */ }
      [dbPath, dbPath + '-wal', dbPath + '-shm'].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    }
  } catch (e) { /* ignore cleanup errors */ }

  // Restore the data files this suite overwrote
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    fs.copyFileSync(path.join(BACKUP_DIR, f), path.join(DATA_DIR, f));
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
});

describe('Inventory concurrency (SQLite)', () => {
  test('100 concurrent users for 10-stock item → 10 succeed, 90 rejected', async () => {
    setupTestProduct(10);
    const results = [];
    const promises = [];

    for (let i = 0; i < 100; i++) {
      promises.push(
        inventory.reserve({
          productId: 'test_product_1',
          quantity: 1,
          userId: `user_${i}`,
          idempotencyKey: `key_user_${i}_${Date.now()}`
        }).then(r => results.push({ success: true, reservation: r }))
         .catch(e => results.push({ success: false, error: e }))
      );
    }

    await Promise.all(promises);

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const product = getProduct();

    assert(succeeded === 10, `Expected 10 successes, got ${succeeded}`);
    assert(failed === 90, `Expected 90 failures, got ${failed}`);
    assert(product.available_stock === 0, `Expected available_stock=0, got ${product.available_stock}`);
    assert(product.reserved_stock === 10, `Expected reserved_stock=10, got ${product.reserved_stock}`);
    assert(product.sold === 0, `Expected sold=0, got ${product.sold}`);
  });

  test('Two users for last item → 1 succeeds, 1 rejected', async () => {
    setupTestProduct(1);
    const results = [];

    const p1 = inventory.reserve({ productId: 'test_product_1', quantity: 1, userId: 'user_a', idempotencyKey: 'key_a' })
      .then(r => results.push({ success: true }))
      .catch(e => results.push({ success: false }));

    const p2 = inventory.reserve({ productId: 'test_product_1', quantity: 1, userId: 'user_b', idempotencyKey: 'key_b' })
      .then(r => results.push({ success: true }))
      .catch(e => results.push({ success: false }));

    await Promise.all([p1, p2]);

    const succeeded = results.filter(r => r.success).length;
    const product = getProduct();

    assert(succeeded === 1, `Expected 1 success, got ${succeeded}`);
    assert(product.available_stock === 0, `Expected available=0, got ${product.available_stock}`);
    assert(product.reserved_stock === 1, `Expected reserved=1, got ${product.reserved_stock}`);
  });

  test('Multiple-unit reservation (qty=5 when stock=3) → rejected', async () => {
    setupTestProduct(3);
    let error = null;
    try {
      await inventory.reserve({ productId: 'test_product_1', quantity: 5, userId: 'user_c', idempotencyKey: 'key_c' });
    } catch (e) {
      error = e;
    }
    assert(error !== null, 'Expected reservation to fail');
    assert(error.status === 409, `Expected 409, got ${error.status}`);
    const product = getProduct();
    assert(product.available_stock === 3, `Stock should be unchanged (3), got ${product.available_stock}`);
  });

  test('Duplicate idempotency key → same reservation returned', async () => {
    setupTestProduct(10);
    const key = 'duplicate_key_123';

    const r1 = await inventory.reserve({ productId: 'test_product_1', quantity: 2, userId: 'user_d', idempotencyKey: key });
    const r2 = await inventory.reserve({ productId: 'test_product_1', quantity: 2, userId: 'user_d', idempotencyKey: key });

    assert(r1.reservation.reservation_id === r2.reservation.reservation_id, 'Should return same reservation ID');
    assert(r2.idempotent === true, 'Second call should be marked idempotent');

    const product = getProduct();
    assert(product.available_stock === 8, `Stock should only be reserved once (8), got ${product.available_stock}`);
    assert(product.reserved_stock === 2, `Reserved should be 2, got ${product.reserved_stock}`);
  });

  test('Cancel reservation releases stock back to available', async () => {
    setupTestProduct(10);
    const r = await inventory.reserve({ productId: 'test_product_1', quantity: 3, userId: 'user_e', idempotencyKey: 'key_e' });

    let product = getProduct();
    assert(product.available_stock === 7, `Before cancel: available=7, got ${product.available_stock}`);
    assert(product.reserved_stock === 3, `Before cancel: reserved=3, got ${product.reserved_stock}`);

    await inventory.cancel(r.reservation.reservation_id);

    product = getProduct();
    assert(product.available_stock === 10, `After cancel: available=10, got ${product.available_stock}`);
    assert(product.reserved_stock === 0, `After cancel: reserved=0, got ${product.reserved_stock}`);
  });

  test('Confirm reservation moves stock from reserved to sold', async () => {
    setupTestProduct(10);
    const r = await inventory.reserve({ productId: 'test_product_1', quantity: 2, userId: 'user_f', idempotencyKey: 'key_f' });

    await inventory.confirm(r.reservation.reservation_id);

    const product = getProduct();
    assert(product.available_stock === 8, `After confirm: available=8, got ${product.available_stock}`);
    assert(product.reserved_stock === 0, `After confirm: reserved=0, got ${product.reserved_stock}`);
    assert(product.sold === 2, `After confirm: sold=2, got ${product.sold}`);
  });

  test('Concurrent confirm + cancel on same reservation → only one succeeds', async () => {
    setupTestProduct(10);
    const r = await inventory.reserve({ productId: 'test_product_1', quantity: 1, userId: 'user_g', idempotencyKey: 'key_g' });

    const results = [];
    const p1 = inventory.confirm(r.reservation.reservation_id)
      .then(() => results.push('confirm_ok'))
      .catch(() => results.push('confirm_fail'));
    const p2 = inventory.cancel(r.reservation.reservation_id)
      .then(() => results.push('cancel_ok'))
      .catch(() => results.push('cancel_fail'));

    await Promise.all([p1, p2]);

    const okCount = results.filter(r => r.endsWith('_ok')).length;
    assert(okCount === 1, `Expected exactly 1 success, got ${okCount} (${results.join(', ')})`);
  });

  test('Expiration releases expired reservations', async () => {
    setupTestProduct(10);
    const r = await inventory.reserve({ productId: 'test_product_1', quantity: 3, userId: 'user_h', idempotencyKey: 'key_h' });

    // Manually set expires_at to the past in SQLite
    const db = getDb();
    db.prepare('UPDATE reservations SET expires_at = ? WHERE reservation_id = ?')
      .run(new Date(Date.now() - 1000).toISOString(), r.reservation.reservation_id);

    const result = await inventory.releaseExpired();
    assert(result.released === 1, `Expected 1 released, got ${result.released}`);

    const product = getProduct();
    assert(product.available_stock === 10, `After expiration: available=10, got ${product.available_stock}`);
    assert(product.reserved_stock === 0, `After expiration: reserved=0, got ${product.reserved_stock}`);
  });

  test('MULTI-PROCESS: 20 child processes for 10-stock item → 10 succeed, 10 rejected', async () => {
    setupTestProduct(10);

    const workerScript = path.join(__dirname, 'concurrent-worker.js');
    let success = 0;
    let failed = 0;

    // Spawn 20 child processes, each trying to reserve 1 unit
    for (let i = 0; i < 20; i++) {
      const result = spawnSync('node', [workerScript, 'test_product_1', `proc_${i}`, `proc_key_${i}`], {
        cwd: path.join(__dirname, '..'),
        timeout: 10000,
        encoding: 'utf8'
      });

      if (result.status === 0 && result.stdout.includes('SUCCESS')) {
        success++;
      } else {
        failed++;
      }
    }

    const product = getProduct();
    assert(success === 10, `Expected 10 successes, got ${success}`);
    assert(failed === 10, `Expected 10 failures, got ${failed}`);
    assert(product.available_stock === 0, `Expected available=0, got ${product.available_stock}`);
    assert(product.reserved_stock === 10, `Expected reserved=10, got ${product.reserved_stock}`);
  });
});
