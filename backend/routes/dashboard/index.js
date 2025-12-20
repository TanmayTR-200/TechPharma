const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const readJsonFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
};

router.get('/', async (req, res) => {
  try {
    // Read data from JSON files
    const ordersPath = path.join(__dirname, '../../data/orders.json');
    const productsPath = path.join(__dirname, '../../data/products.json');
    
    const allOrders = readJsonFile(ordersPath) || [];
    const products = readJsonFile(productsPath) || [];

    // Filter orders by current user
    const userOrders = allOrders.filter(order => order.userId === req.user.userId);

    // Calculate stats
    const recentOrders = userOrders.length;
    const userProducts = products.filter(p => {
      // For admin, show all active products
      if (req.user.role === 'admin') {
        return p.status === 'active';
      }
      
      // Normalize IDs for comparison (some might be strings, others numbers)
      const userId = String(req.user._id);
      const productUserId = String(p.userId);
      const productSupplierId = String(p.supplierId);

      // For buyers/suppliers, show products where they are either the owner or supplier
      return (productUserId === userId || productSupplierId === userId) && p.status === 'active';
    });
    const totalProducts = userProducts.length;
    let revenue = 0;
    let productViews = 0;

    // Calculate total revenue and collect product views for user's orders
    userOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          revenue += (item.price || 0) * (item.quantity || 0);
        });
      }
    });

    // Get recent orders (last 5) - only for buyers
    const recentOrdersList = req.user.role === 'buyer' 
      ? userOrders
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      : [];

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          productViews,
          recentOrders,
          revenue
        },
        orders: recentOrdersList
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

module.exports = router;