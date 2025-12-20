const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD // Use EMAIL_APP_PASSWORD instead of EMAIL_PASSWORD
  },
  debug: true // Enable debug logs
});

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: {
      name: 'TechPharma Support',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Reset Your Password - TechPharma',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>You have requested to reset your password. Click the link below to set a new password:</p>
        <p>
          <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from TechPharma. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    console.log('Attempting to send email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Detailed email error:', {
      code: error.code,
      message: error.message,
      command: error.command,
      response: error.response
    });
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail
};