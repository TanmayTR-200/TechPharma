const jwt = require('jsonwebtoken');
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

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      name,
      role,
      company: company || {}
    });

    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
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

// ================= FORGOT PASSWORD (Stub) =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // TODO: Generate reset token, send email
    return res.json({
      success: true,
      message: `Password reset link (mock) would be sent to ${email}`
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ================= RESET PASSWORD (Stub) =================
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ message: 'Token and new password are required' });

    // TODO: Verify token, update password
    return res.json({
      success: true,
      message: 'Password reset successful (mock)'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
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
