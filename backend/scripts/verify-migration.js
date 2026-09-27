'use strict';

// One-off: print the migrated state, so the result can be verified at a glance.

require('dotenv').config();
const { getPool, closePool } = require('../src/db/postgres');

(async () => {
  const pool = getPool();

  const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY id');
  console.log('USERS (' + users.rowCount + '):');
  for (const r of users.rows) {
    console.log('  ' + r.id.padEnd(22) + String(r.email).padEnd(34) + r.name);
  }

  const products = await pool.query(
    'SELECT p.id, p.name, p.price, COALESCE(u.email, \'(NO OWNER)\') AS owner '
    + 'FROM products p LEFT JOIN users u ON u.id = p.seller_id ORDER BY p.id');
  console.log('\nPRODUCTS (' + products.rowCount + '):');
  for (const r of products.rows) {
    console.log('  ' + r.id.padEnd(20) + r.name.padEnd(24) + r.owner);
  }

  const counts = await pool.query(
    'SELECT (SELECT count(*) FROM orders)::int AS orders, '
    + '(SELECT count(*) FROM order_items)::int AS order_items, '
    + '(SELECT count(*) FROM carts)::int AS carts, '
    + '(SELECT count(*) FROM cart_items)::int AS cart_items, '
    + '(SELECT count(*) FROM notifications)::int AS notifications, '
    + '(SELECT count(*) FROM inventory_stock)::int AS inventory_stock');
  console.log('\nOTHER TABLES: ' + JSON.stringify(counts.rows[0]));

  // The Tan account specifically.
  const tan = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE lower(email) = $1',
    ['tanmaytr95@gmail.com']);
  console.log('\ntanmaytr95@gmail.com:');
  for (const r of tan.rows) {
    console.log('  id=' + r.id + '  name=' + r.name + '  role=' + r.role);
  }

  await closePool();
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
