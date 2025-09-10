const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Authorization token required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check for user
    if (!decoded.userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    try {
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      req.user = user;
      next();
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'DB_ERROR'
      });
    }
  } catch (error) {
    console.error('Unexpected error in auth middleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'UNKNOWN_ERROR'
    });
  }
};
