'use strict';

// Message repository - owns the `messages` table in PostgreSQL and
// data/messages.json while PostgreSQL is not configured.
//
// Document shape (identical in both modes):
//   { _id, senderId, receiverId, content, timestamp, serverTimestamp, read }
//
// There is deliberately no conversations table: the API derives conversation
// lists from the full message set (sender/receiver pairs), so this repo only
// stores messages. No FK to users - threads must survive account deletion.

const db = require('./postgres');
const legacy = require('./legacy');

const COLLECTION = 'messages';

const ORDER = 'ORDER BY created_at ASC, id ASC';

function toIso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** PostgreSQL row -> legacy message document. */
function rowToMessage(row) {
  if (!row) return null;
  return {
    _id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    timestamp: toIso(row.created_at),
    serverTimestamp:
      row.server_timestamp !== null && row.server_timestamp !== undefined
        ? Number(row.server_timestamp)
        : null,
    read: !!row.read,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function list() {
  if (db.isEnabled()) {
    const { rows } = await db.query(`SELECT * FROM messages ${ORDER}`);
    return rows.map(rowToMessage);
  }
  return legacy.read(COLLECTION);
}

/** Both directions between two users, oldest first (chat thread order). */
async function findThread(userA, userB) {
  const a = String(userA);
  const b = String(userB);
  if (db.isEnabled()) {
    const { rows } = await db.query(
      `SELECT * FROM messages
        WHERE (sender_id = $1 AND receiver_id = $2)
           OR (sender_id = $2 AND receiver_id = $1)
        ${ORDER}`,
      [a, b]
    );
    return rows.map(rowToMessage);
  }
  return legacy
    .read(COLLECTION)
    .filter(
      (m) =>
        (String(m.senderId) === a && String(m.receiverId) === b) ||
        (String(m.senderId) === b && String(m.receiverId) === a)
    )
    .sort((x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime());
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Transitional (Phases 6-11): mirror PG writes into the JSON cache for any
// reader not yet migrated. Removed in Phase 12 with the JSON layer.
async function mirrorAll() {
  if (!db.isEnabled() || !legacy.isMirrorEnabled() || !legacy.hasSharedStore()) return;
  try {
    legacy.write(COLLECTION, await list());
  } catch (err) {
    console.error('[db:messages] legacy mirror failed:', err.message);
  }
}

/** Persist a new message (the route already generated _id/timestamp). */
async function create(message) {
  if (!message || message._id === undefined || message._id === null) return null;
  const doc = { ...message };
  if (db.isEnabled()) {
    const row = await db.queryOne(
      `INSERT INTO messages (id, sender_id, receiver_id, content, read, server_timestamp, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()))
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         read = EXCLUDED.read,
         server_timestamp = EXCLUDED.server_timestamp
       RETURNING *`,
      [
        String(doc._id),
        String(doc.senderId),
        String(doc.receiverId),
        String(doc.content || ''),
        !!doc.read,
        doc.serverTimestamp !== undefined && doc.serverTimestamp !== null
          ? Number(doc.serverTimestamp)
          : null,
        toDateOrNull(doc.timestamp) || new Date(),
      ]
    );
    await mirrorAll();
    return rowToMessage(row);
  }
  const rows = legacy.read(COLLECTION);
  rows.push(doc);
  legacy.write(COLLECTION, rows);
  return doc;
}

/** Mark messages FROM senderId TO receiverId as read; returns # changed. */
async function markReceivedFrom(senderId, receiverId) {
  const from = String(senderId);
  const to = String(receiverId);
  if (db.isEnabled()) {
    const result = await db.query(
      'UPDATE messages SET read = true WHERE sender_id = $1 AND receiver_id = $2 AND read = false',
      [from, to]
    );
    if (result.rowCount > 0) await mirrorAll();
    return result.rowCount;
  }
  const rows = legacy.read(COLLECTION);
  let changed = 0;
  const next = rows.map((m) => {
    if (String(m.senderId) === from && String(m.receiverId) === to && !m.read) {
      changed++;
      // Replace with a copy so thread arrays fetched before this call keep
      // holding pre-mark values - exactly like the old read-all/write-back
      // route behaved (its spread copies left the response unchanged).
      return { ...m, read: true };
    }
    return m;
  });
  if (changed > 0) legacy.write(COLLECTION, next);
  return changed;
}

async function clear() {
  if (db.isEnabled()) {
    await db.query('DELETE FROM messages');
    await mirrorAll();
    return;
  }
  legacy.write(COLLECTION, []);
}

module.exports = {
  // reads
  list,
  findThread,
  // writes
  create,
  markReceivedFrom,
  clear,
  mirrorAll,
  // helpers (used by tests)
  rowToMessage,
};
