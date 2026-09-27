'use strict';

// Bridge to the pre-PostgreSQL storage (in-memory cache + data/*.json).
//
// This module exists ONLY while the migration is in progress. Repositories call it
// when PostgreSQL is not configured, so the application behaves exactly as before
// on environments without DATABASE_URL (local dev, the jest suites, a rollback).
// Once every domain is migrated (Phases 11-12) this file and the JSON cache can be
// deleted without touching the repositories.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function fileFor(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

// server.js exposes the shared cache helpers on `global` (to avoid circular
// requires). When present they are the fast, authoritative legacy path: reads hit
// the RAM cache and writes keep the cache, the JSON file and MongoDB in sync.
function hasSharedStore() {
  return typeof global.readJsonFile === 'function' && typeof global.writeJsonFile === 'function';
}

/**
 * Read a whole collection (array of documents).
 * @param {string} collection e.g. 'users'
 * @returns {any[]}
 */
function read(collection) {
  const file = fileFor(collection);
  if (hasSharedStore()) {
    try {
      return global.readJsonFile(file) || [];
    } catch (err) {
      console.error(`[db:legacy] cache read failed for ${collection}:`, err.message);
    }
  }
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`[db:legacy] file read failed for ${collection}:`, err.message);
    return [];
  }
}

/**
 * Persist a whole collection. Uses the shared writer when running inside the
 * server (cache + JSON + MongoDB delta), otherwise writes the file directly.
 */
function write(collection, rows) {
  const file = fileFor(collection);
  if (hasSharedStore()) {
    global.writeJsonFile(file, rows);
    return;
  }
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
}

/** O(1) lookup by _id when available, else linear scan. */
function findById(collection, id) {
  if (id === undefined || id === null) return null;
  if (typeof global.findById === 'function') {
    return global.findById(collection, id);
  }
  return read(collection).find((d) => String(d._id) === String(id)) || null;
}

/**
 * Lookup by a field value.
 * @param {{ caseInsensitive?: boolean }} [options]
 */
function findByField(collection, field, value, options = {}) {
  if (value === undefined || value === null) return null;
  if (!options.caseInsensitive && typeof global.findByField === 'function') {
    return global.findByField(collection, field, value);
  }
  const target = options.caseInsensitive ? String(value).toLowerCase() : String(value);
  return (
    read(collection).find((d) => {
      const v = d[field];
      if (v === undefined || v === null) return false;
      return options.caseInsensitive ? String(v).toLowerCase() === target : String(v) === target;
    }) || null
  );
}

/** Same id scheme as server.js (Date.now() as a string). */
function generateId() {
  return Date.now().toString();
}

/**
 * Mirror a PostgreSQL write back into the legacy cache/JSON.
 * Temporary (Phases 6-11): read paths that are not migrated yet (dashboard,
 * products, orders) still read from the cache, and must not see stale users.
 * Controlled by PG_MIRROR_LEGACY_WRITES (default on) and removed in Phase 12.
 */
function isMirrorEnabled() {
  return process.env.PG_MIRROR_LEGACY_WRITES !== 'false';
}

module.exports = {
  DATA_DIR,
  fileFor,
  hasSharedStore,
  read,
  write,
  findById,
  findByField,
  generateId,
  isMirrorEnabled,
};
