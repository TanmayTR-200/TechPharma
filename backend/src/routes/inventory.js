const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const inventory = require('../inventory/reservation');

// POST /api/inventory/reserve
// Body: { productId, quantity, idempotencyKey }
router.post('/reserve', authenticate, async (req, res) => {
  try {
    const { productId, quantity, idempotencyKey } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'productId and quantity (>=1) are required' });
    }

    if (!idempotencyKey) {
      return res.status(400).json({ success: false, message: 'idempotencyKey is required' });
    }

    const result = await inventory.reserve({
      productId,
      quantity: parseInt(quantity),
      userId: req.user._id,
      idempotencyKey
    });

    const status = result.idempotent ? 200 : 201;
    res.status(status).json({ success: true, reservation: result.reservation, idempotent: result.idempotent });
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || 'Failed to reserve inventory';
    res.status(status).json({ success: false, message });
  }
});

// POST /api/inventory/confirm
// Body: { reservationId }
router.post('/confirm', authenticate, async (req, res) => {
  try {
    const { reservationId } = req.body;
    if (!reservationId) {
      return res.status(400).json({ success: false, message: 'reservationId is required' });
    }

    await inventory.confirm(reservationId);
    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to confirm reservation' });
  }
});

// POST /api/inventory/cancel
// Body: { reservationId }
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { reservationId } = req.body;
    if (!reservationId) {
      return res.status(400).json({ success: false, message: 'reservationId is required' });
    }

    await inventory.cancel(reservationId);
    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to cancel reservation' });
  }
});

// GET /api/inventory/product/:id
router.get('/product/:id', async (req, res) => {
  try {
    const inv = inventory.getProductInventory(req.params.id);
    if (!inv) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, inventory: inv });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching inventory' });
  }
});

module.exports = router;
