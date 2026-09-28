'use strict';

// One-off repair for order_items rows that the first migration wrote empty.
//
// An order item stores its product as a NESTED snapshot -
// `{ product: { _id, name }, quantity, price, sellerId }`, the shape documented
// in src/db/orders.js - but the migration read the flat `item.productId` /
// `item.name` spellings instead. Every migrated row therefore landed with
// product_id = NULL and product_name = '', the orders API returned
// `product.name === ''`, and frontend/app/orders/page.tsx fell back to its
// literal 'Product' placeholder.
//
// The mapping is fixed in migrate-mongo-to-postgres.js; this script repairs the
// rows that were already imported. The snapshots are read back from MongoDB
// (which the migration never modifies - it remains the backup) and only rows
// that are still missing data are updated, so running it twice changes nothing.
//
// Usage:
//   node scripts/backfill-order-items.js [--dry-run]
//   (also wired up as: npm run db:backfill:order-items[:dry])
//
// Env: DATABASE_URL (target, required) and MONGODB_URI (source, required), plus
// the same MONGODB_DATABASE / MONGODB_DIRECT_HOST / MONGODB_REPLICA_SET
// overrides the migration understands (see the notes there about networks that
// cannot resolve the Atlas SRV record).

require('dotenv').config();

const { MongoClient } = require('mongodb');
const { getPool, closePool } = require('../src/db/postgres');

const DRY_RUN = process.argv.includes('--dry-run');

const report = {
  repaired: 0,
  unchanged: 0,
  warnings: [],
  skipped: [],
};

/** Mongo _id (ObjectId/number/string) -> TEXT key. Mirrors the migration helper. */
function toId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  return String(value);
}

/**
 * One MongoDB order item -> { productId, productName }.
 * Same extraction as `orderItemSnapshot` in migrate-mongo-to-postgres.js.
 */
function itemSnapshot(item) {
  const snap = item && typeof item.product === 'object' && item.product !== null
    ? item.product
    : {};
  const rawId = snap._id !== undefined
    ? snap._id
    : (item && item.productId !== undefined ? item.productId : null);
  const rawName = snap.name !== undefined
    ? snap.name
    : (item && item.name !== undefined ? item.name : (item && item.productName));
  return {
    productId: toId(rawId),
    productName: rawName === undefined || rawName === null ? '' : String(rawName),
  };
}

function printReport() {
  const bar = '-'.repeat(70);
  console.log('\n' + bar);
  console.log(DRY_RUN
    ? 'Order-item backfill report (DRY RUN - nothing was written)'
    : 'Order-item backfill report');
  console.log(bar);
  console.log('  repaired   ' + report.repaired + ' order_items row(s)');
  console.log('  unchanged  ' + report.unchanged + ' row(s) already complete');
  if (report.skipped.length) {
    console.log('\nSkipped (left as is):');
    for (const s of report.skipped) console.log('  ' + s.id + ': ' + s.reason);
  }
  if (report.warnings.length) {
    console.log('\nWarnings:');
    for (const w of report.warnings) console.log('  ' + w);
  }
  console.log(bar + '\n');
}

// The repair pass.

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[backfill] DATABASE_URL is not set - nothing to repair.');
    process.exitCode = 1;
    return;
  }
  if (!process.env.MONGODB_URI) {
    console.error('[backfill] MONGODB_URI is not set - no source snapshots to read.');
    process.exitCode = 1;
    return;
  }

  // Some networks cannot answer the `_mongodb._tcp.<cluster>` SRV query; the
  // migration documents this and falls back to a direct host. Same fallback
  // here so both scripts behave identically.
  const directHost = process.env.MONGODB_DIRECT_HOST;
  const replicaSet = process.env.MONGODB_REPLICA_SET;
  let mongoUri = process.env.MONGODB_URI;
  if (/^mongodb\+srv:\/\//.test(mongoUri) && directHost) {
    const u = new URL(mongoUri.replace('mongodb+srv://', 'mongodb://'));
    const auth = u.username ? u.username + ':' + encodeURIComponent(u.password) + '@' : '';
    mongoUri = 'mongodb://' + auth + directHost
      + '/?authSource=admin&tls=true'
      + (replicaSet ? '&replicaSet=' + encodeURIComponent(replicaSet) : '');
    console.log('[backfill] using a direct (non-SRV) URI to bypass the blocked SRV lookup');
  }

  const mongo = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 20000,
    tlsAllowInvalidCertificates: true,
  });
  let pool = null;

  try {
    await mongo.connect();
    const src = process.env.MONGODB_DATABASE
      ? mongo.db(process.env.MONGODB_DATABASE)
      : mongo.db();
    const docs = await src.collection('orders').find({}).toArray();
    console.log('[backfill] source database: ' + src.databaseName
      + ' (' + docs.length + ' orders)');

    pool = getPool();
    const { rows: productRows } = await pool.query('SELECT id FROM products');
    const productIds = new Set(productRows.map((r) => toId(r.id)));

    for (const doc of docs) {
      const orderId = toId(doc._id !== undefined ? doc._id : doc.id);
      if (!orderId) continue;
      const sourceItems = Array.isArray(doc.items) ? doc.items : [];

      const { rows } = await pool.query(
        'SELECT id, product_id, product_name FROM order_items '
        + 'WHERE order_id = $1 ORDER BY id',
        [orderId]
      );

      if (rows.length === 0) {
        report.skipped.push({ id: orderId, reason: 'no order_items rows (order not imported)' });
        continue;
      }
      // The migration deletes and re-inserts the children in document order, so
      // position i of `ORDER BY id` is item i of the MongoDB document. A count
      // mismatch means that assumption does not hold for this order: report it
      // rather than guess and write the wrong snapshot onto a line.
      if (rows.length !== sourceItems.length) {
        report.skipped.push({
          id: orderId,
          reason: 'order_items count ' + rows.length + ' != MongoDB items '
            + sourceItems.length + ' - cannot pair safely',
        });
        continue;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const snap = itemSnapshot(sourceItems[i]);
        if (row.product_id && row.product_name) {
          report.unchanged++;
          continue;
        }

        // order_items.product_id is a FK: only link a product that exists.
        let link = snap.productId;
        if (link && !productIds.has(link)) {
          report.warnings.push('order ' + orderId + ' item ' + row.id + ': product ' + link
            + ' is not in products - product_id not linked');
          link = null;
        }
        if (!link && !snap.productName) {
          report.warnings.push('order ' + orderId + ' item ' + row.id
            + ': MongoDB snapshot has neither a product id nor a name - left as is');
          continue;
        }

        if (!DRY_RUN) {
          // COALESCE / CASE never overwrite a value that is already there, so a
          // re-run is a no-op and a newer checkout's snapshot is never lost.
          await pool.query(
            'UPDATE order_items SET product_id = COALESCE(product_id, $2), '
            + "product_name = CASE WHEN product_name = '' THEN $3 ELSE product_name END "
            + 'WHERE id = $1',
            [row.id, link, snap.productName]
          );
        }
        report.repaired++;
        console.log('  [' + (DRY_RUN ? 'would fix' : 'fixed') + '] order ' + orderId
          + ' item ' + row.id + ' -> ' + (link || '(no product)')
          + ' / "' + snap.productName + '"');
      }
    }

    printReport();
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    if (/querySrv|SRV/i.test(detail) && !directHost) {
      console.error('[backfill] this network cannot resolve MongoDB SRV records:');
      console.error('[backfill]   $env:MONGODB_DIRECT_HOST="ac-XXXX-shard-00-00.XXXX.mongodb.net:27017"');
      console.error('[backfill]   $env:MONGODB_REPLICA_SET="atlas-XXXX-shard-0"');
    }
    console.error('[backfill] FAILED:', detail);
    process.exitCode = 1;
  } finally {
    if (pool) await closePool().catch(() => {});
    await mongo.close().catch(() => {});
  }
}

main();
