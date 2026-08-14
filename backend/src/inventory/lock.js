// Async mutex lock for serializing inventory mutations
// Ensures only one stock mutation runs at a time within the Node process

let isLocked = false;
const queue = [];

async function acquireLock() {
  if (!isLocked) {
    isLocked = true;
    return;
  }
  return new Promise(resolve => {
    queue.push(resolve);
  });
}

function releaseLock() {
  const next = queue.shift();
  if (next) {
    next();
  } else {
    isLocked = false;
  }
}

// Execute a function while holding the lock
async function withLock(fn) {
  await acquireLock();
  try {
    return await fn();
  } finally {
    releaseLock();
  }
}

module.exports = { withLock, acquireLock, releaseLock };
