/**
 * Auth API integration tests — runs the REAL server via supertest.
 *
 * Isolation:
 *  - MONGODB_URI is blanked → server runs on file storage (tests never touch Mongo/Atlas)
 *  - Rate limiters are raised via env overrides (429 behavior is covered in rate-limits.test.js)
 *  - nodemailer is mocked to fail instantly (no real emails; providers fall back and throw)
 *  - data/*.json is backed up before the suite and restored after
 *
 * Covers: registration, login, forgot/reset password (single-use links,
 * password history, cooldown), persistent lockout, signup + delete OTPs.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-auth-tests';
process.env.MONGODB_URI = '';
process.env.PORT = '5991';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.RESET_RATE_LIMIT_MAX = '100000';
process.env.CHANGE_RATE_LIMIT_MAX = '100000';
process.env.API_RATE_LIMIT_MAX = '100000';
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

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OTPS_FILE = path.join(DATA_DIR, 'otps.json');
const BACKUP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-auth-test-'));

// Back up all data files BEFORE the server preloads them
for (const f of fs.readdirSync(DATA_DIR)) {
  if (f.endsWith('.json')) fs.copyFileSync(path.join(DATA_DIR, f), path.join(BACKUP_DIR, f));
}

const app = require('../server');

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const findUser = (email) => readUsers().find(u => u.email === email);
const readOtps = () => JSON.parse(fs.readFileSync(OTPS_FILE, 'utf8'));

afterAll(() => {
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    fs.copyFileSync(path.join(BACKUP_DIR, f), path.join(DATA_DIR, f));
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });

  // otps.json is created by the tests (no backup existed) — remove the leftover
  if (fs.existsSync(OTPS_FILE)) fs.rmSync(OTPS_FILE);
});

// ---- Test fixtures ----
const USER_A = { name: 'User A', email: 'test.a@example.com', password: 'PasswordA123!', companyName: 'A Corp' };
const USER_B = { name: 'User B', email: 'test.b@example.com', password: 'PasswordB123!', companyName: 'B Corp' };
const USER_C = { name: 'User C', email: 'test.c@example.com', password: 'PasswordC123!', companyName: 'C Corp' };
const OTP_EMAIL = 'test.otp@example.com';
const GENERIC_LOGIN_FAIL = 'Incorrect email or password';
const GENERIC_RESET_SENT = 'If an account exists with that email, you will receive password reset instructions.';

describe('Registration', () => {
  test('registers a new user → 201, token and sanitized user object', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: USER_A.name, email: USER_A.email, password: USER_A.password, companyName: USER_A.companyName });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(USER_A.email);
    expect(res.body.user.name).toBe(USER_A.name);
    expect(res.body.user.password).toBeUndefined(); // never leak the hash
  });

  test('rejects duplicate email → 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: USER_A.name, email: USER_A.email, password: 'AnyPassword123!' });

    expect(res.status).toBe(409);
  });

  test('rejects invalid email → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Valid Name', email: 'not-an-email', password: 'Password123!' });

    expect(res.status).toBe(400);
  });

  test('rejects short password (7 chars) → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Valid Name', email: 'shortpw@example.com', password: 'seven7!' });

    expect(res.status).toBe(400);
  });

  test('rejects short name → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'shortname@example.com', password: 'Password123!' });

    expect(res.status).toBe(400);
  });
});

describe('Login', () => {
  test('correct credentials → 200 with token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_A.email, password: USER_A.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(USER_A.email);
  });

  test('wrong password → 401 with generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_A.email, password: 'WrongPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_LOGIN_FAIL);
  });

  test('unknown email → 401 with the SAME generic message (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'who-does-not-exist@example.com', password: 'Whatever123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_LOGIN_FAIL);
  });
});

describe('Forgot / reset password (user A)', () => {
  let usedResetToken; // captured before the successful reset consumes it

  test('forgot-password for unknown email → 200 generic response', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown-user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_RESET_SENT);
  });

  test('forgot-password for real user → stores reset token on the user doc', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: USER_A.email });

    expect(res.status).toBe(200);
    const user = findUser(USER_A.email);
    expect(user.resetToken).toBeDefined();
    expect(user.resetToken.token).toBeDefined();
    expect(new Date(user.resetToken.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('second request within cooldown → does NOT mint a new token', async () => {
    const before = findUser(USER_A.email).resetToken.token;

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: USER_A.email });

    expect(res.status).toBe(200);
    expect(findUser(USER_A.email).resetToken.token).toBe(before);
  });

  test('verify-reset-token with garbage → 400', async () => {
    const res = await request(app)
      .get('/api/auth/verify-reset-token?token=garbage-token');

    expect(res.status).toBe(400);
  });

  test('verify-reset-token rejects a login-purpose JWT (token reuse across purposes)', async () => {
    const loginToken = jwt.sign({ userId: '1760257427529' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const res = await request(app)
      .get(`/api/auth/verify-reset-token?token=${loginToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid reset link');
  });

  test('verify-reset-token with the real token → 200 with user identity', async () => {
    const token = findUser(USER_A.email).resetToken.token;
    const res = await request(app)
      .get(`/api/auth/verify-reset-token?token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(USER_A.email);
    expect(res.body.user.name).toBe(USER_A.name);
  });

  test('reset with too-short password → 400', async () => {
    const token = findUser(USER_A.email).resetToken.token;
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'short' });

    expect(res.status).toBe(400);
  });

  test('reset to the CURRENT password → 400 (history blocks reuse)', async () => {
    const token = findUser(USER_A.email).resetToken.token;
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: USER_A.password });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot reuse/i);
  });

  test('reset with a new password → 200; link invalidated, history written', async () => {
    const token = findUser(USER_A.email).resetToken.token;
    usedResetToken = token;
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'NewPasswordA456!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = findUser(USER_A.email);
    expect(user.resetToken).toBeNull();
    expect(user.passwordChangedAt).toBeDefined();
    expect(user.passwordHistory.length).toBeGreaterThanOrEqual(2);
  });

  test('reusing the SAME reset link → 400 (single-use)', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: usedResetToken, password: 'AnotherPass789!' });

    expect(res.status).toBe(400);
  });

  test('old password no longer logs in; new one does', async () => {
    const old = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_A.email, password: USER_A.password });
    expect(old.status).toBe(401);

    const fresh = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_A.email, password: 'NewPasswordA456!' });
    expect(fresh.status).toBe(200);
  });
});

describe('Change password + history (user B)', () => {
  let token;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: USER_B.name, email: USER_B.email, password: USER_B.password, companyName: USER_B.companyName });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_B.email, password: USER_B.password });
    token = res.body.token;
  });

  test('change-password requires auth → 401 without token', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: USER_B.password, newPassword: 'WhateverNew123!' });

    expect(res.status).toBe(401);
  });

  test('change to the SAME password → 400 (reuse blocked)', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: USER_B.password, newPassword: USER_B.password });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot reuse/i);
  });

  test('change to a new password → 200', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: USER_B.password, newPassword: 'PasswordB456!!' });

    expect(res.status).toBe(200);
  });

  test('changing BACK to the previous password → 400 (history spans changes)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_B.email, password: 'PasswordB456!!' });
    const freshToken = login.body.token;

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ currentPassword: 'PasswordB456!!', newPassword: USER_B.password });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot reuse/i);
  });
});

describe('Persistent lockout (user C)', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: USER_C.name, email: USER_C.email, password: USER_C.password, companyName: USER_C.companyName });
  });

  test('five failed logins → lockout is PERSISTED on the user doc', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: USER_C.email, password: 'WrongPassword99!' });
      expect(res.status).toBe(401);
    }

    const user = findUser(USER_C.email);
    expect(user.failedAttempts).toBe(5);
    expect(user.lockedUntil).toBeDefined();
    expect(new Date(user.lockedUntil).getTime()).toBeGreaterThan(Date.now());
  });

  test('login with the CORRECT password is blocked while locked', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_C.email, password: USER_C.password });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_LOGIN_FAIL);
  });

  test('password reset clears the lockout (ownership proven)', async () => {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: USER_C.email });
    expect(forgot.status).toBe(200);

    const token = findUser(USER_C.email).resetToken.token;
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'FreshPasswordC789!' });
    expect(reset.status).toBe(200);

    const user = findUser(USER_C.email);
    expect(user.failedAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_C.email, password: 'FreshPasswordC789!' });
    expect(login.status).toBe(200);
  });
});

describe('Signup OTP (persistent store)', () => {
  test('send-otp → 200 and the OTP is persisted (not in memory)', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: OTP_EMAIL });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const entries = readOtps().filter(e => e.email === OTP_EMAIL && e.purpose === 'signup');
    expect(entries.length).toBe(1);
    expect(entries[0].otp).toMatch(/^\d{6}$/);
    expect(entries[0].expiresAt).toBeGreaterThan(Date.now());
  });

  test('verify-otp with a wrong code → 400', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: OTP_EMAIL, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid OTP');
  });

  test('verify-otp with the right code → 200 and the entry is consumed', async () => {
    const entry = readOtps().find(e => e.email === OTP_EMAIL && e.purpose === 'signup');
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: OTP_EMAIL, otp: entry.otp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(readOtps().filter(e => e.email === OTP_EMAIL && e.purpose === 'signup').length).toBe(0);
  });

  test('verify-otp after consumption → 400 (no OTP requested)', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: OTP_EMAIL, otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No OTP requested for this email');
  });
});

describe('Account deletion with OTP (user A)', () => {
  test('send-delete-otp → 200, persisted with purpose "delete"', async () => {
    const res = await request(app)
      .post('/api/auth/send-delete-otp')
      .send({ email: USER_A.email });

    expect(res.status).toBe(200);
    expect(readOtps().some(e => e.email === USER_A.email && e.purpose === 'delete')).toBe(true);
  });

  test('delete-account with wrong OTP → 400, user survives', async () => {
    const res = await request(app)
      .post('/api/auth/delete-account')
      .send({ email: USER_A.email, otp: '000000' });

    expect(res.status).toBe(400);
    expect(findUser(USER_A.email)).toBeDefined();
  });

  test('delete-account with the right OTP → 200, user removed', async () => {
    const entry = readOtps().find(e => e.email === USER_A.email && e.purpose === 'delete');
    const res = await request(app)
      .post('/api/auth/delete-account')
      .send({ email: USER_A.email, otp: entry.otp });

    expect(res.status).toBe(200);
    expect(findUser(USER_A.email)).toBeUndefined();
  });
});
