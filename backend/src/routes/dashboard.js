const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middleware/auth');
const router = express.Router();

// Helper to read JSON files
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user identification'
      });
    }

    // Read data files
    const productsFile = path.join(__dirname, '../../data/products.json');
    const products = readJsonFile(productsFile);

    // Get user's own products (always filter by owner, regardless of role)
    const userProducts = products
      .filter(p => {
        const ownerId = String(p.userId || p.supplierId || '').trim();
        return ownerId === String(userId).trim() && (!p.status || p.status === 'active');
      })
      .sort((a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime());

    // Get orders data
    const ordersFile = path.join(__dirname, '../../data/orders.json');
    const allOrders = readJsonFile(ordersFile);
    
    // Filter orders based on user role
    const userOrders = allOrders
      .filter(o => String(o.userId || '') === String(userId) || String(o.supplierId || '') === String(userId))
      .sort((a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime());

    const dashboardData = {
      success: true,
      data: {
        stats: {
          totalProducts: userProducts.length,
          productViews: userProducts.reduce((sum, p) => sum + (p.views || 0), 0),
          recentOrders: userOrders.length,
          revenue: userOrders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
        },
        orders: userOrders.slice(0, 10).map(order => ({
          _id: order._id || order.id,
          user: order.userName || 'Anonymous',
          items: order.items || [],
          totalAmount: order.totalAmount || 0,
          status: order.status || 'pending',
          createdAt: order.createdAt || new Date().toISOString(),
          paymentDetails: order.paymentDetails || {
            status: 'pending',
            method: 'unknown'
          }
        }))
      }
    };

    // Set cache control headers
    res.set({
      'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      'Expires': new Date(Date.now() + 300000).toUTCString(),
      'Vary': 'Authorization'  // Vary cache by auth token
    });

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Analytics for the current user
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.userId);
    const products = readJsonFile(path.join(__dirname, '../../data/products.json'));
    const orders = readJsonFile(path.join(__dirname, '../../data/orders.json'));
    const productMap = new Map(products.map(p => [p._id, p]));

    const userProducts = products.filter(p =>
      String(p.userId || p.supplierId || '') === userId && (!p.status || p.status === 'active')
    );

    // Sales: all orders where this user is the seller of an item (sellerId, or product owner)
    let totalSales = 0;
    let sellerOrders = 0;
    const topSales = new Map();

    orders.forEach(order => {
      let orderHasSale = false;
      order.items.forEach(item => {
        const product = productMap.get(item.product?._id || item.productId);
        const sellerId = String(item.sellerId || product?.userId || product?.supplierId || '');
        if (sellerId === userId) {
          const amount = (item.price > 0 ? item.price : (product?.price || 0)) * (item.quantity || 1);
          const name = item.product?.name && item.product?.name !== 'Product' ? item.product.name : (product?.name || 'Product');
          totalSales += amount;
          orderHasSale = true;
          topSales.set(name, (topSales.get(name) || 0) + amount);
        }
      });
      if (orderHasSale) sellerOrders++;
    });

    const topProducts = Array.from(topSales.entries()).map(([name, sales]) => ({ name, sales }));

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts: userProducts.length,
          recentOrders: sellerOrders,
          revenue: totalSales,
        },
        orders: orders.filter(o => o.items.some(item =>
          String(item.sellerId || productMap.get(item.product?._id || item.productId)?.userId || '') === userId
        )).slice(0, 10).map(o => ({
          _id: o._id,
          items: o.items || [],
          totalAmount: o.totalAmount || 0,
          status: o.status,
          createdAt: o.createdAt,
        })),
        analytics: {
          totalSales,
          totalOrders: sellerOrders,
          averageOrderValue: sellerOrders ? (totalSales / sellerOrders) : 0,
          topProducts,
        },
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

module.exports = router;
