const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign(
    { userId: id },
    process.env.JWT_SECRET || 'dev_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { email, password, name, role = 'buyer', company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check for existing user - more reliable case-insensitive check
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ 
        success: false,
        message: 'This email is already registered. Please try logging in instead.',
        redirectTo: '/auth?mode=login'
      });
    }

    // Create user with unverified status
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      name,
      role,
      company: company || {},
      isVerified: false
    });

    // Generate and send OTP
    const { sendOTP } = require('../utils/otpService');
    await sendOTP(user._id);

    // Generate temporary token
    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Please check your email for a verification code',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        isVerified: user.isVerified
      },
      requiresVerification: true
    });
  } catch (error) {
    console.error('❌ Registration error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, you will receive a verification code.'
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes

    // Save OTP
    user.otp = {
      code: otp,
      expiresAt,
      attempts: 0,
      lastSent: new Date()
    };
    await user.save();

    // Send OTP (in development, this will just log to console)
    const { sendOTPEmail } = require('../utils/emailService');
    await sendOTPEmail(user.email, otp);

    // Generate temporary token for the frontend
    const token = signToken(user._id);

    return res.json({
      success: true,
      message: 'Verification code has been generated. Check the server console to see it.',
      token,
      user: {
        id: user._id,
        email: user.email
      },
      requiresVerification: true
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, otp } = req.body;
    if (!token || !password || !otp) {
      return res.status(400).json({ message: 'Token, OTP, and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Verify JWT token to get userId
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
    const userId = decoded.userId;

    // Find user
    const user = await User.findById(userId).select('+otp.code +otp.expiresAt +otp.attempts');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    if (!user.otp?.code || !user.otp.expiresAt) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }

    if (Date.now() > user.otp.expiresAt.getTime()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (user.otp.code !== otp) {
      user.otp.attempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    // Update password and clear OTP
    user.password = password;
    user.otp = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    if (error.message === 'Invalid or expired reset token') {
      return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ================= GET CURRENT USER =================
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user is set by auth middleware
    return res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        company: req.user.company
      }
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
