const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Password - TechPharma',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a1a1a; margin-bottom: 10px;">Reset Your Password</h1>
            <p style="color: #666; font-size: 16px;">You requested to reset your password.</p>
          </div>
          
          <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin-bottom: 20px; color: #333;">Click the button below to reset your password:</p>
            <a href="${resetLink}" 
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 13px;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail
};