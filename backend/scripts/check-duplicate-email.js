'use strict';

// One-off: report the state of the duplicate-email problem in PostgreSQL.
// Read-only: prints the unique constraints and the rows holding an email.

require('dotenv').config();
const { getPool, closePool } = require('../src/db/postgres');

const EMAIL = process.argv[2] || 'tanmaytr95@gmail.com';

(async () => {
  const pool = getPool();
  const uniq = await pool.query(
    "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint "
    + "WHERE conrelid = 'users'::regclass AND contype = 'u'");
  console.log('UNIQUE constraints on users:');
  for (const r of uniq.rows) console.log('  ' + r.conname + ' :: ' + r.def);

  const rows = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE lower(email) = $1 ORDER BY id',
    [EMAIL.toLowerCase()]);
  console.log('\nrows holding ' + EMAIL + ':');
  if (!rows.rowCount) console.log('  (none)');
  for (const r of rows.rows) {
    console.log('  id=' + r.id + '  name=' + r.name + '  created=' + r.created_at);
  }

  // What depends on these ids, so nothing is orphaned by a delete.
  const ids = rows.rows.map((r) => r.id);
  if (ids.length) {
    console.log('\nreferences to those ids:');
    const checks = [
      ['products', 'seller_id'],
      ['orders', 'user_id'],
      ['carts', 'user_id'],
      ['notifications', 'user_id'],
      ['order_items', 'seller_id'],
    ];
    for (const [table, column] of checks) {
      const n = await pool.query('SELECT count(*)::int AS n FROM ' + table + ' WHERE ' + column + ' = ANY($1)', [ids]);
      if (n.rows[0].n > 0) console.log('  ' + table + '.' + column + ' = ' + n.rows[0].n);
    }
  }
  await closePool();
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
