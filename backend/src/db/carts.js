'use strict';

// Cart repository - owns the `carts` + `cart_items` tables in PostgreSQL and
// data/carts.json while PostgreSQL is not configured.
//
// Document shape (identical in both modes):
//   { _id?, userId, items: [{ productId, quantity, addedAt, product? }],
//     total, version }
//
// One cart per user (carts.user_id is the PK). Line items live in cart_items
// with `snapshot` holding the product data captured when the item was added;
// product_id is deliberately not an FK - the API keeps lines that reference a
// just-deleted product until the user removes them.
//
// PostgreSQL mode has no legacy cart `_id` column, so reads synthesise it from
// user_id (routes never read it; the frontend only uses items/total/version).

const db = require('./postgres');
const legacy = require('./legacy');

const COLLECTION = 'carts';

function toIso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** cart_items rows -> legacy item array. */
function rowsToItems(rows) {
  return (rows || []).map((r) => {
    const item = {
      productId: r.product_id,
      quantity: Number(r.quantity) || 1,
      addedAt: toIso(r.added_at),
    };
    const snap = r.snapshot && typeof r.snapshot === 'object' ? r.snapshot : {};
    if (Object.keys(snap).length > 0) item.product = snap;
    return item;
  });
}

/** PostgreSQL cart row (+ its item rows) -> legacy cart document. */
function rowToCart(row, itemRows) {
  if (!row) return null;
  return {
    _id: row.user_id,
    userId: row.user_id,
    items: rowsToItems(itemRows),
    total: Number(row.total) || 0,
    version: Number(row.version) || 0,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function list() {
  if (db.isEnabled()) {
    const { rows } = await db.query('SELECT * FROM carts ORDER BY user_id ASC');
    const { rows: itemRows } = await db.query(
      'SELECT * FROM cart_items ORDER BY added_at ASC, product_id ASC'
    );
    const itemsByCart = new Map();
    for (const r of itemRows) {
      if (!itemsByCart.has(r.cart_user_id)) itemsByCart.set(r.cart_user_id, []);
      itemsByCart.get(r.cart_user_id).push(r);
    }
    return rows.map((row) => rowToCart(row, itemsByCart.get(row.user_id) || []));
  }
  return legacy.read(COLLECTION);
}

async function findByUser(userId) {
  if (userId === undefined || userId === null) return null;
  const uid = String(userId);
  if (db.isEnabled()) {
    const cartRow = await db.queryOne('SELECT * FROM carts WHERE user_id = $1', [uid]);
    if (!cartRow) return null;
    const { rows: itemRows } = await db.query(
      'SELECT * FROM cart_items WHERE cart_user_id = $1 ORDER BY added_at ASC, product_id ASC',
      [uid]
    );
    return rowToCart(cartRow, itemRows);
  }
  const found = legacy.read(COLLECTION).find((c) => String(c.userId) === uid);
  return found || null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Transitional (Phases 6-11): mirror PG cart state into the JSON cache for any
// reader not yet migrated. Removed in Phase 12 with the JSON layer.
async function mirrorAll() {
  if (!db.isEnabled() || !legacy.isMirrorEnabled() || !legacy.hasSharedStore()) return;
  try {
    legacy.write(COLLECTION, await list());
  } catch (err) {
    console.error('[db:carts] legacy mirror failed:', err.message);
  }
}

/** Upsert the whole cart (header + full item replacement) atomically. */
async function save(cart) {
  if (!cart || cart.userId === undefined || cart.userId === null) return null;
  const uid = String(cart.userId);
  if (db.isEnabled()) {
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO carts (user_id, version, total, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id) DO UPDATE SET
           version = EXCLUDED.version,
           total = EXCLUDED.total,
           updated_at = now()`,
        [uid, Number(cart.version) || 0, Number(cart.total) || 0]
      );
      await tx.query('DELETE FROM cart_items WHERE cart_user_id = $1', [uid]);
      const seen = new Set();
      for (const item of cart.items || []) {
        const pid = item && item.productId !== undefined && item.productId !== null
          ? String(item.productId) : null;
        if (!pid || seen.has(pid)) continue; // PK is (cart_user_id, product_id)
        seen.add(pid);
        await tx.query(
          `INSERT INTO cart_items (cart_user_id, product_id, quantity, added_at, snapshot)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            uid,
            pid,
            Math.max(1, Math.trunc(Number(item.quantity) || 1)),
            toDateOrNull(item.addedAt) || new Date(),
            item.product && typeof item.product === 'object' ? item.product : {},
          ]
        );
      }
    });
    await mirrorAll();
    return findByUser(uid);
  }
  const rows = legacy.read(COLLECTION);
  const index = rows.findIndex((c) => String(c.userId) === uid);
  if (index === -1) rows.push(cart);
  else rows[index] = cart;
  legacy.write(COLLECTION, rows);
  return cart;
}

async function clear() {
  if (db.isEnabled()) {
    await db.query('DELETE FROM carts'); // cascades cart_items
    await mirrorAll();
    return;
  }
  legacy.write(COLLECTION, []);
}

module.exports = {
  list,
  findByUser,
  save,
  clear,
  mirrorAll,
};
