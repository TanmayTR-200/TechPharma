const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const router = express.Router();

// Forgot password - simplified mock version
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  
  // For development, we'll just mock the password reset
  if (email === 'tanmaytr05@gmail.com') {
    const resetToken = 'test-reset-' + Date.now();
    
    console.log(`
=========================================
🔑 Password Reset Requested
-----------------------------------------
Email: ${email}
Reset Link: http://localhost:3000/auth/reset-password?token=${resetToken}
=========================================`);

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email. (Check the server console for the reset link)'
    });
  } else {
    // Don't reveal if email exists or not
    res.json({
      success: true,
      message: 'If this email is registered, you will receive password reset instructions.'
    });
  }
});

// Reset password endpoint
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Token and new password are required' 
    });
  }

  if (!token.startsWith('test-reset-')) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid or expired reset token' 
    });
  }

  // In development, we'll just return success
  res.json({
    success: true,
    message: 'Password has been reset successfully. You can now log in with your new password.'
  });
});

module.exports = router;