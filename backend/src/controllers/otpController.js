// ================= VERIFY OTP =================
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user?.id; // Set by auth middleware

    if (!userId || !otp) {
      return res.status(400).json({ message: 'User ID and OTP are required' });
    }

    const { verifyOTP } = require('../utils/otpService');
    await verifyOTP(userId, otp);

    return res.json({
      success: true,
      message: 'Email verification successful',
      isVerified: true
    });
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    return res.status(400).json({ message: error.message });
  }
};

// ================= RESEND OTP =================
exports.resendOTP = async (req, res) => {
  try {
    const userId = req.user?.id; // Set by auth middleware

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const { sendOTP } = require('../utils/otpService');
    await sendOTP(userId);

    return res.json({
      success: true,
      message: 'Verification code sent'
    });
  } catch (error) {
    console.error('❌ OTP resend error:', error);
    if (error.message.includes('wait')) {
      return res.status(429).json({ message: error.message }); // Too Many Requests
    }
    return res.status(500).json({ message: error.message });
  }
};