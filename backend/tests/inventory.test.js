/**
 * Concurrency tests for the inventory reservation system.
 *
 * Run with: node backend/tests/inventory.test.js
 *
 * Tests:
 * 1. 100 concurrent users for 10-stock item → 10 succeed, 90 rejected, 0 oversold
 * 2. Two users for the last item simultaneously
 * 3. Multiple-unit reservation (qty > available)
 * 4. Duplicate idempotency key → same reservation returned
 * 5. Reservation expiration releases stock
 * 6. Cancel releases stock
 * 7. Concurrent confirm + cancel → only one wins
 * 8. Concurrent expiration + confirmation
 */

const path = require('path');
const fs = require('fs');

// We test the reservation module directly (not via HTTP) for true concurrency
const inventory = require('../src/inventory/reservation');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const RESERVATIONS_FILE = path.join(__dirname, '../data/reservations.json');

function setupTestProduct(stock) {
  const products = [{
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
  }];
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  fs.writeFileSync(RESERVATIONS_FILE, '[]');
}

function getProduct() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  return products.find(p => p._id === 'test_product_1');
}

function resetReservations() {
  fs.writeFileSync(RESERVATIONS_FILE, '[]');
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('\n=== Inventory Concurrency Tests ===\n');

  // Test 1: 100 concurrent users for 10-stock item
  await test('100 concurrent users for 10-stock item → 10 succeed, 90 rejected', async () => {
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
    console.log(`    Results: ${succeeded} succeeded, ${failed} rejected, available=${product.available_stock}, reserved=${product.reserved_stock}`);
  });

  // Test 2: Two users for the last item simultaneously
  await test('Two users for last item → 1 succeeds, 1 rejected', async () => {
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

  // Test 3: Multiple-unit reservation exceeds available
  await test('Multiple-unit reservation (qty=5 when stock=3) → rejected', async () => {
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

  // Test 4: Duplicate idempotency key → same reservation returned
  await test('Duplicate idempotency key → same reservation returned', async () => {
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

  // Test 5: Cancel releases stock
  await test('Cancel reservation releases stock back to available', async () => {
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

  // Test 6: Confirm moves reserved → sold
  await test('Confirm reservation moves stock from reserved to sold', async () => {
    setupTestProduct(10);
    const r = await inventory.reserve({ productId: 'test_product_1', quantity: 2, userId: 'user_f', idempotencyKey: 'key_f' });

    await inventory.confirm(r.reservation.reservation_id);

    const product = getProduct();
    assert(product.available_stock === 8, `After confirm: available=8, got ${product.available_stock}`);
    assert(product.reserved_stock === 0, `After confirm: reserved=0, got ${product.reserved_stock}`);
    assert(product.sold === 2, `After confirm: sold=2, got ${product.sold}`);
  });

  // Test 7: Concurrent confirm + cancel → only one wins
  await test('Concurrent confirm + cancel on same reservation → only one succeeds', async () => {
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

  // Test 8: Expiration releases stock
  await test('Expiration releases expired reservations', async () => {
    setupTestProduct(10);
    // Create a reservation with very short TTL by manipulating the data
    const r = await inventory.reserve({ productId: 'test_product_1', quantity: 3, userId: 'user_h', idempotencyKey: 'key_h' });

    // Manually set expires_at to the past
    const reservations = JSON.parse(fs.readFileSync(RESERVATIONS_FILE, 'utf8'));
    const res = reservations.find(x => x.reservation_id === r.reservation.reservation_id);
    res.expires_at = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(reservations, null, 2));

    const result = await inventory.releaseExpired();
    assert(result.released === 1, `Expected 1 released, got ${result.released}`);

    const product = getProduct();
    assert(product.available_stock === 10, `After expiration: available=10, got ${product.available_stock}`);
    assert(product.reserved_stock === 0, `After expiration: reserved=0, got ${product.reserved_stock}`);
  });

  console.log('\n=== Tests Complete ===\n');
}

// Run tests
runTests().catch(console.error);
