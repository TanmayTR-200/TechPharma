/**
 * PostgreSQL repository integration tests.
 *
 * Skipped unless PG_TEST=1 AND DATABASE_URL are set (npm run test:pg), so the
 * default `npm test` stays hermetic and exercises the legacy JSON/cache store:
 *
 *   PG_TEST=1 DATABASE_URL=postgresql://user:pass@host:55432/db npm run test:pg
 *
 * The suite runs the idempotent migration runner first, then exercises the
 * users / password_history / saved_addresses / otps repositories end to end
 * (create, read, update, delete, relationships, constraints, transactions).
 * Rows use RUN-scoped ids/emails and are removed in afterAll.
 */

// Keep the suite hermetic: PG writes must not touch data/*.json except inside
// the dedicated mirror test below.
process.env.PG_MIRROR_LEGACY_WRITES = 'false';

const PG_READY =
  process.env.PG_TEST === '1' && !!process.env.DATABASE_URL && process.env.PG_DISABLED !== 'true';

const describePg = PG_READY ? describe : describe.skip;
if (!PG_READY) {
  // eslint-disable-next-line no-console
  console.log('[postgres.test] skipped: set PG_TEST=1 and DATABASE_URL to run');
}

jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');
const db = require('../src/db/postgres');
const users = require('../src/db/users');
const otps = require('../src/db/otps');
const products = require('../src/db/products');
const inventory = require('../src/db/inventory');
const { runMigrations } = require('../src/db/migrate');

const RUN = String(Date.now());
const uid = (n) => `pgtest-${n}-${RUN}`;
const mail = (n) => `pgtest-${n}-${RUN}@example.com`;
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

describePg('PostgreSQL users repository', () => {
  beforeAll(async () => {
    expect(db.isEnabled()).toBe(true); // fail fast with a clear message
    await db.healthCheck();
    await runMigrations();
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE id LIKE $1', [`pgtest-%-${RUN}`]);
    await db.query('DELETE FROM otps WHERE email LIKE $1', [`pgtest-%-${RUN}@%`]);
    await db.closePool();
  });

  test('create + findById round-trip preserves id and API shape', async () => {
    const created = await users.create({
      _id: uid('a'),
      email: mail('a'),
      password: 'hash-a',
      name: 'PG Test User',
      role: 'user',
      phone: '+91 100-000-0001',
      state: 'MH',
      company: { name: 'Acme' },
      createdAt: new Date().toISOString(),
    });
    expect(created._id).toBe(uid('a'));

    const found = await users.findById(uid('a'));
    expect(found).toMatchObject({
      _id: uid('a'),
      email: mail('a'),
      password: 'hash-a',
      name: 'PG Test User',
      role: 'user',
      phone: '+91 100-000-0001',
      state: 'MH',
    });
    expect(found.company).toEqual({ name: 'Acme' });
    expect(typeof found.createdAt).toBe('string');
    expect(await users.findById('no-such-user')).toBeNull();
  });

  test('findByEmail is case-insensitive', async () => {
    const found = await users.findByEmail(mail('A').toUpperCase());
    expect(found).toBeTruthy();
    expect(found._id).toBe(uid('a'));
    expect(await users.findByEmail(`nope-${RUN}@example.com`)).toBeNull();
  });

  test('duplicate email violates the unique constraint', async () => {
    await expect(
      users.create({ _id: uid('dup'), email: mail('a'), password: 'x', name: 'Dup' })
    ).rejects.toMatchObject({ code: '23505' });
  });

  test('update applies a partial patch, unknown id returns null', async () => {
    const updated = await users.update(uid('a'), { name: 'Renamed', state: 'KA' });
    expect(updated).toMatchObject({ _id: uid('a'), name: 'Renamed', state: 'KA' });
    expect(updated.email).toBe(mail('a')); // untouched fields survive

    const noop = await users.update(uid('a'), {});
    expect(noop).toMatchObject({ _id: uid('a'), name: 'Renamed' });

    expect(await users.update('missing-id', { name: 'x' })).toBeNull();
  });

  test('password history: seeded on create, setPassword appends and prunes to 5', async () => {
    expect(await users.getPasswordHistory(uid('a'))).toEqual(['hash-a']);

    // reset token + lockout present before the change
    await users.update(uid('a'), {
      resetToken: { token: 'reset-tok', expiresAt: new Date(Date.now() + 60000).toISOString() },
      failedAttempts: 3,
      lockedUntil: new Date(Date.now() + 60000).toISOString(),
    });

    const changed = await users.setPassword(uid('a'), 'hash-new');
    expect(changed.password).toBe('hash-new');
    expect(changed.passwordHistory).toEqual(['hash-a', 'hash-new']);
    expect(changed.resetToken).toBeUndefined(); // cleared
    expect(changed.failedAttempts).toBe(0); // lockout cleared
    expect(changed.lockedUntil).toBeUndefined();

    for (let i = 1; i <= 6; i += 1) {
      await users.setPassword(uid('a'), `hash-${i}`); // eslint-disable-line no-await-in-loop
    }
    const history = await users.getPasswordHistory(uid('a'));
    expect(history).toHaveLength(users.HISTORY_LIMIT); // never grows past 5
    expect(history[history.length - 1]).toBe('hash-6');
  });

  test('saved addresses: add/list/update/delete with ownership scoping', async () => {
    const other = await users.create({ _id: uid('b'), email: mail('b'), password: 'h', name: 'Other' });

    const addr = await users.addAddress(uid('a'), {
      _id: uid('addr'),
      label: 'Warehouse',
      name: 'Store Desk',
      line1: '12 MG Road',
      city: 'Pune',
      state: 'MH',
      pincode: '411001',
    });
    expect(addr._id).toBe(uid('addr'));

    const list = await users.listAddresses(uid('a'));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ city: 'Pune', label: 'Warehouse' });

    const updated = await users.updateAddress(uid('a'), uid('addr'), { city: 'Mumbai' });
    expect(updated.city).toBe('Mumbai');

    // another user cannot see or mutate this address
    expect(await users.updateAddress(other._id, uid('addr'), { city: 'Delhi' })).toBeNull();
    expect(await users.deleteAddress(other._id, uid('addr'))).toBe(false);
    expect(await users.listAddresses(other._id)).toHaveLength(0);

    expect(await users.deleteAddress(uid('a'), uid('addr'))).toBe(true);
    expect(await users.listAddresses(uid('a'))).toHaveLength(0);
    expect(await users.deleteAddress(uid('a'), uid('addr'))).toBe(false);
    await users.remove(other._id);
  });

  test('failed logins lock at 5 attempts; clearFailedLogin resets', async () => {
    for (let i = 0; i < 5; i += 1) {
      const doc = await users.recordFailedLogin(mail('a')); // eslint-disable-line no-await-in-loop
      expect(doc.failedAttempts).toBe(i + 1);
    }
    const locked = await users.findById(uid('a'));
    expect(locked.failedAttempts).toBe(5);
    expect(new Date(locked.lockedUntil).getTime()).toBeGreaterThan(Date.now());

    const cleared = await users.clearFailedLogin(uid('a'));
    expect(cleared.failedAttempts).toBe(0);
    expect(cleared.lockedUntil).toBeUndefined();
    expect(await users.recordFailedLogin(`missing-${RUN}@example.com`)).toBeNull();
  });

  test('listAll / count see the row', async () => {
    const all = await users.listAll();
    expect(all.some((u) => u._id === uid('a'))).toBe(true);
    expect(await users.count()).toBeGreaterThanOrEqual(1);
  });

  test('remove deletes the user and cascades to history + addresses', async () => {
    const doomed = await users.create({ _id: uid('c'), email: mail('c'), password: 'h', name: 'Doomed' });
    await users.addAddress(doomed._id, { _id: uid('c-addr'), name: 'X', line1: 'Y', city: 'Z', pincode: '1' });

    expect(await users.remove(doomed._id)).toBe(true);
    expect(await users.findById(doomed._id)).toBeNull();
    expect(await users.remove(doomed._id)).toBe(false);

    const addrCount = await db.queryOne(
      'SELECT COUNT(*)::int AS n FROM saved_addresses WHERE user_id = $1',
      [doomed._id]
    );
    const histCount = await db.queryOne(
      'SELECT COUNT(*)::int AS n FROM password_history WHERE user_id = $1',
      [doomed._id]
    );
    expect(addrCount.n).toBe(0);
    expect(histCount.n).toBe(0);
  });

  test('transaction helper rolls back on error', async () => {
    const txId = uid('tx');
    await expect(
      db.transaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, email, password, name, role, created_at)
           VALUES ($1, $2, 'h', 'TX', 'user', now())`,
          [txId, `tx-${RUN}@example.com`]
        );
        throw new Error('rollback-probe');
      })
    ).rejects.toThrow('rollback-probe');

    expect(await users.findById(txId)).toBeNull();
  });

  test('mirror (when enabled) writes the PG user back into data/users.json', async () => {
    const backup = fs.existsSync(USERS_FILE) ? fs.readFileSync(USERS_FILE, 'utf8') : null;
    process.env.PG_MIRROR_LEGACY_WRITES = 'true';
    try {
      await users.update(uid('a'), { name: 'Mirror Probe' });
      const rows = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const mirrored = rows.find((r) => String(r._id) === uid('a'));
      expect(mirrored).toBeTruthy();
      expect(mirrored.name).toBe('Mirror Probe');
      await users.update(uid('a'), { name: 'PG Test User' });
    } finally {
      process.env.PG_MIRROR_LEGACY_WRITES = 'false';
      if (backup !== null) fs.writeFileSync(USERS_FILE, backup);
      else if (fs.existsSync(USERS_FILE)) fs.unlinkSync(USERS_FILE);
    }
  });
});

describePg('PostgreSQL OTP repository', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  test('set/get round-trip; expiresAt is epoch milliseconds', async () => {
    await otps.set(mail('otp'), 'verify', '123456', 5 * 60 * 1000);
    const entry = await otps.get(mail('otp'), 'verify');
    expect(entry).toMatchObject({ email: mail('otp'), purpose: 'verify', otp: '123456' });
    expect(typeof entry.expiresAt).toBe('number'); // server.js compares Date.now() > expiresAt
    expect(entry.expiresAt).toBeGreaterThan(Date.now());
  });

  test('same (email, purpose) is replaced, not duplicated', async () => {
    await otps.set(mail('otp'), 'verify', '654321', 5 * 60 * 1000);
    const entry = await otps.get(mail('otp'), 'verify');
    expect(entry.otp).toBe('654321');

    const rows = await db.query(
      'SELECT COUNT(*)::int AS n FROM otps WHERE email = $1 AND purpose = $2',
      [mail('otp'), 'verify']
    );
    expect(rows.rows[0].n).toBe(1);
  });

  test('expired codes are invisible to get, then pruned', async () => {
    await otps.set(mail('expired'), 'verify', '999999', -1000);
    expect(await otps.get(mail('expired'), 'verify')).toBeNull();

    const removed = await otps.pruneExpired();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await otps.get(mail('expired'), 'verify')).toBeNull();
  });

  test('remove deletes a single (email, purpose) entry', async () => {
    await otps.set(mail('otp'), 'delete-account', '555555', 60 * 1000);
    expect(await otps.get(mail('otp'), 'delete-account')).toBeTruthy();

    await otps.remove(mail('otp'), 'delete-account');
    expect(await otps.get(mail('otp'), 'delete-account')).toBeNull();
    expect(await otps.get(mail('otp'), 'verify')).toBeTruthy(); // other purpose survives
  });

  afterAll(async () => {
    await otps.remove(mail('otp'), 'verify');
    await otps.remove(mail('otp'), 'delete-account');
    await otps.remove(mail('expired'), 'verify');
  });
});

describePg('PostgreSQL inventory reservations', () => {
  const productId = (name) => `pgtest-inventory-${name}-${RUN}`;

  beforeAll(async () => {
    await runMigrations();
  });

  async function seedProduct(name, stock) {
    const id = productId(name);
    await db.query(
      `INSERT INTO products (id, name, price, status, stock, total_stock, available_stock, reserved_stock, sold, sales_count)
       VALUES ($1, $2, 10, 'active', $3, $3, $3, 0, 0, 0)`,
      [id, `Inventory test ${name}`, stock]
    );
    await inventory.upsertProduct(id, stock);
    return id;
  }

  function stockFor(id) {
    return db.queryOne('SELECT * FROM inventory_stock WHERE product_id = $1', [id]);
  }

  afterEach(async () => {
    await db.query('DELETE FROM products WHERE id LIKE $1', [`pgtest-inventory-%-${RUN}`]);
  });

  test('reserve is atomic and replaying an idempotency key does not decrement twice', async () => {
    const id = await seedProduct('reserve', 5);
    const request = {
      productId: id,
      quantity: 2,
      userId: uid('inventory-user'),
      idempotencyKey: `pgtest-reserve-key-${RUN}`,
    };

    const first = await inventory.reserve(request);
    const replay = await inventory.reserve(request);

    expect(first.idempotent).toBe(false);
    expect(replay.idempotent).toBe(true);
    expect(replay.reservation.reservation_id).toBe(first.reservation.reservation_id);
    await expect(stockFor(id)).resolves.toMatchObject({
      total_stock: 5,
      available_stock: 3,
      reserved_stock: 2,
      sold: 0,
    });
  });

  test('reserve rolls back its stock decrement when reservation insertion fails', async () => {
    const id = await seedProduct('rollback', 3);
    const originalTransaction = db.transaction;
    db.transaction = async (callback, options) => originalTransaction(async (tx) => {
      const queryOne = tx.queryOne;
      tx.queryOne = async (sql, params) => {
        if (String(sql).includes('INSERT INTO reservations')) {
          throw new Error('forced reservation insert failure');
        }
        return queryOne(sql, params);
      };
      return callback(tx);
    }, options);

    try {
      await expect(inventory.reserve({
        productId: id,
        quantity: 1,
        userId: uid('inventory-user'),
        idempotencyKey: `pgtest-rollback-key-${RUN}`,
      })).rejects.toThrow('forced reservation insert failure');
    } finally {
      db.transaction = originalTransaction;
    }

    await expect(stockFor(id)).resolves.toMatchObject({
      total_stock: 3,
      available_stock: 3,
      reserved_stock: 0,
      sold: 0,
    });
  });

  test('confirm atomically moves reserved stock to sold and rejects a replay', async () => {
    const id = await seedProduct('confirm', 5);
    const reservation = await inventory.reserve({
      productId: id,
      quantity: 2,
      userId: uid('inventory-user'),
      idempotencyKey: `pgtest-confirm-key-${RUN}`,
    });

    await expect(inventory.confirm(reservation.reservation.reservation_id)).resolves.toEqual({ success: true });
    await expect(stockFor(id)).resolves.toMatchObject({
      available_stock: 3,
      reserved_stock: 0,
      sold: 2,
    });
    await expect(inventory.confirm(reservation.reservation.reservation_id)).rejects.toMatchObject({ status: 409 });
  });

  test('cancel releases reserved stock and distinguishes missing from terminal reservations', async () => {
    const id = await seedProduct('cancel', 4);
    const reservation = await inventory.reserve({
      productId: id,
      quantity: 1,
      userId: uid('inventory-user'),
      idempotencyKey: `pgtest-cancel-key-${RUN}`,
    });

    await expect(inventory.cancel(reservation.reservation.reservation_id)).resolves.toEqual({ success: true });
    await expect(stockFor(id)).resolves.toMatchObject({
      available_stock: 4,
      reserved_stock: 0,
      sold: 0,
    });
    await expect(inventory.cancel(reservation.reservation.reservation_id)).rejects.toMatchObject({ status: 409 });
    await expect(inventory.cancel('missing-reservation')).rejects.toMatchObject({ status: 404 });
  });

  test('concurrent confirm and cancel commit exactly one terminal transition', async () => {
    const id = await seedProduct('confirm-cancel-race', 4);
    const reservation = await inventory.reserve({
      productId: id,
      quantity: 2,
      userId: uid('inventory-user'),
      idempotencyKey: `pgtest-confirm-cancel-key-${RUN}`,
    });
    const reservationId = reservation.reservation.reservation_id;

    const outcomes = await Promise.allSettled([
      inventory.confirm(reservationId),
      inventory.cancel(reservationId),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected.reason).toMatchObject({ status: 409 });

    const stock = await stockFor(id);
    const confirmed = await db.queryOne(
      'SELECT status FROM reservations WHERE reservation_id = $1',
      [reservationId]
    );
    expect(['CONFIRMED', 'CANCELLED']).toContain(confirmed.status);
    expect(stock.reserved_stock).toBe(0);
    if (confirmed.status === 'CONFIRMED') {
      expect(stock).toMatchObject({ available_stock: 2, sold: 2 });
    } else {
      expect(stock).toMatchObject({ available_stock: 4, sold: 0 });
    }
  });

  test('expiry restores stock and allows its idempotency key to be reused', async () => {
    const id = await seedProduct('expiry', 3);
    const key = `pgtest-expiry-key-${RUN}`;
    const request = {
      productId: id,
      quantity: 1,
      userId: uid('inventory-user'),
      idempotencyKey: key,
    };
    const first = await inventory.reserve(request);
    await db.query(
      "UPDATE reservations SET expires_at = now() - interval '1 second' WHERE reservation_id = $1",
      [first.reservation.reservation_id]
    );

    await expect(inventory.releaseExpired()).resolves.toEqual({ released: 1 });
    await expect(stockFor(id)).resolves.toMatchObject({ available_stock: 3, reserved_stock: 0 });

    const replacement = await inventory.reserve(request);
    expect(replacement.idempotent).toBe(false);
    expect(replacement.reservation.reservation_id).not.toBe(first.reservation.reservation_id);
  });

  test('confirming an expired reservation returns 410 and releases stock', async () => {
    const id = await seedProduct('expired-confirm', 3);
    const reservation = await inventory.reserve({
      productId: id,
      quantity: 1,
      userId: uid('inventory-user'),
      idempotencyKey: `pgtest-expired-confirm-key-${RUN}`,
    });
    await db.query(
      "UPDATE reservations SET expires_at = now() - interval '1 second' WHERE reservation_id = $1",
      [reservation.reservation.reservation_id]
    );

    await expect(inventory.confirm(reservation.reservation.reservation_id)).rejects.toMatchObject({ status: 410 });
    await expect(stockFor(id)).resolves.toMatchObject({ available_stock: 3, reserved_stock: 0, sold: 0 });
  });
});
