const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

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
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const productsFile = path.join(dataDir, 'products.json');
    if (!fs.existsSync(productsFile)) {
      writeJsonFile(productsFile, []);
    }
    
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

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Check if it's a test token
    if (token.startsWith('test-token-')) {
      const email = req.headers['x-user-email'] || 'tanmaytr05@gmail.com';
      
      // Look up the actual user in the database
      const usersFile = path.join(__dirname, 'data/users.json');
      const users = readJsonFile(usersFile);
      const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
      
      if (user) {
        // Use the actual user data from the database
        req.user = {
          _id: user._id,
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role || 'user'
        };
      } else {
        // Fallback for test accounts that don't exist in DB
        req.user = { 
          _id: '1760257427529', // Use the admin's ID as fallback
          id: '1760257427529',
          email: email,
          name: email.split('@')[0],
          role: 'user'
        };
      }
      return next();
    }

    // For JWT tokens
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
      req.user = {
        _id: decoded._id,
        id: decoded._id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role || 'user'
      };
      return next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  debug: true
});

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'https://techpharma-frontend.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'If-None-Match', 'ETag']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const usersFile = path.join(__dirname, 'data/users.json');
    const users = readJsonFile(usersFile);
    const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { 
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      },
      process.env.JWT_SECRET || 'dev_jwt_secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user info endpoint with authentication
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    // User info is already attached by authenticate middleware
    const { user } = req;
    
    // Find fresh user data from storage
    const usersFile = path.join(__dirname, 'data/users.json');
    const users = readJsonFile(usersFile);
    const freshUserData = users.find(u => u._id === user._id || u.email === user.email);
    
    if (!freshUserData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user info without sensitive data but ensure createdAt is included
    const { password, resetToken, ...userInfo } = user;

    // Find fresh user data from storage to get latest company info
    const latestUsersFile = path.join(__dirname, 'data/users.json');
    const latestUsers = readJsonFile(latestUsersFile);
    const latestUserData = latestUsers.find(u => u._id === userInfo._id);
    
    res.json({
      success: true,
      user: {
        ...userInfo,
        company: latestUserData?.company || userInfo.company || {},
        createdAt: user.createdAt || userInfo._id 
          ? new Date(parseInt(userInfo._id)).toISOString()  // Fallback to ID-based date
          : new Date().toISOString() // Ultimate fallback
      }
    });
  } catch (error) {
    console.error('Auth/me error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Forgot password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const usersFile = path.join(__dirname, 'data/users.json');
    const users = readJsonFile(usersFile);
    const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    
    const resetToken = jwt.sign(
      { userId: user?._id || 'invalid', purpose: 'reset' },
      process.env.JWT_SECRET || 'dev_jwt_secret',
      { expiresIn: '1h' }
    );

    if (user) {
      const userIndex = users.findIndex(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
      users[userIndex].resetToken = {
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      };
      writeJsonFile(usersFile, users);

      try {
        console.log('Testing SMTP connection...');
        await transporter.verify();
        console.log('SMTP connection verified successfully');
        
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
        const mailOptions = {
          from: {
            name: 'TechPharma Support',
            address: process.env.EMAIL_USER
          },
          to: email,
          subject: 'Reset Your Password - TechPharma',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Reset Your Password</h2>
              <p>You have requested to reset your password. Click the link below to set a new password:</p>
              <p>
                <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
                  Reset Password
                </a>
              </p>
              <p>If you didn't request this, please ignore this email.</p>
              <p>This link will expire in 1 hour for security reasons.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated email from TechPharma. Please do not reply to this email.
              </p>
            </div>
          `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully:', info.messageId);
      } catch (emailError) {
        console.error('Detailed email error:', emailError);
        console.log('Email error details:', {
          code: emailError.code,
          message: emailError.message,
          response: emailError.response,
          stack: emailError.stack
        });
        console.log('=========================================');
        console.log('🔑 Password Reset Requested (Email Failed)');
        console.log('-----------------------------------------');
        console.log('Email:', email);
        console.log('Reset Link: http://localhost:3000/auth/reset-password?token=' + resetToken);
        console.log('=========================================');
        return res.status(500).json({
          success: false,
          message: 'Could not send password reset email. Please check your email address or try again later.'
        });
      }
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive reset instructions. Check the server console for the reset link!'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Token and new password are required' 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
      if (decoded.purpose !== 'reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const usersFile = path.join(__dirname, 'data/users.json');
    const users = readJsonFile(usersFile);
    const userIndex = users.findIndex(u => u._id === decoded.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    users[userIndex].password = hashedPassword;
    writeJsonFile(usersFile, users);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, sort = 'featured', category, search, priceMin, priceMax } = req.query;
    let products = readJsonFile(path.join(__dirname, 'data/products.json'));
    
    let filteredProducts = products.filter(p => p.status === 'active');

    if (category) {
      const categories = category.toLowerCase().split(',');
      filteredProducts = filteredProducts.filter(p => 
        p.category && categories.includes(p.category.toLowerCase())
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (priceMin || priceMax) {
      const min = priceMin ? parseFloat(priceMin) : 0;
      const max = priceMax ? parseFloat(priceMax) : Number.MAX_VALUE;
      filteredProducts = filteredProducts.filter(p => 
        p.price >= min && p.price <= max
      );
    }

    switch (sort) {
      case 'price-asc':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filteredProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'featured':
      default:
        break;
    }

    const pageSize = 12;
    const startIndex = (parseInt(page) - 1) * pageSize;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

    res.json({
      success: true,
      products: paginatedProducts,
      total: filteredProducts.length,
      page: parseInt(page),
      totalPages: Math.ceil(filteredProducts.length / pageSize)
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// Create product
app.post('/api/products', authenticate, async (req, res) => {
  try {
    const productsFilePath = path.join(__dirname, 'data/products.json');
    let products = readJsonFile(productsFilePath);
    
    const newProduct = {
      ...req.body,
      _id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supplierId: req.user._id
    };

    products.push(newProduct);
    writeJsonFile(productsFilePath, products);

    res.status(201).json({
      success: true,
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product'
    });
  }
});

// Update product
app.put('/api/products/:id', authenticate, async (req, res) => {
  try {
    const productId = req.params.id;
    const productsFilePath = path.join(__dirname, 'data/products.json');
    let products = readJsonFile(productsFilePath);

    const productIndex = products.findIndex(p => 
      p._id === productId || 
      p._id === String(productId)
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns the product or is admin
    const product = products[productIndex];
    if (product.supplierId !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Update product
    const updatedProduct = {
      ...product,
      ...req.body,
      _id: product._id, // Preserve the original ID
      supplierId: product.supplierId, // Preserve the original supplier
      updatedAt: new Date().toISOString()
    };

    products[productIndex] = updatedProduct;
    writeJsonFile(productsFilePath, products);

    res.json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
});

// Delete product
app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const productId = req.params.id;
    const productsFilePath = path.join(__dirname, 'data/products.json');
    let products = readJsonFile(productsFilePath);

    const productIndex = products.findIndex(p => 
      p.id === productId || 
      p._id === productId ||
      p.id === String(productId) || 
      p._id === String(productId)
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = products[productIndex];

    if (product.images && Array.isArray(product.images)) {
      for (const imageUrl of product.images) {
        if (imageUrl.includes('cloudinary.com')) {
          try {
            const publicId = getPublicIdFromUrl(imageUrl);
            if (publicId) {
              await deleteImage(publicId);
              console.log('Deleted Cloudinary image:', publicId);
            }
          } catch (error) {
            console.error('Failed to delete Cloudinary image:', error);
          }
        }
      }
    }

    products.splice(productIndex, 1);
    writeJsonFile(productsFilePath, products);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// Profile routes
app.put('/api/profile', authenticate, async (req, res) => {
  try {
    const usersFile = path.join(__dirname, 'data/users.json');
    const users = readJsonFile(usersFile);
    const userIndex = users.findIndex(u => u._id === req.user._id);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user data
    if (req.body.company) {
      users[userIndex].company = {
        ...users[userIndex].company || {},
        ...req.body.company
      };
    }

    if (req.body.phone !== undefined) {
      users[userIndex].phone = req.body.phone;
    }

    // Save to file
    writeJsonFile(usersFile, users);

    // Return updated user data
    const { password, resetToken, ...userData } = users[userIndex];
    res.json(userData);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const usersFile = path.join(__dirname, 'data/users.json');
    const users = readJsonFile(usersFile);
    const user = users.find(u => u._id === req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data without sensitive information
    const { password, resetToken, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Profile get error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Import routes
const analyticsRouter = require('./routes/dashboard/analytics');
const dashboardRouter = require('./routes/dashboard');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');

// Import cart routes
const cartRoutes = require('./routes/cart');

// Use routes
app.use('/api/dashboard/analytics', authenticate, analyticsRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/messages', authenticate, messageRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/cart', authenticate, cartRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.json({
    status: 'ok',
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    storage: {
      type: 'File-based',
      initialized: fs.existsSync(path.join(__dirname, 'data'))
    },
    server: {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const startServer = async () => {
  initStorage();
  console.log('Starting Express server...');
  app.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log('🚀 Backend Server Running');
    console.log('-----------------------------------------');
    console.log('• Port:', PORT);
    console.log('• URL: http://localhost:' + PORT);
    console.log('• Storage: File-based');
    console.log('=========================================');
  });
};

startServer();