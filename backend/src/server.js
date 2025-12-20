'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000; // Use port from env or default to 5000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to read JSON files
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Helper to write JSON files
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Initialize storage
function initStorage() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create products.json if it doesn't exist
    const productsFile = path.join(dataDir, 'products.json');
    if (!fs.existsSync(productsFile)) {
      writeJsonFile(productsFile, []);
    }
    
    // Create users.json if it doesn't exist
    const usersFile = path.join(dataDir, 'users.json');
    if (!fs.existsSync(usersFile)) {
      writeJsonFile(usersFile, []);
    }
    
    console.log('✅ File storage initialized');
    return true;
  } catch (err) {
    console.error('Storage initialization error:', err);
    return false;
  }
}

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['ETag']
}));

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      storage: 'file-based'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error',
      message: 'Service unavailable',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user data in request
    req.user = { 
      _id: decoded.userId,
      id: decoded.userId // Include both id formats for compatibility
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};



// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Read users from file
    const usersFile = path.join(__dirname, '../data/users.json');
    const users = readJsonFile(usersFile);

    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date().toISOString()
    };

    // Add to users array and save
    users.push(user);
    writeJsonFile(usersFile, users);

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

const { sendPasswordResetEmail } = require('./utils/email');

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    // Read users from file
    const usersFile = path.join(__dirname, '../data/users.json');
    const users = readJsonFile(usersFile);

    // Find user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Generate reset token whether user exists or not (for security)
    const resetToken = jwt.sign(
      { 
        userId: user?._id || 'invalid',
        purpose: 'reset'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    if (user) {
      try {
        // Send password reset email
        await sendPasswordResetEmail(email, resetToken);
        
        // Store reset token with user
        user.resetToken = {
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        };
        writeJsonFile(usersFile, users);
        
        console.log(`Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Log the reset link as fallback
        console.log(`
=========================================
🔑 Password Reset Requested (Email Failed)
-----------------------------------------
Email: ${email}
Reset Link: ${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}
=========================================`);
      }
    }

    // Always return the same response whether user exists or not
    return res.json({
      success: true,
      message: 'If an account exists with that email, you will receive password reset instructions.',
      token: resetToken // Include token in response for development
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, otp, password } = req.body;
    if (!token || !otp || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Read users
    const usersFile = path.join(__dirname, '../data/users.json');
    const users = readJsonFile(usersFile);
    
    // Find user
    const user = users.find(u => u._id === decoded.userId);
    if (!user || !user.resetOtp) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Verify OTP and expiry
    if (user.resetOtp.code !== otp || new Date() > new Date(user.resetOtp.expiresAt)) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Update password
    user.password = await bcrypt.hash(password, 10);
    user.resetOtp = null; // Clear reset OTP
    writeJsonFile(usersFile, users);

    return res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing request'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Read users from file
    const usersFile = path.join(__dirname, '../data/users.json');
    const users = readJsonFile(usersFile);

    // Find user by email
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Protected Routes
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    // Read users from file
    const usersFile = path.join(__dirname, '../data/users.json');
    const users = readJsonFile(usersFile);
    const user = users.find(u => u._id === req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Read products from file
    const productsFile = path.join(__dirname, '../data/products.json');
    const products = readJsonFile(productsFile);
    const userProducts = products.filter(p => p.userId === user._id);

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      data: {
        totalProducts: userProducts.length
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, '../data/products.json'));
    
    // Filter active products and sort by createdAt
    const activeProducts = products
      .filter(p => p.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      products: activeProducts
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, category, stock, images } = req.body;

    // Read existing products
    const productsPath = path.join(__dirname, '../data/products.json');
    let products = [];
    try {
      products = readJsonFile(productsPath);
    } catch (err) {
      console.error('Error reading products file:', err);
    }

    // Generate new ID
    const id = products.length ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1;

    // Create new product
    const product = {
      id,
      _id: String(id),
      name: name?.trim(),
      description: description?.trim(),
      price: Number(price),
      category: category?.trim(),
      stock: Number(stock),
      images: Array.isArray(images) ? images : [],
      userId: req.user._id,
      supplierId: req.user._id,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to products array
    products.push(product);

    // Save back to file
    writeJsonFile(productsPath, products);

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      details: error.message
    });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, '../../data/products.json'));
    const index = products.findIndex(p => p.id === parseInt(req.params.id));

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns the product
    if (products[index].userId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    // Remove product
    const [deletedProduct] = products.splice(index, 1);
    writeJsonFile(path.join(__dirname, '../../data/products.json'), products);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      deletedProduct
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// Import routes
const dashboardRoutes = require('./routes/dashboard');
const messagesRoutes = require('./routes/messages');

// Use routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messagesRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize storage
    initStorage();
    
    // Start Express server
    console.log('Starting Express server...');
    const server = await new Promise((resolve, reject) => {
      const srv = app.listen(PORT, '0.0.0.0')
        .once('error', (err) => {
          console.error('Server startup error:', err);
          if (err.code === 'EADDRINUSE') {
            console.error(`
=================================================
ERROR: Port ${PORT} is already in use
Please stop any other server using port ${PORT} first
You can use these commands to find and stop the process:
  netstat -ano | findstr :${PORT}
  taskkill /PID <PID> /F
=================================================`);
            process.exit(1);
          } else {
            reject(err);
          }
        })
        .once('listening', () => {
          console.log('Server is listening...');
          resolve(srv);
        });
    });

    console.log(`
=========================================
🚀 Backend Server Running
-----------------------------------------
• Port: ${PORT}
• URL: http://localhost:${PORT}
• Storage: File-based
=========================================`);

    // Graceful shutdown
    const shutdown = async () => {
      try {
        console.log('\nShutting down...');
        await server.close();
        process.exit(0);
      } catch (err) {
        console.error('Shutdown error:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return server;
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

startServer();
