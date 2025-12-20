// otpService.js
const crypto = require('crypto');
const User = require('../models/User');
const { sendOTPEmail } = require('./emailService');

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 3;
const OTP_RESEND_DELAY = 30 * 1000; // 30 seconds

// Generate a random numeric OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

exports.sendOTP = async (userId) => {
  const user = await User.findById(userId).select('+otp.lastSent');
  if (!user) {
    throw new Error('User not found');
  }

  // Check if OTP was recently sent
  if (user.otp?.lastSent && Date.now() - user.otp.lastSent.getTime() < OTP_RESEND_DELAY) {
    throw new Error('Please wait before requesting another code');
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY);

  // Update user with new OTP
  user.otp = {
    code: otp,
    expiresAt,
    attempts: 0,
    lastSent: new Date()
  };

  await user.save();

  // Send OTP via email
  await sendOTPEmail(user.email, otp);
};

exports.verifyOTP = async (userId, code) => {
  const user = await User.findById(userId).select('+otp.code +otp.expiresAt +otp.attempts');
  if (!user) {
    throw new Error('User not found');
  }

  // Check if OTP exists and hasn't expired
  if (!user.otp?.code || !user.otp.expiresAt) {
    throw new Error('No verification code found. Please request a new one');
  }

  if (Date.now() > user.otp.expiresAt.getTime()) {
    throw new Error('Verification code has expired. Please request a new one');
  }

  // Check attempts
  if (user.otp.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error('Too many attempts. Please request a new code');
  }

  // Increment attempts
  user.otp.attempts += 1;
  await user.save();

  // Verify OTP
  if (user.otp.code !== code) {
    throw new Error('Invalid verification code');
  }

  // OTP is valid - update user
  user.isVerified = true;
  user.otp = undefined; // Clear OTP data
  await user.save();

  return true;
};