'use strict';

// Users repository - owns the `users`, `password_history` and `saved_addresses`
// tables in PostgreSQL, and data/users.json while PostgreSQL is not configured.
//
// The API document shape (what routes receive) is identical in both modes:
//   { _id, email, password, name, role, phone, state, company, createdAt,
//     passwordChangedAt?, failedAttempts?, lockedUntil?, lastFailedAt?,
//     lastResetEmailAt?, resetToken?, passwordHistory?, savedAddresses? }
//
// Route code never sees a PostgreSQL row: camelCase mapping lives here.

const db = require('./postgres');
const legacy = require('./legacy');

const COLLECTION = 'users';
const HISTORY_LIMIT = 5; // mirrors PASSWORD_HISTORY_LIMIT in server.js

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function toIso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** PostgreSQL row -> API document. */
function rowToUser(row) {
  if (!row) return null;
  const doc = {
    _id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    role: row.role,
    phone: row.phone || '',
    state: row.state || '',
    company: row.company || null,
    createdAt: toIso(row.created_at),
    failedAttempts: row.failed_attempts || 0,
  };
  if (row.updated_at) doc.updatedAt = toIso(row.updated_at);
  if (row.password_changed_at) doc.passwordChangedAt = toIso(row.password_changed_at);
  if (row.locked_until) doc.lockedUntil = toIso(row.locked_until);
  if (row.last_failed_at) doc.lastFailedAt = toIso(row.last_failed_at);
  if (row.last_reset_email_at) doc.lastResetEmailAt = toIso(row.last_reset_email_at);
  if (row.reset_token) {
    doc.resetToken = { token: row.reset_token, expiresAt: toIso(row.reset_token_expires_at) };
  }
  return doc;
}

function rowToAddress(row) {
  if (!row) return null;
  return {
    _id: row.id,
    label: row.label,
    name: row.name,
    phone: row.phone || '',
    line1: row.line1,
    city: row.city,
    state: row.state || '',
    pincode: row.pincode,
  };
}

// camelCase document field -> PostgreSQL column, for `update()` and `create()`.
// Only these fields are ever writable, which keeps SQL injection impossible
// (column names come from this fixed map, values are always bound parameters).
const COLUMN_MAP = {
  email: 'email',
  password: 'password',
  name: 'name',
  role: 'role',
  phone: 'phone',
  state: 'state',
  company: 'company',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  passwordChangedAt: 'password_changed_at',
  failedAttempts: 'failed_attempts',
  lockedUntil: 'locked_until',
  lastFailedAt: 'last_failed_at',
  lastResetEmailAt: 'last_reset_email_at',
};

// Fields that may be mirrored into the legacy cache (Phases 6-11). Kept explicit
// so a partially-loaded document can never wipe legacy-only data.
const MIRROR_FIELDS = [
  'email', 'password', 'name', 'role', 'phone', 'state', 'company',
  'createdAt', 'updatedAt', 'passwordChangedAt', 'failedAttempts',
  'lockedUntil', 'lastFailedAt', 'lastResetEmailAt', 'resetToken',
  // sub-collections - callers only pass these when they actually changed them
  'passwordHistory', 'savedAddresses',
];

/**
 * Mirror a PostgreSQL write into the legacy cache/JSON so not-yet-migrated read
 * paths (dashboard, admin views, products/orders joins) do not go stale.
 * Best-effort: a mirror failure is logged, never fatal. Temporary by design.
 */
function mirrorFields(userId, patch) {
  if (!legacy.isMirrorEnabled()) return;
  try {
    const rows = legacy.read(COLLECTION);
    const idx = rows.findIndex((u) => String(u._id) === String(userId));
    const safe = {};
    for (const key of MIRROR_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) safe[key] = patch[key];
    }
    if (idx === -1) {
      rows.push({ _id: String(userId), ...safe });
    } else {
      rows[idx] = { ...rows[idx], ...safe };
    }
    legacy.write(COLLECTION, rows);
  } catch (err) {
    console.warn('[db:users] legacy mirror failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Find a user by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  if (id === undefined || id === null) return null;

  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT * FROM users WHERE id = $1', [String(id)]);
    return rowToUser(row);
  }

  return legacy.findById(COLLECTION, id);
}

/**
 * Find a user by email. Case-insensitive, matching register/login behaviour.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  if (!email) return null;
  const key = String(email).trim().toLowerCase();

  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT * FROM users WHERE lower(email) = $1', [key]);
    return rowToUser(row);
  }

  return legacy.findByField(COLLECTION, 'email', key, { caseInsensitive: true });
}

/**
 * Password hashes for the account, oldest -> newest (max 5).
 * Replaces the `user.passwordHistory` array read by the password-reuse check.
 * @returns {Promise<string[]>}
 */
async function getPasswordHistory(id) {
  if (db.isEnabled()) {
    const rows = await db.queryMany(
      `SELECT password_hash FROM password_history
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT $2`,
      [String(id), HISTORY_LIMIT]
    );
    return rows.map((r) => r.password_hash).reverse();
  }

  const user = legacy.findById(COLLECTION, id);
  return Array.isArray(user?.passwordHistory) ? [...user.passwordHistory] : [];
}

/** All users, newest first (admin dashboard). */
async function listAll({ limit } = {}) {
  if (db.isEnabled()) {
    const params = [];
    let sql = 'SELECT * FROM users ORDER BY created_at DESC';
    if (limit) {
      params.push(limit);
      sql += ` LIMIT $${params.length}`;
    }
    const rows = await db.queryMany(sql, params);
    return rows.map(rowToUser);
  }

  const rows = [...legacy.read(COLLECTION)].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  return limit ? rows.slice(0, limit) : rows;
}

/** User count (dashboard tiles / import report). */
async function count() {
  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT COUNT(*)::int AS n FROM users');
    return row.n;
  }
  return legacy.read(COLLECTION).length;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Remove a user from the legacy cache (mirror of a PostgreSQL DELETE). */
function mirrorRemove(userId) {
  if (!legacy.isMirrorEnabled()) return;
  try {
    const rows = legacy.read(COLLECTION);
    const kept = rows.filter((u) => String(u._id) !== String(userId));
    if (kept.length !== rows.length) legacy.write(COLLECTION, kept);
  } catch (err) {
    console.warn('[db:users] legacy mirror (delete) failed:', err.message);
  }
}

/**
 * Create a user.
 * @param {object} doc - full API document (same fields server.js used to push).
 * @returns {Promise<object>} the stored document
 */
async function create(doc) {
  const passwordHistory = Array.isArray(doc.passwordHistory)
    ? doc.passwordHistory
    : (doc.password ? [doc.password] : []);

  const user = {
    _id: String(doc._id || legacy.generateId()),
    email: String(doc.email).trim().toLowerCase(),
    password: doc.password,
    name: doc.name,
    role: doc.role || 'user',
    phone: doc.phone || '',
    state: doc.state || '',
    company: doc.company || {},
    createdAt: doc.createdAt || new Date().toISOString(),
    passwordHistory,
  };

  if (db.isEnabled()) {
    // users + password_history must land together or not at all
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO users (id, email, password, name, role, phone, state, company, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user._id, user.email, user.password, user.name, user.role,
          user.phone, user.state, JSON.stringify(user.company), user.createdAt,
        ]
      );
      for (const hash of passwordHistory) {
        await tx.query(
          'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
          [user._id, hash]
        );
      }
    });

    // mirror the complete document (legacy read paths expect passwordHistory)
    mirrorFields(user._id, user);
    return { ...user, savedAddresses: [] };
  }

  const rows = legacy.read(COLLECTION);
  rows.push(user);
  legacy.write(COLLECTION, rows);
  return user;
}

/**
 * Apply a partial update.
 * @param {string} id
 * @param {object} patch - subset of the writable document fields
 * @returns {Promise<object|null>}
 */
async function update(id, patch) {
  if (id === undefined || id === null || !patch) return null;

  if (db.isEnabled()) {
    const sets = [];
    const params = [];

    for (const [field, column] of Object.entries(COLUMN_MAP)) {
      if (!Object.prototype.hasOwnProperty.call(patch, field)) continue;
      let value = patch[field];
      if (field === 'company') {
        value = JSON.stringify(value === null || value === undefined ? {} : value);
      } else if (
        field === 'createdAt' || field === 'updatedAt' || field === 'passwordChangedAt' ||
        field === 'lockedUntil' || field === 'lastFailedAt' || field === 'lastResetEmailAt'
      ) {
        value = toDateOrNull(value);
      }
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    }

    // resetToken is an object in the API shape but two columns in PostgreSQL
    if (Object.prototype.hasOwnProperty.call(patch, 'resetToken')) {
      const token = patch.resetToken;
      params.push(token ? token.token : null);
      sets.push(`reset_token = $${params.length}`);
      params.push(token ? toDateOrNull(token.expiresAt) : null);
      sets.push(`reset_token_expires_at = $${params.length}`);
    }

    if (sets.length === 0) return rowToUser(await db.queryOne('SELECT * FROM users WHERE id = $1', [String(id)]));

    if (!Object.prototype.hasOwnProperty.call(patch, 'updatedAt')) {
      sets.push('updated_at = now()');
    }

    params.push(String(id));
    const row = await db.queryOne(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!row) return null;

    mirrorFields(id, patch);
    return rowToUser(row);
  }

  const rows = legacy.read(COLLECTION);
  const user = rows.find((u) => String(u._id) === String(id));
  if (!user) return null;
  Object.assign(user, patch);
  legacy.write(COLLECTION, rows);
  return user;
}

/**
 * Delete a user. Addresses + password history cascade in PostgreSQL.
 * @returns {Promise<boolean>} true when a row was deleted
 */
async function remove(id) {
  if (id === undefined || id === null) return false;

  if (db.isEnabled()) {
    const result = await db.query('DELETE FROM users WHERE id = $1', [String(id)]);
    if (result.rowCount > 0) mirrorRemove(id);
    return result.rowCount > 0;
  }

  const rows = legacy.read(COLLECTION);
  const kept = rows.filter((u) => String(u._id) !== String(id));
  if (kept.length === rows.length) return false;
  legacy.write(COLLECTION, kept);
  return true;
}

/**
 * Persist a new password: append to history (pruned to the last 5), clear any
 * outstanding reset link and lockout. Replaces applyNewPassword()'s persistence
 * half so the hashing work stays in the route.
 *
 * @param {string} id
 * @param {string} newHash bcrypt hash
 * @returns {Promise<object|null>} updated document (with passwordHistory)
 */
async function setPassword(id, newHash) {
  const changedAt = new Date().toISOString();

  if (db.isEnabled()) {
    await db.transaction(async (tx) => {
      const current = await tx.queryOne(
        'SELECT password FROM users WHERE id = $1 FOR UPDATE',
        [String(id)]
      );
      if (!current) return;

      // Legacy users have no history row for their outgoing password - record it
      // so it cannot be reused (same rule as applyNewPassword).
      const newest = await tx.queryOne(
        'SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [String(id)]
      );
      if (current.password && (!newest || newest.password_hash !== current.password)) {
        await tx.query(
          'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
          [String(id), current.password]
        );
      }
      await tx.query(
        'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
        [String(id), newHash]
      );
      // keep only the newest HISTORY_LIMIT entries
      await tx.query(
        `DELETE FROM password_history
          WHERE user_id = $1
            AND id NOT IN (
              SELECT id FROM password_history
               WHERE user_id = $1
               ORDER BY id DESC
               LIMIT $2
            )`,
        [String(id), HISTORY_LIMIT]
      );
      await tx.query(
        `UPDATE users
            SET password = $2,
                password_changed_at = $3,
                reset_token = NULL,
                reset_token_expires_at = NULL,
                failed_attempts = 0,
                locked_until = NULL,
                updated_at = now()
          WHERE id = $1`,
        [String(id), newHash, changedAt]
      );
    });

    const row = await db.queryOne('SELECT * FROM users WHERE id = $1', [String(id)]);
    if (!row) return null;
    const doc = rowToUser(row);
    const history = await getPasswordHistory(id);
    mirrorFields(id, {
      password: newHash,
      passwordChangedAt: changedAt,
      resetToken: null,
      failedAttempts: 0,
      lockedUntil: null,
      passwordHistory: history,
    });
    return { ...doc, passwordHistory: history };
  }

  // Legacy path - identical to the previous applyNewPassword behaviour
  const rows = legacy.read(COLLECTION);
  const user = rows.find((u) => String(u._id) === String(id));
  if (!user) return null;

  const history = [...(user.passwordHistory || [])];
  if (user.password && history[history.length - 1] !== user.password) history.push(user.password);
  history.push(newHash);

  user.password = newHash;
  user.passwordHistory = history.slice(-HISTORY_LIMIT);
  user.resetToken = null;
  user.passwordChangedAt = changedAt;
  user.failedAttempts = 0;
  user.lockedUntil = null;
  legacy.write(COLLECTION, rows);
  return user;
}

/**
 * Record a failed login and apply the progressive lockout (5th failure = 15 min,
 * 6th = 30 min, ...). Mirrors the inline logic previously in POST /api/auth/login
 * so a restart/deploy cannot reset a lockout.
 *
 * @returns {Promise<object|null>} updated document, or null for an unknown email
 */
async function recordFailedLogin(email) {
  const key = String(email).trim().toLowerCase();

  if (db.isEnabled()) {
    const row = await db.queryOne(
      `UPDATE users
          SET failed_attempts = failed_attempts + 1,
              last_failed_at = now(),
              locked_until = CASE
                WHEN failed_attempts + 1 >= 5
                  THEN now() + (interval '15 minutes' * GREATEST(1, failed_attempts + 1 - 4))
                ELSE locked_until
              END,
              updated_at = now()
        WHERE lower(email) = $1
        RETURNING *`,
      [key]
    );
    if (!row) return null;
    const doc = rowToUser(row);
    if (doc.failedAttempts >= 5) {
      console.warn(`[SECURITY] Account locked: ${key} after ${doc.failedAttempts} failed attempts`);
    }
    mirrorFields(doc._id, {
      failedAttempts: doc.failedAttempts,
      lastFailedAt: doc.lastFailedAt,
      lockedUntil: doc.lockedUntil,
    });
    return doc;
  }

  const rows = legacy.read(COLLECTION);
  const user = rows.find((u) => String(u.email || '').toLowerCase() === key);
  if (!user) return null;

  user.failedAttempts = (user.failedAttempts || 0) + 1;
  user.lastFailedAt = new Date().toISOString();
  if (user.failedAttempts >= 5) {
    const lockoutMultiplier = Math.max(1, user.failedAttempts - 4);
    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000 * lockoutMultiplier).toISOString();
    console.warn(`[SECURITY] Account locked: ${key} after ${user.failedAttempts} failed attempts`);
  }
  legacy.write(COLLECTION, rows);
  return user;
}

/** Clear failed attempts / lockout after a successful login. */
async function clearFailedLogin(id) {
  if (id === undefined || id === null) return null;

  if (db.isEnabled()) {
    const row = await db.queryOne(
      `UPDATE users
          SET failed_attempts = 0, locked_until = NULL, updated_at = now()
        WHERE id = $1 AND (failed_attempts <> 0 OR locked_until IS NOT NULL)
        RETURNING *`,
      [String(id)]
    );
    if (row) mirrorFields(id, { failedAttempts: 0, lockedUntil: null });
    return row ? rowToUser(row) : null;
  }

  const rows = legacy.read(COLLECTION);
  const user = rows.find((u) => String(u._id) === String(id));
  if (!user) return null;
  if (user.failedAttempts || user.lockedUntil) {
    user.failedAttempts = 0;
    user.lockedUntil = null;
    legacy.write(COLLECTION, rows);
  }
  return user;
}

// ---------------------------------------------------------------------------
// Saved addresses (replaces user.savedAddresses[])
// ---------------------------------------------------------------------------

/** Mirror the address list into the legacy user document. */
function mirrorAddresses(userId, addresses) {
  if (!legacy.isMirrorEnabled()) return;
  try {
    const rows = legacy.read(COLLECTION);
    const idx = rows.findIndex((u) => String(u._id) === String(userId));
    if (idx === -1) return;
    rows[idx] = { ...rows[idx], savedAddresses: addresses };
    legacy.write(COLLECTION, rows);
  } catch (err) {
    console.warn('[db:users] legacy mirror (addresses) failed:', err.message);
  }
}

/** All addresses for a user, in insertion order. */
async function listAddresses(userId) {
  if (db.isEnabled()) {
    const rows = await db.queryMany(
      'SELECT * FROM saved_addresses WHERE user_id = $1 ORDER BY position ASC',
      [String(userId)]
    );
    return rows.map(rowToAddress);
  }
  const user = legacy.findById(COLLECTION, userId);
  return Array.isArray(user?.savedAddresses) ? [...user.savedAddresses] : [];
}

/**
 * Add an address. The id is generated the same way server.js did
 * (Date.now().toString()), keeping existing ids unique and unchanged.
 * @returns {Promise<object>} the stored address
 */
async function addAddress(userId, address) {
  const id = String(address._id || legacy.generateId());
  const doc = {
    _id: id,
    label: address.label || 'Home',
    name: address.name,
    phone: address.phone || '',
    line1: address.line1,
    city: address.city,
    state: address.state || '',
    pincode: address.pincode,
  };

  if (db.isEnabled()) {
    await db.query(
      `INSERT INTO saved_addresses (id, user_id, label, name, phone, line1, city, state, pincode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [doc._id, String(userId), doc.label, doc.name, doc.phone,
        doc.line1, doc.city, doc.state, doc.pincode]
    );
    mirrorAddresses(userId, await listAddresses(userId));
    return doc;
  }

  const rows = legacy.read(COLLECTION);
  const user = rows.find((u) => String(u._id) === String(userId));
  if (!user) return null;
  if (!user.savedAddresses) user.savedAddresses = [];
  user.savedAddresses.push(doc);
  legacy.write(COLLECTION, rows);
  return doc;
}

/**
 * Update an address. Only the fields present in `patch` are written.
 * @returns {Promise<object|null>} updated address, or null when not found
 */
async function updateAddress(userId, addressId, patch) {
  const WRITABLE = ['label', 'name', 'phone', 'line1', 'city', 'state', 'pincode'];

  if (db.isEnabled()) {
    const sets = [];
    const params = [];
    for (const field of WRITABLE) {
      if (!Object.prototype.hasOwnProperty.call(patch, field)) continue;
      params.push(patch[field]);
      sets.push(`${field} = $${params.length}`);
    }
    if (sets.length === 0) {
      const row = await db.queryOne(
        'SELECT * FROM saved_addresses WHERE id = $1 AND user_id = $2',
        [String(addressId), String(userId)]
      );
      return rowToAddress(row);
    }
    params.push(String(addressId), String(userId));
    const row = await db.queryOne(
      `UPDATE saved_addresses SET ${sets.join(', ')}
        WHERE id = $${params.length - 1} AND user_id = $${params.length}
        RETURNING *`,
      params
    );
    if (!row) return null;
    mirrorAddresses(userId, await listAddresses(userId));
    return rowToAddress(row);
  }

  const rows = legacy.read(COLLECTION);
  const user = rows.find((u) => String(u._id) === String(userId));
  if (!user || !user.savedAddresses) return null;
  const addr = user.savedAddresses.find((a) => a._id === addressId);
  if (!addr) return null;
  for (const field of WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) addr[field] = patch[field];
  }
  legacy.write(COLLECTION, rows);
  return addr;
}

/**
 * Delete an address.
 * @returns {Promise<boolean>} true when an address was removed
 */
async function deleteAddress(userId, addressId) {
  if (db.isEnabled()) {
    const result = await db.query(
      'DELETE FROM saved_addresses WHERE id = $1 AND user_id = $2',
      [String(addressId), String(userId)]
    );
    if (result.rowCount > 0) mirrorAddresses(userId, await listAddresses(userId));
    return result.rowCount > 0;
  }

  const rows = legacy.read(COLLECTION);
  const user = rows.find((u) => String(u._id) === String(userId));
  if (!user || !user.savedAddresses) return false;
  const before = user.savedAddresses.length;
  user.savedAddresses = user.savedAddresses.filter((a) => a._id !== addressId);
  if (user.savedAddresses.length === before) return false;
  legacy.write(COLLECTION, rows);
  return true;
}

module.exports = {
  // reads
  findById,
  findByEmail,
  getPasswordHistory,
  listAll,
  count,
  // writes
  create,
  update,
  remove,
  setPassword,
  recordFailedLogin,
  clearFailedLogin,
  // addresses
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  // helpers (used by the import script and tests)
  rowToUser,
  rowToAddress,
  HISTORY_LIMIT,
};
