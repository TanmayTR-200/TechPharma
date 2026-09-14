/**
 * Dashboard API integration tests — runs the REAL server via supertest.
 *
 * Regression guard: /api/dashboard must never 500 for the admin account.
 * (A TDZ crash — the byNewest comparator was used before its const
 * declaration inside the admin branch — once broke every admin request
 * while non-admin users kept working.)
 *
 * Isolation mirrors auth.test.js: MONGODB_URI blanked (file storage),
 * rate limits raised, data/*.json backed up and restored, SQLite in tmp.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-dashboard-tests';
process.env.MONGODB_URI = '';
process.env.PORT = '5993';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.API_RATE_LIMIT_MAX = '100000';
process.env.SQLITE_PATH = require('path').join(
  require('os').tmpdir(),
  'tp-dashboard-test-' + Date.now() + '.db'
);

const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-dash-test-'));

// Back up all data files BEFORE the server preloads them
for (const f of fs.readdirSync(DATA_DIR)) {
  if (f.endsWith('.json')) fs.copyFileSync(path.join(DATA_DIR, f), path.join(BACKUP_DIR, f));
}

const app = require('../server');

afterAll(() => {
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    fs.copyFileSync(path.join(BACKUP_DIR, f), path.join(DATA_DIR, f));
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });

  const dbPath = process.env.SQLITE_PATH;
  if (dbPath) {
    [dbPath, dbPath + '-wal', dbPath + '-shm'].forEach(f => {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (e) {
        // Windows: the running server may still hold the SQLite file open —
        // the temp file is disposable, so a locked unlink is not a failure.
      }
    });
  }
});

const adminToken = jwt.sign({ userId: '1760257427529' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const regularToken = jwt.sign({ userId: '1787500000000' }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('GET /api/dashboard', () => {
  test('admin request returns platform data without 500 (TDZ regression)', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Admin-only platform payload must be present and well-formed
    expect(res.body.data.admin).not.toBeNull();
    expect(typeof res.body.data.admin.stats.totalUsers).toBe('number');
    expect(typeof res.body.data.admin.stats.platformRevenue).toBe('number');
    expect(Array.isArray(res.body.data.admin.recentUsers)).toBe(true);
    expect(Array.isArray(res.body.data.admin.recentTransactions)).toBe(true);

    // Activity feed (admin = platform-wide events) must be an array
    expect(Array.isArray(res.body.data.activity)).toBe(true);
  });

  test('non-admin keeps the personal view with no platform payload', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', 'Bearer ' + regularToken);

    expect(res.status).toBe(200);
    expect(res.body.data.admin).toBeNull();
    expect(Array.isArray(res.body.data.activity)).toBe(true);
  });
});
