// emailService.js
const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter
transporter.verify(function(error, success) {
  if (error) {
    console.log('SMTP Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

exports.sendOTPEmail = async (email, otp) => {
  // Log for debugging
  console.log('Email Configuration:', {
    host: 'smtp.gmail.com',
    port: 587,
    user: process.env.EMAIL_USER
  });
  console.log('Attempting to send OTP email to:', email);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Verification Code - TechPharma',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 4px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `
  };

  // Send email and return result
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);
  return info;
};

exports.sendResetEmail = async (email, resetToken) => {
  // Log for debugging
  console.log('Attempting to send reset email to:', email);
  
  const resetUrl = `http://localhost:3000/auth/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Password - TechPharma',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          ${resetUrl}
        </p>
      </div>
    `
  };

  // Send email and return result
  const info = await transporter.sendMail(mailOptions);
  console.log('Reset email sent successfully:', info.messageId);
  return info;
};