'use strict';

// Live end-to-end verification of the PostgreSQL-backed auth / profile /
// addresses flows against a running server (Phase 6 verification):
//
//   node scripts/pg-live-verify.js phase1    # health + register + me + addresses
//     <restart the server>
//   node scripts/pg-live-verify.js phase2    # login + persistence + CRUD
//     <stop the server>
//   node scripts/pg-live-verify.js cleanup   # remove the probe user + JSON mirrors
//
// Fails (exit 1) when the server is not in healthy PostgreSQL mode.

const fs = require('fs');
const path = require('path');

const BASE = process.env.LIVE_BASE_URL || 'http://localhost:5000';
const STATE_FILE = path.join(__dirname, 'pg-live-state.json');

async function api(method, url, { token, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON body */ }
  return { status: res.status, data };
}

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

function readState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

async function phase1() {
  const health = await api('GET', '/api/health');
  console.log('[health]', health.status, JSON.stringify(health.data));
  if (!health.data || health.data.postgresEnabled !== true || health.data.postgresHealthy !== true) {
    fail('server is not running in healthy PostgreSQL mode');
  }
  if (health.data.dataStore !== 'postgres') fail('dataStore is not postgres');

  const email = `pglive-${Date.now()}@example.com`;
  const password = 'LiveTest123!';

  const reg = await api('POST', '/api/auth/register', {
    body: { name: 'PG Live User', email, password, companyName: 'LiveCo' },
  });
  console.log('[register]', reg.status, JSON.stringify(reg.data && reg.data.user));
  if (reg.status !== 201 || !reg.data.token) fail('register did not return 201 + token');
  const token = reg.data.token;

  const me = await api('GET', '/api/auth/me', { token });
  console.log('[me]', me.status, JSON.stringify(me.data && me.data.user));
  if (me.status !== 200 || !me.data.user || me.data.user._id !== reg.data.user._id) {
    fail('/api/auth/me mismatch');
  }

  const addr = await api('POST', '/api/addresses', {
    token,
    body: { label: 'Live', name: 'Live User', line1: '1 Test St', city: 'Pune', state: 'MH', pincode: '411001' },
  });
  console.log('[add-address]', addr.status, JSON.stringify(addr.data));
  if (addr.status !== 201 || !addr.data.address) fail('add address');

  const list = await api('GET', '/api/addresses', { token });
  console.log('[list-addresses]', list.status, JSON.stringify(list.data));
  if (list.status !== 200 || !Array.isArray(list.data.addresses) || list.data.addresses.length !== 1) {
    fail('address list after create');
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify({ email, password, userId: reg.data.user._id }, null, 2));
  console.log(`PHASE1 OK (user ${reg.data.user._id}, ${email}) - restart the server, then run phase2`);
}

async function phase2() {
  const state = readState();

  const login = await api('POST', '/api/auth/login', {
    body: { email: state.email, password: state.password },
  });
  console.log('[login-after-restart]', login.status, JSON.stringify(login.data));
  if (login.status !== 200 || !login.data.token) fail('login after restart');
  const token = login.data.token;

  const me = await api('GET', '/api/auth/me', { token });
  console.log('[me]', me.status, JSON.stringify(me.data && me.data.user));
  if (me.status !== 200 || me.data.user.email !== state.email) fail('me after restart');

  const list = await api('GET', '/api/addresses', { token });
  console.log('[list-addresses-persisted]', list.status, JSON.stringify(list.data));
  if (list.status !== 200 || !Array.isArray(list.data.addresses) || list.data.addresses.length !== 1) {
    fail('address did not survive the restart');
  }
  const addrId = list.data.addresses[0]._id;

  const upd = await api('PUT', `/api/addresses/${addrId}`, { token, body: { city: 'Mumbai' } });
  console.log('[update-address]', upd.status, JSON.stringify(upd.data));
  if (upd.status !== 200 || upd.data.address.city !== 'Mumbai') fail('address update');

  const profile = await api('PUT', '/api/profile', {
    token,
    body: { phone: '+91 999-999-9999', state: 'KA' },
  });
  console.log('[put-profile]', profile.status, JSON.stringify(profile.data));
  if (profile.status !== 200 || profile.data.phone !== '+91 999-999-9999' || profile.data.state !== 'KA') {
    fail('profile update');
  }

  const del = await api('DELETE', `/api/addresses/${addrId}`, { token });
  console.log('[delete-address]', del.status, JSON.stringify(del.data));
  if (del.status !== 200) fail('address delete');

  const empty = await api('GET', '/api/addresses', { token });
  if (empty.status !== 200 || empty.data.addresses.length !== 0) fail('address list after delete');

  console.log('PHASE2 OK - auth + addresses persisted across restart and mutate correctly in PostgreSQL');
}

async function cleanup() {
  const state = readState();

  // Remove the probe user from PostgreSQL (history/addresses cascade).
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await pool.query('DELETE FROM users WHERE id = $1', [state.userId]);
    console.log('[cleanup] pg user rows deleted:', r.rowCount);
  } finally {
    await pool.end();
  }

  // Remove the legacy mirror row + welcome notification written during the run.
  const usersFile = path.join(__dirname, '..', 'data', 'users.json');
  if (fs.existsSync(usersFile)) {
    const rows = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    const kept = rows.filter((u) => String(u._id) !== String(state.userId));
    if (kept.length !== rows.length) {
      fs.writeFileSync(usersFile, JSON.stringify(kept, null, 2));
      console.log('[cleanup] removed probe user from data/users.json');
    }
  }
  const notifFile = path.join(__dirname, '..', 'data', 'notifications.json');
  if (fs.existsSync(notifFile)) {
    const rows = JSON.parse(fs.readFileSync(notifFile, 'utf8'));
    const kept = rows.filter((n) => String(n.userId) !== String(state.userId));
    if (kept.length !== rows.length) {
      fs.writeFileSync(notifFile, JSON.stringify(kept, null, 2));
      console.log('[cleanup] removed probe notifications from data/notifications.json');
    }
  }
  fs.unlinkSync(STATE_FILE);
  console.log('CLEANUP OK');
}

const phase = process.argv[2];
const run = { phase1, phase2, cleanup }[phase];
if (!run) {
  console.error('usage: node scripts/pg-live-verify.js phase1|phase2|cleanup');
  process.exit(2);
}
run().catch((err) => fail(err.stack || err.message));
