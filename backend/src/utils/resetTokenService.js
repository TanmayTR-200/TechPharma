const jwt = require('jsonwebtoken');
const { sendResetEmail } = require('./emailService');

/**
 * Generate a reset token that expires in 1 hour
 */
exports.generateResetToken = (userId) => {
  return jwt.sign(
    { userId, purpose: 'reset' },
    process.env.JWT_SECRET || 'dev_jwt_secret',
    { expiresIn: '1h' }
  );
};

/**
 * Verify a reset token
 */
exports.verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
    if (decoded.purpose !== 'reset') {
      throw new Error('Invalid token purpose');
    }
    return decoded.userId;
  } catch (error) {
    throw new Error('Invalid or expired reset token');
  }
};