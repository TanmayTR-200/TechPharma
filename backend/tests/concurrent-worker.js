// Worker process for multi-process concurrency testing.
// Spawned by inventory.test.js — each instance tries to reserve 1 unit.
// Proves that SQLite's transaction + conditional UPDATE prevents overselling
// across separate Node processes (not just within a single event loop).

const path = require('path');

// Use the same test DB as the parent test
process.env.SQLITE_PATH = path.join(__dirname, '../data/test_inventory.db');

const inventory = require('../src/inventory/reservation');

const productId = process.argv[2];
const userId = process.argv[3];
const idempotencyKey = process.argv[4];

(async () => {
  try {
    const result = await inventory.reserve({
      productId,
      quantity: 1,
      userId,
      idempotencyKey
    });
    console.log('SUCCESS:' + result.reservation.reservation_id);
    process.exit(0);
  } catch (e) {
    console.log('FAILED:' + (e.status || 500));
    process.exit(1);
  }
})();
