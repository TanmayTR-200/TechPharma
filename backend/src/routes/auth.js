// routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 */
router.post(
  '/register',
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name')
      .notEmpty().withMessage('Name is required'),
    body('role')
      .optional()
      .isIn(['buyer', 'supplier', 'admin']).withMessage('Invalid role'),
    validateRequest
  ],
  authController.register
);

/**
 * @route   POST /auth/login
 * @desc    Login user
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
    validateRequest
  ],
  authController.login
);

/**
 * @route   POST /auth/forgot-password
 * @desc    Send password reset email
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    validateRequest
  ],
  authController.forgotPassword
);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset user password
 */
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
  ],
  authController.resetPassword
);

/**
 * @route   GET /auth/me
 * @desc    Get current user info
 */
router.get('/me', auth, authController.getCurrentUser);

module.exports = router;
