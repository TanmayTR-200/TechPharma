'use strict';

// One-off: compare a collection in PostgreSQL against MongoDB, so rows left
// behind by the earlier data/*.json import can be identified precisely.
//
//   node scripts/compare-with-mongo.js carts notifications
//
// Read-only. Prints what is in PostgreSQL, what MongoDB has, and which rows
// exist only in PostgreSQL.

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { getPool, closePool } = require('../src/db/postgres');

const COLLECTIONS = process.argv.slice(2);

function toId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  return String(value);
}

(async () => {
  if (!COLLECTIONS.length) {
    console.error('usage: node scripts/compare-with-mongo.js <collection> [...]');
    process.exit(1);
  }
  if (!process.env.MONGODB_DATABASE) {
    console.error('MONGODB_DATABASE is not set (e.g. - set it to "test").');
    process.exit(1);
  }

  // Same SRV workaround as migrate-mongo-to-postgres.js: some networks cannot
  // resolve the `_mongodb._tcp.*` SRV record, so a direct shard URI is used when
  // MONGODB_DIRECT_HOST is set.
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

  try {
    for (const name of COLLECTIONS) {
      // carts is keyed by user_id; everything else by id.
      const keyColumn = name === 'carts' ? 'user_id' : 'id';
      const pg = await pool.query('SELECT ' + keyColumn + ' AS k FROM ' + name);
      const pgIds = new Set(pg.rows.map((r) => String(r.k)));
      const mongoDocs = await src.collection(name).find({}).toArray();
      const mongoIds = new Set(mongoDocs.map((d) => toId(name === 'carts' ? (d.userId || d._id) : d._id)));

      const onlyPg = [...pgIds].filter((id) => !mongoIds.has(id));
      const onlyMongo = [...mongoIds].filter((id) => !pgIds.has(id));

      console.log('\n=== ' + name + ' ===');
      console.log('  PostgreSQL rows: ' + pgIds.size + '   MongoDB docs: ' + mongoIds.size);
      console.log('  only in PostgreSQL (stale from the JSON import): ' + onlyPg.length);
      for (const id of onlyPg) {
        const detail = await pool.query(
          'SELECT * FROM ' + name + ' WHERE ' + keyColumn + ' = $1', [id]);
        console.log('    - ' + id + '  ' + JSON.stringify(detail.rows[0]).slice(0, 200));
      }
      if (!onlyPg.length) console.log('    (none)');
      console.log('  only in MongoDB (never migrated): ' + onlyMongo.length);
      for (const id of onlyMongo) console.log('    + ' + id);
    }
  } catch (err) {
    console.error('ERR', err.message);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
    await mongo.close().catch(() => {});
  }
  process.exit(0);
})();
