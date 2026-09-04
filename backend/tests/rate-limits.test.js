/**
 * Rate-limit tests — runs a SEPARATE server instance with DEFAULT limiter
 * values (no env overrides) and verifies 429 behavior:
 *   - authLimiter:   5 logins/min          (shared across login/register/forgot)
 *   - resetLimiter:  5 resets / 15 min
 *   - changeLimiter: 10 changes / 15 min
 *
 * Isolation: same as auth.test.js (file storage, no emails, data backup/restore).
 * A seed user is appended to users.json BEFORE the server preloads it, so the
 * change-password tests don't consume the shared authLimiter budget.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-rate-limit-tests';
process.env.MONGODB_URI = '';
process.env.PORT = '5992';
process.env.EMAIL_USER = '';
process.env.EMAIL_APP_PASSWORD = '';

jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn(() => Promise.reject(new Error('SMTP disabled in tests')))
  })
}));

const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BACKUP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-ratelimit-test-'));

for (const f of fs.readdirSync(DATA_DIR)) {
  if (f.endsWith('.json')) fs.copyFileSync(path.join(DATA_DIR, f), path.join(BACKUP_DIR, f));
}

const SEED = { id: 'rate_limit_seed_user', email: 'ratelimit.seed@example.com', password: 'SeedPass123!' };

let app;
let authToken;

afterAll(() => {
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    fs.copyFileSync(path.join(BACKUP_DIR, f), path.join(DATA_DIR, f));
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
});

beforeAll(async () => {
  // Seed a real user (with a real bcrypt hash) before the server preloads users.json
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  if (!users.find(u => u.email === SEED.email)) {
    users.push({
      _id: SEED.id,
      email: SEED.email,
      password: await bcrypt.hash(SEED.password, 10),
      name: 'Rate Limit Seed',
      role: 'member',
      createdAt: new Date().toISOString()
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }

  app = require('../server');
  authToken = jwt.sign({ userId: SEED.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}, 120000);

describe('authLimiter — POST /api/auth/login', () => {
  test('6th login within a minute → 429 Too many attempts', async () => {
    // 5 unknown-email logins are allowed (401s), the 6th is rate-limited
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'limiter-probe@example.com', password: 'Whatever123!' });
      expect(res.status).toBe(401);
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'limiter-probe@example.com', password: 'Whatever123!' });

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/too many attempts/i);
  });
});

describe('resetLimiter — POST /api/auth/reset-password', () => {
  test('6th reset attempt within 15 min → 429', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'garbage-token', password: 'SomePassword123!' });
      expect(res.status).toBe(400);
    }

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'garbage-token', password: 'SomePassword123!' });

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/too many password reset attempts/i);
  });
});

describe('changeLimiter — POST /api/auth/change-password', () => {
  test('11th change attempt within 15 min → 429', async () => {
    // Wrong current password → 400s; the limiter counts every request
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'WrongCurrent123!', newPassword: 'AnotherNewPass456!' });
      expect(res.status).toBe(400);
    }

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ currentPassword: 'WrongCurrent123!', newPassword: 'AnotherNewPass456!' });

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/too many password change attempts/i);
  });
});
