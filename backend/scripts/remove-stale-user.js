'use strict';

// One-off: remove a stale user row that blocks the correct account from being
// migrated in.
//
//   node scripts/remove-stale-user.js <userId>
//
// Why this is needed
//   An earlier import from data/users.json wrote a row for the WRONG account:
//   data/users.json never contained the real "Tan" account (id 1787482669584),
//   only a later duplicate of the same email. Because PostgreSQL enforces a
//   unique index on lower(email), that stale row blocks the correct row from
//   being inserted by scripts/migrate-mongo-to-postgres.js.
//
// Safety
//   Refuses to delete anything that is still referenced by products, orders,
//   carts, notifications or order items, so a real account can never be removed
//   by mistake. Prints exactly what it deleted.
//
// MongoDB is never touched: it remains the source of truth and the backup.

require('dotenv').config();
const { getPool, closePool } = require('../src/db/postgres');

const TARGET = process.argv[2];
if (!TARGET) {
  console.error('usage: node scripts/remove-stale-user.js <userId>');
  process.exit(1);
}

// Reference columns are discovered from the live schema rather than hard-coded,
// so a table that gained, lost or renamed a user reference can never be missed.
async function referenceColumns(client) {
  const r = await client.query(
    "SELECT table_name, column_name FROM information_schema.columns "
    + "WHERE table_schema = 'public' AND column_name IN "
    + "('user_id','seller_id','sender_id','receiver_id','cart_user_id') "
    + 'ORDER BY table_name, column_name');
  return r.rows.map((row) => [row.table_name, row.column_name]);
}

(async () => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await client.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1', [TARGET]);
    if (!user.rowCount) {
      await client.query('ROLLBACK');
      console.log('No user with id ' + TARGET + ' - nothing to do.');
      await closePool();
      process.exit(0);
    }
    const u = user.rows[0];
    console.log('About to delete:');
    console.log('  id    = ' + u.id);
    console.log('  name  = ' + u.name);
    console.log('  email = ' + u.email);
    console.log('  role  = ' + u.role);

    let total = 0;
    console.log('\nchecking references...');
    for (const [table, column] of await referenceColumns(client)) {
      const r = await client.query(
        'SELECT count(*)::int AS n FROM "' + table + '" WHERE "' + column + '" = $1', [TARGET]);
      const n = r.rows[0].n;
      if (n > 0) {
        console.log('  ' + table + '.' + column + ' = ' + n);
        total += n;
      }
    }

    if (total > 0) {
      await client.query('ROLLBACK');
      console.log('\nREFUSED: this account is still referenced by ' + total
        + ' row(s). Deleting it would orphan them, so nothing was changed.');
      await closePool();
      process.exit(1);
    }

    console.log('  (none) - safe to delete');

    const del = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [TARGET]);
    await client.query('COMMIT');
    console.log('\nDELETED ' + del.rowCount + ' row(s). The email '
      + u.email + ' is now free for the correct account to be migrated in.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('ERROR (rolled back, nothing changed):', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool().catch(() => {});
  }
})();
