'use strict';

// Simple, maintainable PostgreSQL migration runner.
//
//   migrations/001_initial_schema.sql
//   migrations/002_indexes.sql
//   migrations/003_constraints.sql
//
// Applied files are recorded in `schema_migrations` (version + checksum), so the
// runner is idempotent and safe to call on every boot. Each file runs inside its
// own transaction: a failing migration leaves the database exactly as it was.
//
// Usage:
//   npm run db:migrate                 (uses DATABASE_URL)
//   const { runMigrations } = require('./src/db/migrate'); await runMigrations();

// Loaded here too (not only in server.js) so the documented `npm run db:migrate`
// CLI picks up backend/.env - it used to abort with "DATABASE_URL environment
// variable is not set" unless the caller exported the URL by hand.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getPool } = require('./postgres');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // 001_..., 002_..., 003_... - lexicographic order is the intended order
}

function checksum(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex');
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      checksum   TEXT,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function loadApplied(client) {
  const { rows } = await client.query('SELECT version, checksum FROM schema_migrations');
  return new Map(rows.map((r) => [r.version, r.checksum]));
}

/**
 * Apply every pending migration in order.
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<{ applied: string[], skipped: string[] }>}
 */
async function runMigrations(options = {}) {
  const log = options.silent ? () => {} : (...args) => console.log(...args);
  const pool = getPool();
  // Checked out lazily rather than held for the whole migration, so a DNS blip
  // mid-run (common on Windows with a flaky resolver) does not abort the
  // migration after some migrations have already been applied.
  const client = await pool.connect();
  const applied = [];
  const skipped = [];

  try {
    await ensureMigrationsTable(client);
    const done = await loadApplied(client);

    for (const file of listMigrationFiles()) {
      const version = file.replace(/\.sql$/, '');
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const sum = checksum(sql);

      if (done.has(version)) {
        if (done.get(version) !== sum) {
          // Never silently re-apply: the file was edited after being applied.
          console.warn(
            `[migrate] ${file} changed after it was applied - create a new migration ` +
            'instead of editing an applied one'
          );
        }
        skipped.push(version);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [version, sum]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        err.message = `Migration ${file} failed: ${err.message}`;
        throw err;
      }

      applied.push(version);
      log(`[migrate] applied ${file}`);
    }

    if (applied.length === 0) log('[migrate] database already up to date');
    return { applied, skipped };
  } finally {
    client.release();
  }
}

/**
 * Which migrations are pending / applied - handy for the health endpoint.
 * @returns {Promise<{ pending: string[], applied: string[] }>}
 */
async function migrationStatus() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const done = await loadApplied(client);
    const pending = [];
    const applied = [];
    for (const file of listMigrationFiles()) {
      const version = file.replace(/\.sql$/, '');
      (done.has(version) ? applied : pending).push(version);
    }
    return { pending, applied };
  } finally {
    client.release();
  }
}

module.exports = { runMigrations, migrationStatus, listMigrationFiles, MIGRATIONS_DIR };

// CLI entry point: `node src/db/migrate.js`
if (require.main === module) {
  const { closePool } = require('./postgres');
  runMigrations()
    .then(({ applied, skipped }) => {
      console.log(
        `[migrate] done - ${applied.length} applied, ${skipped.length} already up to date`
      );
      return closePool();
    })
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('[migrate]', err.message);
      try { await closePool(); } catch (e) { /* ignore */ }
      process.exit(1);
    });
}
