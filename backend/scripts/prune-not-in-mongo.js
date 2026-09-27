'use strict';

// Remove rows that exist in PostgreSQL but not in MongoDB, so PostgreSQL holds
// exactly the live dataset.
//
//   node scripts/prune-not-in-mongo.js            # dry run: reports only
//   node scripts/prune-not-in-mongo.js --apply    # actually deletes
//
// Why
//   The first import read the legacy data/*.json files, which were only ever
//   used for local development. The application actually ran on MongoDB, so
//   MongoDB is the authoritative dataset. A migration that only inserts and
//   updates therefore leaves JSON-only rows behind (an extra cart, welcome
//   notifications for accounts that no longer exist).
//
// Safety
//   * Dry run by default; --apply is required to delete anything.
//   * Only rows whose id is absent from MongoDB are touched. A row that exists
//     in MongoDB is never removed, so real data cannot be lost.
//   * Every deletion is listed with its contents before it happens.
//   * One transaction: if anything fails, nothing is deleted.
//   * MongoDB is only ever read.
//
// Key columns
//   carts is keyed by user_id, every other collection by id.

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { getPool, closePool } = require('../src/db/postgres');

const APPLY = process.argv.includes('--apply');

// [collection, key column, how to derive the id from a Mongo document]
//
// Only collections where MongoDB is genuinely the complete record are listed.
//
// Deliberately EXCLUDED:
//   messages         - MongoDB's messages collection is EMPTY while PostgreSQL
//                      holds months of real conversation history. Pruning it
//                      would destroy chat history that Mongo never captured.
//   inventory_stock  - this table does not exist in MongoDB at all, so there is
//                      nothing to compare against; it is PostgreSQL-only state.
//   reservations     - likewise absent from MongoDB.
//   saved_addresses / password_history / users - the source of truth for these
//                      is the application, not a Mongo collection that is only
//                      partially populated.
const COLLECTIONS = [
  ['carts', 'user_id', (d) => (d.userId !== undefined ? d.userId : d._id)],
  ['cart_items', 'cart_user_id', (d) => (d.userId !== undefined ? d.userId : d._id)],
  ['orders', 'id', (d) => d._id],
  ['notifications', 'id', (d) => d._id],
  ['products', 'id', (d) => d._id],
];

function toId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  return String(value);
}

(async () => {
  if (!process.env.MONGODB_DATABASE) {
    console.error('MONGODB_DATABASE is not set (this project uses "test").');
    process.exit(1);
  }

  let mongoUri = process.env.MONGODB_URI;
  if (/^mongodb\+srv:\/\//.test(mongoUri) && process.env.MONGODB_DIRECT_HOST) {
    const u = new URL(mongoUri.replace('mongodb+srv://', 'mongodb://'));
    const auth = u.username ? u.username + ':' + encodeURIComponent(u.password) + '@' : '';
    mongoUri = 'mongodb://' + auth + process.env.MONGODB_DIRECT_HOST
      + '/?authSource=admin&tls=true'
      + (process.env.MONGODB_REPLICA_SET
        ? '&replicaSet=' + encodeURIComponent(process.env.MONGODB_REPLICA_SET) : '');
  }

  const mongo = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 20000,
    tlsAllowInvalidCertificates: true,
  });
  await mongo.connect();
  const src = mongo.db(process.env.MONGODB_DATABASE);
  const pool = getPool();
  const client = await pool.connect();

  let totalDeleted = 0;
  try {
    await client.query('BEGIN');

    for (const [table, keyColumn, derive] of COLLECTIONS) {
      // order_items.id is BIGSERIAL, so it can never match a Mongo _id. Its
      // rows are pruned by order instead, below.
      if (table === 'order_items') continue;

      const mongoDocs = await src.collection(table).find({}).toArray();
      const mongoIds = new Set(mongoDocs.map((d) => toId(derive(d))));

      const pgRows = await client.query('SELECT * FROM "' + table + '"');
      const stale = pgRows.rows.filter((r) => !mongoIds.has(toId(r[keyColumn])));
      if (!stale.length) continue;

      console.log('\n=== ' + table + ' (' + stale.length + ' row(s) not in MongoDB) ===');
      for (const r of stale) {
        const brief = {};
        for (const [k, v] of Object.entries(r)) {
          brief[k] = typeof v === 'string' && v.length > 60 ? v.slice(0, 60) + '...' : v;
        }
        console.log('  ' + keyColumn + '=' + r[keyColumn] + '  ' + JSON.stringify(brief).slice(0, 220));
      }

      if (!APPLY) continue;
      for (const r of stale) {
        await client.query('DELETE FROM "' + table + '" WHERE "' + keyColumn + '" = $1',
          [r[keyColumn]]);
        totalDeleted++;
      }
    }

    // order_items belong to orders: drop any whose order no longer exists.
    const keptOrders = new Set(
      (await client.query('SELECT id FROM orders')).rows.map((r) => toId(r.id)));
    const itemRows = await client.query('SELECT id, order_id, product_name FROM order_items');
    const orphanItems = itemRows.rows.filter((r) => !keptOrders.has(toId(r.order_id)));
    if (orphanItems.length) {
      console.log('\n=== order_items (' + orphanItems.length + ' orphaned) ===');
      for (const r of orphanItems) {
        console.log('  id=' + r.id + '  order_id=' + r.order_id + '  ' + r.product_name);
      }
      if (APPLY) {
        for (const r of orphanItems) {
          await client.query('DELETE FROM order_items WHERE id = $1', [r.id]);
          totalDeleted++;
        }
      }
    }

    if (APPLY) {
      await client.query('COMMIT');
      console.log('\nCOMMITTED - ' + totalDeleted + ' row(s) deleted.');
    } else {
      await client.query('ROLLBACK');
      console.log('\nDRY RUN - nothing deleted. Re-run with --apply to make these changes.');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('ERROR (rolled back, nothing changed):', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool().catch(() => {});
    await mongo.close().catch(() => {});
  }
})();
