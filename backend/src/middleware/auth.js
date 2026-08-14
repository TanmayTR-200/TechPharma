const jwt = require('jsonwebtoken');

// Use the same secret as server.js so tokens are verified consistently
// (server.js: const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key')
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory token blacklist (for token invalidation on logout)
// Note: This is per-process. For multi-instance deployments, use Redis.
const tokenBlacklist = new Set();

// Clean expired tokens from blacklist every 5 minutes
setInterval(() => {
  for (const token of tokenBlacklist) {
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (e) {
      tokenBlacklist.delete(token);
    }
  }
}, 5 * 60 * 1000).unref();

function blacklistToken(token) {
  tokenBlacklist.add(token);
}

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Check token blacklist
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Session has been invalidated. Please log in again.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      _id: decoded.userId || decoded._id,
      id: decoded.userId || decoded._id,
    };
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports.blacklistToken = blacklistToken;