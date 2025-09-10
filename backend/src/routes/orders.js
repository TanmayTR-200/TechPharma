const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(auth);

// Create new order
router.post('/',
  [
    body('items').isArray(),
    body('items.*.productId').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('shippingAddress').notEmpty(),
    body('paymentMethod').isIn(['UPI', 'CARD', 'NET_BANKING']),
    validateRequest
  ],
  orderController.createOrder
);

// Verify payment
router.post('/verify-payment',
  [
    body('razorpayOrderId').notEmpty(),
    body('razorpayPaymentId').notEmpty(),
    body('razorpaySignature').notEmpty(),
    validateRequest
  ],
  orderController.verifyPayment
);

// Get all orders for the user
router.get('/', orderController.getOrders);

// Get specific order by ID
router.get('/:id', orderController.getOrderById);

module.exports = router;
