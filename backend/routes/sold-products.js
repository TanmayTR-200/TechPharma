const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { readJsonFile, writeJsonFile } = require('../utils/file-utils');

// Get all sold products for a supplier
router.get('/', authenticate, async (req, res) => {
  try {
    // Get all orders
    const ordersFilePath = path.join(__dirname, '../data/orders.json');
    const orders = readJsonFile(ordersFilePath);
    
    // Get all products
    const productsFilePath = path.join(__dirname, '../data/products.json');
    const products = readJsonFile(productsFilePath);
    
    // Extract sold products from orders where products belong to the current supplier
    const soldProducts = [];
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const product = products.find(p => p._id === item.product._id);
        if (product && product.supplierId === req.user._id) {
          soldProducts.push({
            _id: `${order._id}-${item._id}`,
            productId: item.product._id,
            name: item.product.name,
            image: item.product.image,
            price: item.price,
            quantity: item.quantity,
            soldAt: order.createdAt,
            buyerId: order.userId,
            buyerName: order.userName || 'Unknown Buyer',
            archived: false
          });
        }
      });
    });

    res.json({
      success: true,
      soldProducts: soldProducts.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
    });
  } catch (error) {
    console.error('Error fetching sold products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sold products'
    });
  }
});

// Archive a sold product
router.post('/:id/archive', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [orderId, itemId] = id.split('-');

    // Get all orders
    const ordersFilePath = path.join(__dirname, '../data/orders.json');
    const orders = readJsonFile(ordersFilePath);
    
    // Find the order and item
    const order = orders.find(o => o._id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const item = order.items.find(i => i._id === itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    // Get all products to check ownership
    const productsFilePath = path.join(__dirname, '../data/products.json');
    const products = readJsonFile(productsFilePath);
    
    // Check if the product belongs to the current supplier
    const product = products.find(p => p._id === item.product._id);
    if (!product || product.supplierId !== req.user._id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to archive this product' });
    }

    // Archive the item by updating its archived status
    item.archived = true;
    item.archivedAt = new Date().toISOString();

    // Save the updated orders
    writeJsonFile(ordersFilePath, orders);

    res.json({
      success: true,
      message: 'Product archived successfully',
      product: {
        _id: id,
        productId: item.product._id,
        name: item.product.name,
        archived: true,
        archivedAt: item.archivedAt
      }
    });
  } catch (error) {
    console.error('Error archiving sold product:', error);
    res.status(500).json({ success: false, message: 'Error archiving sold product' });
  }
});