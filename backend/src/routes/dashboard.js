const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const router = express.Router();

// Path to JSON files
const productsFilePath = path.join(__dirname, "../../data/products.json");

// Helper to read products
function readProducts() {
  if (!fs.existsSync(productsFilePath)) {
    return [];
  }
  const data = fs.readFileSync(productsFilePath);
  return JSON.parse(data);
}

router.get('/', auth, async (req, res) => {
  try {
    // Get all products with retries
    let products = [];
    let retries = 3;
    
    while (retries > 0) {
      try {
        products = readProducts();
        break;
      } catch (readError) {
        console.error(`Error reading products (${retries} retries left):`, readError);
        retries--;
        if (retries === 0) throw readError;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Get user-specific products with safe type conversion
    const userId = req.user._id.toString();
    const userProducts = products.filter(product => {
      const productUserId = product.userId ? product.userId.toString() : null;
      return productUserId === userId;
    });

    // Calculate total revenue from orders (if we had order data)
    const revenue = 0; // This would be calculated from orders when implemented

    res.json({
      status: 'success',
      data: {
        orders: [], // Will be implemented later
        messages: [], // Will be implemented later
        totalProducts: userProducts.length,
        productViews: 0, // Will be implemented later
        inquiries: 0, // Will be implemented later
        revenue: revenue
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
