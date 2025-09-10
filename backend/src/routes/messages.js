const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(auth);

// Send a new message
router.post('/',
  [
    body('receiverId').notEmpty().isMongoId(),
    body('content').notEmpty().trim(),
    body('productId').optional().isMongoId(),
    validateRequest
  ],
  messageController.sendMessage
);

// Get all conversations for the user
router.get('/conversations', messageController.getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId',
  [
    body('page').optional().isInt({ min: 1 }),
    body('limit').optional().isInt({ min: 1, max: 50 }),
    validateRequest
  ],
  messageController.getMessages
);

// Mark a message as read
router.patch('/:messageId/read', messageController.markAsRead);

module.exports = router;
