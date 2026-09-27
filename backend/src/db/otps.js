'use strict';

// OTP repository - owns the `otps` table (PostgreSQL) / data/otps.json (legacy).
//
// Signup and account-deletion codes belong to emails that may not have a user row
// yet, so this is a standalone store rather than a column on `users`.
//
// Both stores expose the same document shape to the routes:
//   { _id, email, purpose, otp, expiresAt }   // expiresAt is epoch milliseconds
// NOTE: expiresAt is a NUMBER (ms) because server.js compares `Date.now() > entry.expiresAt`.

const db = require('./postgres');
const legacy = require('./legacy');

const COLLECTION = 'otps';

function toExpiresAtMs(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function rowToEntry(row) {
  if (!row) return null;
  return {
    _id: row.id,
    email: row.email,
    purpose: row.purpose,
    otp: row.otp,
    expiresAt: toExpiresAtMs(row.expires_at),
  };
}

/**
 * Fetch a live (non-expired) OTP entry.
 * Mirrors getOtpEntry(): expired rows are invisible, not deleted.
 */
async function get(email, purpose) {
  const key = String(email).toLowerCase();

  if (db.isEnabled()) {
    const row = await db.queryOne(
      `SELECT id, email, purpose, otp, expires_at
         FROM otps
        WHERE email = $1 AND purpose = $2 AND expires_at > now()`,
      [key, purpose]
    );
    return rowToEntry(row);
  }

  const entries = legacy.read(COLLECTION).filter((e) => e.expiresAt > Date.now());
  return entries.find((e) => e.email === key && e.purpose === purpose) || null;
}

/**
 * Create or replace an OTP for (email, purpose) and prune expired entries.
 * Mirrors setOtpEntry().
 */
async function set(email, purpose, otp, ttlMs) {
  const key = String(email).toLowerCase();
  const expiresAt = Date.now() + ttlMs;

  if (db.isEnabled()) {
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM otps WHERE expires_at <= now()');
      await tx.query(
        `INSERT INTO otps (id, email, purpose, otp, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email, purpose) DO UPDATE
           SET otp = EXCLUDED.otp,
               expires_at = EXCLUDED.expires_at`,
        [`${key}__${purpose}`, key, purpose, String(otp), new Date(expiresAt).toISOString()]
      );
    });
    return;
  }

  const entries = legacy
    .read(COLLECTION)
    .filter((e) => !(e.email === key && e.purpose === purpose) && e.expiresAt > Date.now());
  entries.push({ _id: `${key}__${purpose}`, email: key, purpose, otp, expiresAt });
  legacy.write(COLLECTION, entries);
}

/** Delete one (email, purpose) entry. Mirrors deleteOtpEntry(). */
async function remove(email, purpose) {
  const key = String(email).toLowerCase();

  if (db.isEnabled()) {
    await db.query('DELETE FROM otps WHERE email = $1 AND purpose = $2', [key, purpose]);
    return;
  }

  legacy.write(
    COLLECTION,
    legacy.read(COLLECTION).filter((e) => !(e.email === key && e.purpose === purpose))
  );
}

/** Housekeeping: drop expired codes (used by tests and future cron jobs). */
async function pruneExpired() {
  if (db.isEnabled()) {
    const result = await db.query('DELETE FROM otps WHERE expires_at <= now()');
    return result.rowCount;
  }
  const before = legacy.read(COLLECTION);
  const kept = before.filter((e) => e.expiresAt > Date.now());
  if (kept.length !== before.length) legacy.write(COLLECTION, kept);
  return before.length - kept.length;
}

module.exports = { get, set, remove, pruneExpired };
