const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// File paths
const ordersPath = path.join(__dirname, '../data/orders.json');
const productsPath = path.join(__dirname, '../data/products.json');

// Helper function to read JSON file
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
};

// Helper function to write JSON file
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
};

// Get all orders for a user
router.get('/', authenticate, (req, res) => {
  try {
    const orders = readJsonFile(ordersPath);
    const products = readJsonFile(productsPath);

    if (!orders || !products) {
      return res.status(500).json({ success: false, message: 'Error reading data files' });
    }

    // Get user details from the users.json file
    const usersPath = path.join(__dirname, '../data/users.json');
    const users = readJsonFile(usersPath);
    const currentUser = users.find(u => u._id === req.user.userId);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Only buyers can see orders
    if (currentUser.role !== 'buyer') {
      return res.json({ success: true, orders: [] });
    }
    
    // Filter orders for current buyer only
    let userOrders = orders.filter(order => {
      console.log('Checking order:', order);
      console.log('Current user:', currentUser);
      return order.userId === currentUser._id;
    });

    console.log('Found orders:', userOrders.length);

    // Enhance order items with product details
    const enhancedOrders = userOrders.map(order => ({
      ...order,
      items: order.items.map(item => {
        const product = products.find(p => p._id === item.productId);
        return {
          ...item,
          product: {
            name: product?.name || 'Unknown Product',
            _id: item.productId,
            price: item.price, // Use the price at time of order
            images: product?.images || []
          }
        };
      })
    }));

    res.json({ success: true, orders: enhancedOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create a new order (only for buyers)
router.post('/', authenticate, async (req, res) => {
  try {
    // Get user details from the users.json file
    const usersPath = path.join(__dirname, '../data/users.json');
    const users = readJsonFile(usersPath);
    const currentUser = users.find(u => u._id === req.user.userId);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Only buyers can create orders
    if (currentUser.role !== 'buyer') {
      return res.status(403).json({ success: false, message: 'Only buyers can create orders' });
    }
    
    const { items, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order items' });
    }

    const orders = readJsonFile(ordersPath) || [];
    
    const newOrder = {
      _id: Date.now().toString(),
      userId: currentUser._id,
      items,
      totalAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.push(newOrder);

    if (!writeJsonFile(ordersPath, orders)) {
      return res.status(500).json({ success: false, message: 'Error saving order' });
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
  try {
    const { items, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order items' });
    }

    const orders = readJsonFile(ordersPath) || [];
    
    const newOrder = {
      _id: Date.now().toString(),
      userId: req.user.userId,
      items,
      totalAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.push(newOrder);

    if (!writeJsonFile(ordersPath, orders)) {
      return res.status(500).json({ success: false, message: 'Error saving order' });
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update order status
router.patch('/:orderId/status', authenticate, (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const orders = readJsonFile(ordersPath);
    if (!orders) {
      return res.status(500).json({ success: false, message: 'Error reading orders' });
    }

    const orderIndex = orders.findIndex(order => order._id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only buyers can update their own orders
    if (req.user.role !== 'buyer' || req.user.userId !== orders[orderIndex].userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();

    if (!writeJsonFile(ordersPath, orders)) {
      return res.status(500).json({ success: false, message: 'Error updating order' });
    }

    res.json({ success: true, order: orders[orderIndex] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Archive/Unarchive order
router.post('/:orderId/archive', authenticate, (req, res) => {
  try {
    const { orderId } = req.params;
    const { archived } = req.body;

    if (typeof archived !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid archive status' });
    }

    const orders = readJsonFile(ordersPath);
    if (!orders) {
      return res.status(500).json({ success: false, message: 'Error reading orders' });
    }

    const orderIndex = orders.findIndex(order => order._id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only buyers can archive their own orders
    if (req.user.role !== 'buyer' || req.user.userId !== orders[orderIndex].userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    orders[orderIndex].archived = archived;
    orders[orderIndex].updatedAt = new Date().toISOString();

    if (!writeJsonFile(ordersPath, orders)) {
      return res.status(500).json({ success: false, message: 'Error updating order' });
    }

    res.json({ success: true, order: orders[orderIndex] });
  } catch (error) {
    console.error('Error archiving order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;