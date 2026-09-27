'use strict';

// Data-access layer for the PostgreSQL migration.
//
// Routes ask this layer for data and never touch SQL or table layouts:
//
//   const { users, otps } = require('./src/db');
//   const user = await users.findByEmail(email);
//
// Each repository transparently uses PostgreSQL when DATABASE_URL is configured,
// and the legacy JSON/cache store otherwise - so every migration phase stays
// deployable and `npm test` keeps working without a database.

const postgres = require('./postgres');
const { runMigrations, migrationStatus } = require('./migrate');
const legacy = require('./legacy');
const users = require('./users');
const otps = require('./otps');
const products = require('./products');
const notifications = require('./notifications');
const orders = require('./orders');
const carts = require('./carts');
const messages = require('./messages');
const inventory = require('./inventory');

/** 'postgres' | 'json' - which store the repositories are using right now. */
function storeName() {
  return postgres.isEnabled() ? 'postgres' : 'json';
}

module.exports = {
  postgres,
  runMigrations,
  migrationStatus,
  legacy,
  users,
  otps,
  products,
  notifications,
  orders,
  carts,
  messages,
  inventory,
  isPostgresEnabled: postgres.isEnabled,
  storeName,
};
