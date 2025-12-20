'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 5000; // Always use port 5000 for backend
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

// For now, we'll use the mock database instead of MongoDB
// mongoose.connect(process.env.MONGODB_URL)
//   .then(() => console.log('Connected to MongoDB Atlas...'))
//   .catch(err => console.error('Could not connect to MongoDB...', err));

// CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept']
}));

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Auth routes
const forgotPasswordRouter = require('./routes/auth/forgot-password');
const resetPasswordRouter = require('./routes/auth/reset-password');
const registerRouter = require('./routes/auth/register');

app.use('/api/auth/forgot-password', forgotPasswordRouter);
app.use('/api/auth/reset-password', resetPasswordRouter);
app.use('/api/auth/register', registerRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check request received');
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Helper functions for user management
const getUsersFilePath = () => path.join(__dirname, 'data', 'users.json');

const readUsers = () => {
  try {
    const data = fs.readFileSync(getUsersFilePath(), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

const saveUsers = (users) => {
  try {
    fs.writeFileSync(getUsersFilePath(), JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
};

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email });
  
  try {
    // Find user by email
    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // For development, we'll allow login with any password if it's test data
    const isPasswordValid = user.password 
      ? await bcrypt.compare(password, user.password)
      : true;

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return full user data including company info
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company || undefined,
        phone: user.phone || undefined,
        createdAt: user.createdAt || new Date().toISOString()
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User profile endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No authentication token provided'
    });
  }

  try {
    // Get token and decode it
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user data from users.json
    const users = readUsers();
    const user = users.find(u => u._id === decoded.userId || u.email === decoded.email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user data with full profile including company info
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company || undefined,
        phone: user.phone || undefined,
        createdAt: user.createdAt || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
});

// Import routes
const dashboardRouter = require('./src/routes/dashboard');
const ordersRouter = require('./routes/orders');
const cartRouter = require('./routes/cart');

// Use routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/cart', cartRouter);

// Dashboard stats endpoint (deprecated)
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    totalSales: 45000,
    totalOrders: 150,
    averageOrderValue: 300,
    monthlySales: [
      { month: '2025-07', value: 15000 },
      { month: '2025-08', value: 18000 },
      { month: '2025-09', value: 12000 }
    ]
  });
});

// Helper functions for product management
const getProductsFilePath = () => path.join(__dirname, 'data', 'products.json');

const readProducts = () => {
  try {
    const data = fs.readFileSync(getProductsFilePath(), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products file:', error);
    return [];
  }
};

const saveProducts = (products) => {
  try {
    fs.writeFileSync(getProductsFilePath(), JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Error saving products:', error);
  }
};

// Products endpoints
app.get('/api/products', (req, res) => {
  try {
    const products = readProducts();
    const users = readUsers();
    
    // Enrich products with supplier information
    const enrichedProducts = products.map(product => {
      const supplier = users.find(u => u._id === product.userId);
      return {
        ...product,
        supplier: supplier ? {
          _id: supplier._id,
          name: supplier.name,
          company: { name: supplier.company?.name }
        } : null
      };
    });

    res.json({
      success: true,
      products: enrichedProducts
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
});

// Get products by seller ID
app.get('/api/products/seller/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const products = readProducts();
    const sellerProducts = products.filter(p => p.userId === userId);
    
    res.json({
      success: true,
      products: sellerProducts
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seller products'
    });
  }
});

app.post('/api/products', (req, res) => {
  try {
    // Verify JWT token to get user info
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { name, description, price, category, stock = 0, images = [] } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const products = readProducts();
    const nextId = Math.max(0, ...products.map(p => p.id)) + 1;

    // Create new product
    const newProduct = {
      _id: Date.now().toString(),
      id: nextId,
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      images,
      status: 'active',
      userId: decoded.userId, // Use the actual user ID from token
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveProducts(products);

    res.status(201).json({
      success: true,
      product: newProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Function to check if a port is in use
const isPortInUse = async (port) => {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
};

// Start server with retries
const startServer = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      if (await isPortInUse(PORT)) {
        console.log(`Port ${PORT} is in use, trying to free it...`);
        require('child_process').execSync(`powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force"`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const server = app.listen(PORT, '0.0.0.0');
      
      server.on('error', (err) => {
        console.error('Server error:', err);
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use`);
        }
      });

      server.once('listening', () => {
        console.log(`
=========================================================
✅ Backend Server Running
---------------------------------------------------------
• Port: ${PORT}
• URL: http://localhost:${PORT}
• Environment: ${process.env.NODE_ENV || 'development'}
• Health Check: http://localhost:${PORT}/api/health
=========================================================`);
      });

      // Graceful shutdown
      const shutdown = async () => {
        console.log('\nShutting down gracefully...');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);

      return server;
    } catch (err) {
      console.error(`Start attempt ${i + 1} failed:`, err);
      if (i === retries - 1) {
        console.error('Failed to start server after', retries, 'attempts');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// Start the server
startServer();