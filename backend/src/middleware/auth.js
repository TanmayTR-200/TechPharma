const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Check if it's a test token
    if (token.startsWith('test-token-')) {
      const email = req.headers['x-user-email'] || 'tanmaytr05@gmail.com';
      const name = email === 'tanmaytr05@gmail.com' ? 'Tanmay T R' : email.split('@')[0];
      
      req.user = { 
        _id: '1760257427529',
        id: '1760257427529',
        email: email,
        name: name,
        role: 'user'
      };
      return next();
    }

    // For JWT tokens
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
      req.user = {
        _id: decoded._id,
        id: decoded._id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role || 'user'
      };
      return next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
