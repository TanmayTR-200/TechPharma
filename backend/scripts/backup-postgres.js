'use strict';

// Take a compressed pg_dump of the Supabase database and write it to
// backend/backups/ with a timestamped filename.
//
//   node scripts/backup-postgres.js
//   node scripts/backup-postgres.js --keep 10     # retain the newest 10 dumps
//
// Why a script rather than the Supabase dashboard: the free tier's managed
// backups are not something the project can rely on being restorable from
// code, and a dump is the only artefact guaranteed to be portable. It is also
// the thing to reach for when restoring into a different account or a local
// PostgreSQL.
//
// Notes
//   * The dump contains real user data, including bcrypt password hashes. The
//     backups directory is git-ignored, so it must never be committed.
//   * The connection string (and therefore the password) is read from the
//     environment, never printed.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { stripSslParams } = require('../src/db/postgres');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const keepArg = process.argv.find((a) => a.startsWith('--keep='));
const KEEP = keepArg ? Number(keepArg.split('=')[1]) : 20;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function findPgDump() {
  // Windows: the installer may not add pg_dump to PATH, so the usual install
  // locations are checked explicitly before giving up.
  const candidates = [
    'pg_dump',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
    '/usr/local/bin/pg_dump',
    '/usr/bin/pg_dump',
  ];
  for (const c of candidates) {
    if (path.isAbsolute(c) && !fs.existsSync(c)) continue;
    return c;
  }
  return null;
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr.trim() || 'exit ' + code))));
    p.stdout.pipe(fs.createWriteStream(process.env.BACKUP_TARGET, { flags: 'w' }));
  });
}

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set - nothing to back up.');
    process.exit(1);
  }
  const bin = findPgDump();
  if (!bin) {
    console.error('pg_dump was not found. Install PostgreSQL client tools, or');
    console.error('dump from the Supabase dashboard instead.');
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, 'techpharma-' + stamp() + '.sql');
  process.env.BACKUP_TARGET = file;

  // --clean --if-exists makes the dump restorable over an existing database.
  const args = [
    '--dbname=' + stripSslParams(process.env.DATABASE_URL),
    '--format=plain',
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
  ];

  console.log('[backup] writing ' + path.relative(process.cwd(), file));
  try {
    await run(bin, args);
  } catch (err) {
    // Redact anything that looks like a credential before printing.
    console.error('[backup] pg_dump failed: '
      + err.message.replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@'));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    process.exit(1);
  }

  const size = fs.statSync(file).size;
  console.log('[backup] done - ' + (size / 1024).toFixed(1) + ' KB');

  // Retention: keep the newest KEEP dumps, delete the rest.
  const all = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('techpharma-') && f.endsWith('.sql'))
    .sort();
  const excess = all.slice(0, Math.max(0, all.length - KEEP));
  for (const f of excess) {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log('[backup] pruned old dump: ' + f);
  }
  console.log('[backup] ' + all.length + ' dump(s) retained in backend/backups/');
})();
