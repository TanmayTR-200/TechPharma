const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(auth);

// Add item to cart
router.post('/add',
  [
    body('productId').notEmpty(),
    body('quantity').isInt({ min: 1 }),
    validateRequest
  ],
  cartController.addToCart
);

// Get cart items
router.get('/', cartController.getCart);

// Update cart item quantity
router.put('/:productId',
  [
    body('quantity').isInt({ min: 1 }),
    validateRequest
  ],
  cartController.updateCartItem
);

// Remove item from cart
router.delete('/:productId', cartController.removeFromCart);

// Clear cart
router.delete('/', cartController.clearCart);

module.exports = router;
