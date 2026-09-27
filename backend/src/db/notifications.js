'use strict';

// Notifications repository - owns the `notifications` table in PostgreSQL and
// data/notifications.json while PostgreSQL is not configured.
//
// Document shape (identical in both modes):
//   { _id, userId|null, title, message, type, read, archived, createdAt,
//     metadata? , ...extra }
//
// userId === null means a platform-wide notification (the list routes show
// those to everyone). Fields without a column land in `metadata` JSONB.

const db = require('./postgres');
const legacy = require('./legacy');

const COLLECTION = 'notifications';

function toIso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const NON_META_FIELDS = new Set([
  '_id', 'id', 'userId', 'title', 'message', 'type', 'read', 'archived', 'createdAt',
]);

/** PostgreSQL row -> API document. */
function rowToNotification(row) {
  if (!row) return null;
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const doc = { ...meta };
  doc._id = row.id;
  doc.userId = row.user_id || null;
  doc.title = row.title || '';
  doc.message = row.message || '';
  doc.type = row.type || 'info';
  doc.read = !!row.read;
  doc.archived = !!row.archived;
  doc.createdAt = toIso(row.created_at);
  return doc;
}

/** API document -> column values + metadata payload. */
function docToRow(doc) {
  const meta = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!NON_META_FIELDS.has(key) && value !== undefined) meta[key] = value;
  }
  return {
    user_id: doc.userId ? String(doc.userId) : null,
    title: doc.title || '',
    message: doc.message || '',
    type: doc.type || 'info',
    read: !!doc.read,
    archived: !!doc.archived,
    metadata: meta,
    created_at: toDateOrNull(doc.createdAt) || new Date(),
  };
}

const COL_LIST = 'id, user_id, title, message, type, read, archived, metadata, created_at';

function rowParams(id, r) {
  return [id, r.user_id, r.title, r.message, r.type, r.read, r.archived,
    r.metadata, r.created_at];
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function list() {
  if (db.isEnabled()) {
    const { rows } = await db.query(
      'SELECT * FROM notifications ORDER BY created_at ASC, id ASC'
    );
    return rows.map(rowToNotification);
  }
  return legacy.read(COLLECTION);
}

async function findById(id) {
  if (id === undefined || id === null) return null;
  if (db.isEnabled()) {
    const row = await db.queryOne('SELECT * FROM notifications WHERE id = $1', [String(id)]);
    return rowToNotification(row);
  }
  return legacy.findById(COLLECTION, id);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Transitional (Phases 6-11): read paths not migrated yet still read the JSON
// cache - mirror PG writes there so they never see stale notifications.
// Removed in Phase 12 with the JSON layer.
async function mirrorAll() {
  if (!db.isEnabled() || !legacy.isMirrorEnabled() || !legacy.hasSharedStore()) return;
  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications ORDER BY created_at ASC, id ASC'
    );
    legacy.write(COLLECTION, rows.map(rowToNotification));
  } catch (err) {
    console.error('[db:notifications] legacy mirror failed:', err.message);
  }
}

async function create(doc) {
  const created = await createMany([doc]);
  return created[0] || null;
}

/** Insert several notifications (one mirror refresh at the end). */
async function createMany(docs) {
  if (!docs || docs.length === 0) return [];
  if (db.isEnabled()) {
    const out = [];
    for (const doc of docs) {
      const r = docToRow(doc);
      const row = await db.queryOne(
        `INSERT INTO notifications (${COL_LIST})
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        rowParams(String(doc._id), r)
      );
      out.push(rowToNotification(row));
    }
    await mirrorAll();
    return out;
  }
  const rows = legacy.read(COLLECTION);
  for (const doc of docs) rows.push(doc);
  legacy.write(COLLECTION, rows);
  return docs;
}

async function markRead(id) {
  if (db.isEnabled()) {
    const row = await db.queryOne(
      'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
      [String(id)]
    );
    if (!row) return null;
    await mirrorAll();
    return rowToNotification(row);
  }
  const rows = legacy.read(COLLECTION);
  const notif = rows.find((n) => String(n._id) === String(id));
  if (!notif) return null;
  notif.read = true;
  legacy.write(COLLECTION, rows);
  return notif;
}

async function markAllRead(userId) {
  const uid = userId ? String(userId) : null;
  if (db.isEnabled()) {
    const result = await db.query(
      `UPDATE notifications SET read = true
        WHERE read = false AND (user_id IS NULL OR user_id = $1)`,
      [uid]
    );
    if (result.rowCount > 0) await mirrorAll();
    return result.rowCount;
  }
  const rows = legacy.read(COLLECTION);
  let changed = false;
  rows.forEach((n) => {
    if ((!n.userId || String(n.userId) === uid) && !n.read) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) legacy.write(COLLECTION, rows);
  return changed ? 1 : 0;
}

async function setArchived(id, archived) {
  if (db.isEnabled()) {
    const row = await db.queryOne(
      'UPDATE notifications SET archived = $2 WHERE id = $1 RETURNING *',
      [String(id), !!archived]
    );
    if (!row) return null;
    await mirrorAll();
    return rowToNotification(row);
  }
  const rows = legacy.read(COLLECTION);
  const notif = rows.find((n) => String(n._id) === String(id));
  if (!notif) return null;
  notif.archived = !!archived;
  legacy.write(COLLECTION, rows);
  return notif;
}

async function remove(id) {
  if (db.isEnabled()) {
    const result = await db.query('DELETE FROM notifications WHERE id = $1', [String(id)]);
    if (result.rowCount > 0) await mirrorAll();
    return result.rowCount > 0;
  }
  const rows = legacy.read(COLLECTION);
  const next = rows.filter((n) => String(n._id) !== String(id));
  if (next.length === rows.length) return false;
  legacy.write(COLLECTION, next);
  return true;
}

/** Delete every notification belonging to a user (account deletion flow). */
async function removeForUser(userId) {
  if (!userId) return 0;
  if (db.isEnabled()) {
    const result = await db.query('DELETE FROM notifications WHERE user_id = $1', [String(userId)]);
    if (result.rowCount > 0) await mirrorAll();
    return result.rowCount;
  }
  const rows = legacy.read(COLLECTION);
  const next = rows.filter((n) => String(n.userId) !== String(userId));
  if (next.length === rows.length) return 0;
  legacy.write(COLLECTION, next);
  return rows.length - next.length;
}

async function clear() {
  if (db.isEnabled()) {
    await db.query('DELETE FROM notifications');
    await mirrorAll();
    return;
  }
  legacy.write(COLLECTION, []);
}

module.exports = {
  // reads
  list,
  findById,
  // writes
  create,
  createMany,
  markRead,
  markAllRead,
  setArchived,
  remove,
  removeForUser,
  clear,
  // helpers (used by the import script and tests)
  rowToNotification,
};