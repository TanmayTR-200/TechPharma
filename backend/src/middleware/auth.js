const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

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

    // Check if password was changed after this token was issued
    const usersPath = path.join(__dirname, '../../data/users.json');
    if (fs.existsSync(usersPath)) {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const user = users.find(u => u._id === (decoded.userId || decoded._id));
      if (user && user.passwordChangedAt) {
        const tokenIssuedAt = new Date(decoded.iat * 1000);
        const passwordChangedAt = new Date(user.passwordChangedAt);
        if (tokenIssuedAt < passwordChangedAt) {
          return res.status(401).json({
            success: false,
            message: 'Session expired. Please log in again.'
          });
        }
      }
    }

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