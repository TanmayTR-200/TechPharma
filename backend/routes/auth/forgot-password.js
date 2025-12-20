const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

router.post('/', (req, res) => {
  console.log('Received forgot password request:', req.body);
  const { email } = req.body;

  // For development, we'll create a reset token for the test user
  if (email === 'tanmaytr05@gmail.com') {
    // Generate reset token with minimal payload
    const resetToken = jwt.sign(
      { userId: '1', purpose: 'reset', iat: Date.now() },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated reset token for testing:', resetToken);

    // Log token verification attempt
    try {
      const decoded = jwt.verify(resetToken, JWT_SECRET);
      console.log('Token verification test succeeded:', decoded);
    } catch (error) {
      console.error('Token verification test failed:', error);
    }

    res.status(200).json({
      success: true,
      message: "Reset instructions have been sent to your email.",
      token: resetToken
    });
  } else {
    // Don't reveal if the email exists
    res.status(200).json({
      success: true,
      message: "If an account exists with that email, you will receive reset instructions."
    });
  }
});

module.exports = router;