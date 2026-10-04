'use strict';

/**
 * CI fixtures - makes the jest suites runnable on a CLEAN checkout.
 *
 * Why this exists
 * ---------------
 * backend/data/*.json is git-ignored (real runtime data must never be committed),
 * so a fresh clone - a GitHub Actions runner, a new laptop, CI - has an empty
 * data directory. The suites that run the real server (auth, dashboard,
 * rate-limits) read that directory at require time and expect real user rows:
 * dashboard.test.js signs a JWT for the admin id 1760257427529 and asserts the
 * platform-wide payload, which is impossible to resolve without that user.
 * Without these fixtures the suite fails on a clean runner while passing on a
 * developer machine that happens to have data lying around - the worst kind of
 * discrepancy.
 *
 * What it writes
 * --------------
 * Only the minimum the suites need, into backend/data/:
 *   users.json          admin (1760257427529) + regular user (1787500000000),
 *                       the exact ids dashboard.test.js signs tokens for
 *   orders/products/... empty arrays so server.js preloads without warnings
 *
 * Safety
 * ------
 * Refuses to run when backend/data/users.json already exists, unless --force is
 * passed. This must never overwrite a real database during local development;
 * the guard is the difference between a convenience script and a data-loss bug.
 *
 * Usage
 * -----
 *   node scripts/ci-seed.js           # only if data/ has no users.json
 *   node scripts/ci-seed.js --force   # overwrite (CI)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// The ids below are load-bearing: tests/dashboard.test.js signs a JWT for each
// of them and asserts admin-vs-user behaviour, so they must not be "improved".
const ADMIN_ID = '1760257427529';
const USER_ID = '1787500000000';

// bcrypt hashes generated once for the fixture passwords. These accounts are
// throwaway CI-only rows; the plaintext lives in CI logs only if someone
// deliberately logs in as them.
const ADMIN_PASSWORD_HASH = '$2b$10$ZxKhiWSqC/zlOMgd67NBYegNMIMkVc/a3B6P/D3eFs2CX0d8MKfBa';
const USER_PASSWORD_HASH = '$2b$10$VoVYArJyLMqhStVdWsA0A.ife78uijFXExNBcf2N1z05npVzUeW.2';

const FIXED_DATE = '2024-01-01T00:00:00.000Z';

const FIXTURE_USERS = [
  {
    _id: ADMIN_ID,
    email: 'techpharma10@gmail.com',
    password: ADMIN_PASSWORD_HASH,
    name: 'TechPharma_Admin',
    role: 'admin',
    company: { name: 'ABC' },
    phone: '',
    state: '',
    createdAt: FIXED_DATE
  },
  {
    _id: USER_ID,
    email: 'tanmaytr05@gmail.com',
    password: USER_PASSWORD_HASH,
    name: 'CI Regular User',
    role: 'user',
    company: { name: 'ABC' },
    phone: '',
    state: '',
    createdAt: FIXED_DATE
  }
];

// Every collection server.js preloads. Seeded empty so the cache loader and the
// Mongo/file bridging have a file to read instead of logging ENOENT noise.
const COLLECTIONS = [
  'users',
  'products',
  'orders',
  'carts',
  'notifications',
  'messages',
  'conversations',
  'reservations',
  'otps'
];

function main() {
  const force = process.argv.includes('--force');

  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(USERS_FILE) && !force) {
    const current = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (current.length > 0) {
      console.error(
        '[ci-seed] REFUSING to run: backend/data/users.json already has ' +
          `${current.length} user(s). Real data is present, so this script would ` +
          'be destructive. Run without --force in a clean checkout / CI only.'
      );
      process.exit(1);
    }
  }

  for (const collection of COLLECTIONS) {
    const file = path.join(DATA_DIR, `${collection}.json`);
    const rows = collection === 'users' ? FIXTURE_USERS : [];

    if (fs.existsSync(file) && !force) continue;

    fs.writeFileSync(file, JSON.stringify(rows, null, 2));
    console.log(`[ci-seed] wrote ${collection}.json (${rows.length} rows)`);
  }

  console.log(
    `[ci-seed] done. Admin fixture id ${ADMIN_ID}, regular user id ${USER_ID}.`
  );
}

main();