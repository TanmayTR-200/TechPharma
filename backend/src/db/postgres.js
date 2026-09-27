// PostgreSQL database module for TechPharma backend
// Provides connection pool, query helpers, transaction support, and graceful shutdown.

const { Pool } = require('pg');

let pool = null;
let isShuttingDown = false;

/**
 * Is PostgreSQL configured for this process?
 *
 * The migration is incremental: when DATABASE_URL is absent the application keeps
 * using the legacy JSON/cache storage so every phase stays deployable. Setting
 * DATABASE_URL switches the migrated domains over to PostgreSQL as the source of
 * truth. Set PG_DISABLED=true to force the legacy path even with a URL present
 * (used by tests and as an emergency rollback switch).
 *
 * @returns {boolean}
 */
function isEnabled() {
  return !!process.env.DATABASE_URL && process.env.PG_DISABLED !== 'true';
}

/**
 * Get or create the PostgreSQL connection pool.
 * Uses DATABASE_URL from environment (or individual PG* vars).
 */
function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Hosted providers (Neon / Supabase / Render) mandate TLS. Enable it when
  // the URL asks for it (?sslmode=require), via PG_SSL=true, or in
  // production. rejectUnauthorized stays false to tolerate self-signed /
  // proxy certs on free tiers (same posture as the previous production
  // setting).
  //
  // Two exceptions, both of which only ever apply to a database that is not
  // reachable over a network:
  //   * loopback hosts (localhost / 127.0.0.1 / [::1] / host.docker.internal)
  //     - used by the local docker-compose stack, whose postgres image has no
  //     TLS configured. Connecting with ssl:true to it fails outright with
  //     "The server does not support SSL connections".
  //   * PG_SSL=false - an explicit opt-out, so an operator can always turn TLS
  //     off (e.g. a private-network proxy that terminates TLS itself).
  const isLoopback = /@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)(:|\/|$)/i
    .test(connectionString || '');
  const wantsSsl = /[?&]sslmode=(require|prefer|verify-ca|verify-full)(&|$)/i.test(connectionString || '')
    || process.env.PG_SSL === 'true'
    || (process.env.NODE_ENV === 'production' && process.env.PG_SSL !== 'false');
  const useSsl = !isLoopback && (wantsSsl || process.env.PG_SSL === 'true');

  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT) || 5000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('[postgres] Unexpected pool error:', err.message);
  });

  console.log('[postgres] Connection pool created');
  return pool;
}

/**
 * Execute a simple query with parameters.
 * @param {string} text - SQL query with $1, $2 placeholders
 * @param {any[]} params - Parameter values
 * @returns {Promise<{rows: any[], rowCount: number}>}
 */
async function query(text, params) {
  const client = getPool();
  const start = Date.now();
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    if (process.env.PG_DEBUG === 'true') {
      console.log('[postgres] Query:', text, 'params:', params, `(${duration}ms)`);
    }
    return result;
  } catch (err) {
    console.error('[postgres] Query error:', err.message);
    console.error('[postgres] Query:', text, 'params:', params);
    throw err;
  }
}

/**
 * Execute a query and return the first row only.
 * @param {string} text
 * @param {any[]} params
 * @returns {Promise<any|null>}
 */
async function queryOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows.
 * @param {string} text
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
async function queryMany(text, params) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * Run a callback inside a PostgreSQL transaction.
 * The callback receives a client with query/one/many methods.
 * Commits on success, rolls back on error.
 *
 * Multi-step business operations (create order -> order items -> stock decrement,
 * password change -> password history, ...) MUST go through this helper so a
 * partial failure cannot leave inconsistent data.
 *
 * @param {Function} callback - async (tx) => { ... }
 * @param {{ isolationLevel?: string }} [options] - e.g. 'SERIALIZABLE'
 * @returns {Promise<any>}
 */
async function transaction(callback, options = {}) {
  const client = getPool();
  const pgClient = await client.connect();
  try {
    if (options.isolationLevel) {
      await pgClient.query(`BEGIN ISOLATION LEVEL ${options.isolationLevel}`);
    } else {
      await pgClient.query('BEGIN');
    }

    // Transaction-scoped helpers
    const tx = {
      query: (text, params) => pgClient.query(text, params),
      queryOne: async (text, params) => {
        const result = await pgClient.query(text, params);
        return result.rows[0] || null;
      },
      queryMany: async (text, params) => {
        const result = await pgClient.query(text, params);
        return result.rows;
      },
    };

    const result = await callback(tx);
    await pgClient.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await pgClient.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[postgres] Rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    pgClient.release();
  }
}

/**
 * Gracefully close the connection pool.
 * Call on SIGTERM / SIGINT.
 */
async function closePool() {
  if (pool && !isShuttingDown) {
    isShuttingDown = true;
    console.log('[postgres] Closing connection pool...');
    await pool.end();
    pool = null;
    isShuttingDown = false; // allow a later getPool() to reconnect (tests, restarts)
    console.log('[postgres] Connection pool closed');
  }
}

// The application owns its lifecycle: server.js calls closePool() from its
// SIGTERM/SIGINT handler. This module deliberately does NOT install signal
// handlers of its own, so requiring it can never terminate a process by surprise.

/**
 * Check if the database is reachable.
 * @returns {Promise<boolean>}
 */
async function healthCheck() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  isEnabled,
  getPool,
  query,
  queryOne,
  queryMany,
  transaction,
  closePool,
  healthCheck,
};