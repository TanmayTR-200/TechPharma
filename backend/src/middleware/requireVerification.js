const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Get user from database (we already have user ID from auth middleware)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Email verification required',
        requiresVerification: true
      });
    }

    // Add full user object to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Verification check middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};