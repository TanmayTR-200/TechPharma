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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Read data from JSON files
    const ordersPath = path.join(__dirname, '../../data/orders.json');
    const productsPath = path.join(__dirname, '../../data/products.json');
    
    const orders = readJsonFile(ordersPath) || [];
    const products = readJsonFile(productsPath) || [];

    // Filter data based on user role
    const userOrders = req.user.role === 'admin' 
      ? orders 
      : orders.filter(o => o.userId === req.user._id);
    const userProducts = req.user.role === 'admin'
      ? products.filter(p => p.status !== 'deleted')
      : products.filter(p => (p.supplierId === req.user._id || p.userId === req.user._id) && p.status !== 'deleted');

    // Calculate stats
    const totalSales = userProducts.reduce((sum, p) => sum + (p.price || 0) * (p.sold || 0), 0);
    const totalOrders = userOrders.length;
    const averageOrderValue = totalOrders > 0 
      ? userOrders.reduce((sum, o) => 
          sum + o.items.reduce((total, item) => 
            total + ((item.price || 0) * (item.quantity || 0)), 0), 0) / totalOrders 
      : 0;
    // Get top products by sales
    const productSales = {};
    userOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!productSales[item.productId]) {
            const product = products.find(p => p._id === item.productId || p.id === item.productId);
            productSales[item.productId] = {
              name: product ? product.name : 'Unknown Product',
              quantity: 0,
              revenue: 0
            };
          }
          productSales[item.productId].quantity += (item.quantity || 0);
          productSales[item.productId].revenue += (item.price || 0) * (item.quantity || 0);
        });
      }
    });

    // Convert to array and sort by quantity
    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        name: data.name,
        sales: data.quantity
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Generate monthly sales data
    const monthlySales = Array(3).fill(0).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      
      const monthRevenue = userOrders
        .filter(order => order.createdAt?.startsWith(monthKey))
        .reduce((sum, order) => sum + (
          order.items?.reduce((total, item) => 
            total + ((item.price || 0) * (item.quantity || 0)), 0) || 0
        ), 0);

      return {
        month: monthKey,
        value: monthRevenue
      };
    }).reverse();

    // Set cache headers
    res.set({
      'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      'Expires': new Date(Date.now() + 300000).toUTCString(),
      'Vary': 'Authorization' // Vary cache by auth token
    });

    // Send response
    res.json({
      success: true,
      data: {
        stats: {
          totalProducts: userProducts.length,
          totalOrders,
          totalSales,
          averageOrderValue
        },
        orders: userOrders.slice(0, 10), // Return latest 10 orders
        monthlySales,
        topProducts
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false,
      error: process.env.NODE_ENV === 'development' 
        ? error.message
        : 'Failed to fetch analytics data'
    });
  }
});

module.exports = router;