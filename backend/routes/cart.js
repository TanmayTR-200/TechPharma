const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

// Helper functions
const readJsonFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
};

// Get cart items for a user
router.get('/', authenticate, async (req, res) => {
  try {
    const cartPath = path.join(__dirname, '../data/carts.json');
    const productsPath = path.join(__dirname, '../data/products.json');
    
    let carts = readJsonFile(cartPath) || [];
    const products = readJsonFile(productsPath) || [];
    
    const userCart = carts.find(cart => cart.userId === req.user._id) || { items: [] };
    
    // Enrich cart items with product details and check stock
    const enrichedItems = await Promise.all(userCart.items.map(async item => {
      const product = products.find(p => p._id === item.productId);
      if (!product) return null;
      
      return {
        ...item,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: product.images,
          stock: product.stock
        },
        totalPrice: product.price * item.quantity
      };
    }));

    // Filter out null items (products that no longer exist)
    const validItems = enrichedItems.filter(item => item !== null);
    
    res.json({
      success: true,
      cart: {
        items: validItems,
        total: validItems.reduce((sum, item) => sum + item.totalPrice, 0)
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// Add item to cart
router.post('/add', authenticate, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product or quantity'
      });
    }

    const cartPath = path.join(__dirname, '../data/carts.json');
    const productsPath = path.join(__dirname, '../data/products.json');
    
    let carts = readJsonFile(cartPath) || [];
    const products = readJsonFile(productsPath) || [];

    // Check if product exists and has enough stock
    const product = products.find(p => p._id === productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }

    // Find or create user's cart
    let userCartIndex = carts.findIndex(cart => cart.userId === req.user._id);
    if (userCartIndex === -1) {
      carts.push({
        userId: req.user._id,
        items: []
      });
      userCartIndex = carts.length - 1;
    }

    // Check if item already exists in cart
    const existingItemIndex = carts[userCartIndex].items.findIndex(
      item => item.productId === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if total doesn't exceed stock
      const newQuantity = carts[userCartIndex].items[existingItemIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add more items than available in stock'
        });
      }
      carts[userCartIndex].items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      carts[userCartIndex].items.push({
        productId,
        quantity,
        addedAt: new Date().toISOString()
      });
    }

    // Save updated cart
    writeJsonFile(cartPath, carts);

    // Return updated cart with product details
    const enrichedItems = carts[userCartIndex].items.map(item => {
      const product = products.find(p => p._id === item.productId);
      return {
        ...item,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: product.images,
          stock: product.stock
        },
        totalPrice: product.price * item.quantity
      };
    });

    res.json({
      success: true,
      cart: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0)
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// Update cart item quantity
router.put('/update/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity'
      });
    }

    const cartPath = path.join(__dirname, '../data/carts.json');
    const productsPath = path.join(__dirname, '../data/products.json');
    
    let carts = readJsonFile(cartPath) || [];
    const products = readJsonFile(productsPath) || [];

    // Check product stock
    const product = products.find(p => p._id === productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }

    // Update cart
    const userCartIndex = carts.findIndex(cart => cart.userId === req.user._id);
    if (userCartIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = carts[userCartIndex].items.findIndex(
      item => item.productId === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      carts[userCartIndex].items.splice(itemIndex, 1);
    } else {
      // Update quantity
      carts[userCartIndex].items[itemIndex].quantity = quantity;
    }

    // Save updated cart
    writeJsonFile(cartPath, carts);

    // Return updated cart with product details
    const enrichedItems = carts[userCartIndex].items.map(item => {
      const product = products.find(p => p._id === item.productId);
      return {
        ...item,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: product.images,
          stock: product.stock
        },
        totalPrice: product.price * item.quantity
      };
    });

    res.json({
      success: true,
      cart: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0)
      }
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart'
    });
  }
});

// Remove item from cart
router.delete('/remove/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const cartPath = path.join(__dirname, '../data/carts.json');
    let carts = readJsonFile(cartPath) || [];

    const userCartIndex = carts.findIndex(cart => cart.userId === req.user._id);
    if (userCartIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = carts[userCartIndex].items.findIndex(
      item => item.productId === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Remove item
    carts[userCartIndex].items.splice(itemIndex, 1);
    writeJsonFile(cartPath, carts);

    // Return updated cart with product details
    const productsPath = path.join(__dirname, '../data/products.json');
    const products = readJsonFile(productsPath) || [];

    const enrichedItems = carts[userCartIndex].items.map(item => {
      const product = products.find(p => p._id === item.productId);
      return {
        ...item,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: product.images,
          stock: product.stock
        },
        totalPrice: product.price * item.quantity
      };
    });

    res.json({
      success: true,
      cart: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0)
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
});

// Checkout cart and create order
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { paymentMethod, shippingAddress } = req.body;

    if (!paymentMethod || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and shipping address are required'
      });
    }

    const cartPath = path.join(__dirname, '../data/carts.json');
    const ordersPath = path.join(__dirname, '../data/orders.json');
    const productsPath = path.join(__dirname, '../data/products.json');
    
    let carts = readJsonFile(cartPath) || [];
    let orders = readJsonFile(ordersPath) || [];
    let products = readJsonFile(productsPath) || [];

    // Find user's cart
    const userCartIndex = carts.findIndex(cart => cart.userId === req.user._id);
    if (userCartIndex === -1 || !carts[userCartIndex].items.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Verify stock and calculate total
    const orderItems = [];
    let totalAmount = 0;

    for (const item of carts[userCartIndex].items) {
      const product = products.find(p => p._id === item.productId);
      
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock available for ${product ? product.name : 'a product'}`
        });
      }

      // Update product stock
      product.stock -= item.quantity;
      
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        product: {
          name: product.name,
          images: product.images
        }
      });

      totalAmount += product.price * item.quantity;
    }

    // Create order
    const order = {
      _id: Date.now().toString(),
      userId: req.user._id,
      items: orderItems,
      totalAmount,
      status: 'pending',
      paymentDetails: {
        method: paymentMethod,
        status: 'pending'
      },
      shippingAddress,
      createdAt: new Date().toISOString()
    };

    // Update database
    orders.push(order);
    writeJsonFile(ordersPath, orders);
    writeJsonFile(productsPath, products);

    // Clear user's cart
    carts[userCartIndex].items = [];
    writeJsonFile(cartPath, carts);

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process checkout'
    });
  }
});

module.exports = router;