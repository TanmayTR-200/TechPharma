'use strict';

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
let PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// MongoDB Connection function
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/techpharma', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return false;
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Basic schemas
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  role: String
});

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  category: String,
  stock: Number,
  images: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Models
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    // Test credentials
    if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
      const response = {
        success: true,
        user: {
          _id: '1',
          email: email,
          name: 'Test User',
          role: 'supplier'
        },
        token: 'test-token-' + Date.now()
      };
      console.log('Login successful');
      return res.json(response);
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User profile and dashboard endpoint
app.get('/api/auth/me', async (req, res) => {
  try {
    // Mock user data with dashboard stats
    const userData = {
      success: true,
      user: {
        _id: '1',
        email: 'tanmaytr05@gmail.com',
        name: 'Test User',
        role: 'supplier',
        createdAt: '2025-09-16T10:00:00.000Z',
        updatedAt: '2025-09-16T10:00:00.000Z'
      },
      data: {
        orders: [
          {
            _id: 'ORD123456',
            user: 'Pharma Solutions Inc.',
            items: [
              { 
                product: { 
                  name: 'Industrial LED Lighting System', 
                  _id: 'PRD001' 
                }, 
                quantity: 5, 
                price: 299.99 
              }
            ],
            totalAmount: 1499.95,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            paymentDetails: { status: 'pending', method: 'bank_transfer' }
          }
        ],
        messages: [
          {
            id: 'MSG001',
            sender: 'Medical Supplies Co.',
            company: 'Medical Supplies Corporation',
            message: 'Interested in bulk order of Industrial LED systems',
            time: new Date().toISOString(),
            unread: true
          }
        ],
        totalProducts: 0,
        productViews: 0,
        inquiries: 0,
        revenue: 0
      }
    };

    res.json(userData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    // Return empty product list for now
    res.json({
      success: true,
      products: []
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// Create product endpoint
app.post('/api/products', async (req, res) => {
  try {
    console.log('Received product creation request:', req.body);
    const { name, description, price, category, stock, images, status = 'active' } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !category || !stock || !images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create new product (mock for now)
    const newProduct = {
      _id: 'PRD' + Date.now(),
      name,
      description,
      price,
      category,
      stock,
      images,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Created new product:', newProduct);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Function to try starting server on a port
const tryStartServer = (port) => new Promise((resolve, reject) => {
  const tempServer = app.listen(port, '0.0.0.0')
    .once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}...`);
        tempServer.close();
        resolve(tryStartServer(port + 1));
      } else {
        reject(err);
      }
    })
    .once('listening', () => resolve(tempServer));
});

// Initialize server
const initServer = async () => {
  let server;
  
  try {
    const mongoConnected = await connectDB();
    if (!mongoConnected) {
      console.warn('Could not connect to MongoDB. Running in limited mode with mock data...');
    }

    // Try to start server with automatic port selection
    server = await tryStartServer(PORT);
    const actualPort = server.address().port;

    console.clear();
    console.log('='.repeat(50));
    console.log('Backend Server Running');
    console.log('-'.repeat(50));
    console.log(`• Port: ${actualPort}`);
    console.log(`• Database: ${mongoConnected ? 'MongoDB (local)' : 'Mock Data (No MongoDB)'}`);
    console.log(`• URL: http://localhost:${actualPort}`);
    console.log(`• Test Login:`);
    console.log(`  - Email: tanmaytr05@gmail.com`);
    console.log(`  - Password: tanmaytr0`);
    if (actualPort !== PORT) {
      console.log('-'.repeat(50));
      console.log(`Note: Server is using port ${actualPort} instead of ${PORT}`);
      console.log('Update frontend API_BASE_URL if needed');
    }
    console.log('='.repeat(50));

    // Graceful shutdown handler
    const shutdown = async () => {
      try {
        if (server) {
          await new Promise((resolve) => server.close(resolve));
          console.log('Server shut down');
        }
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    console.error('Server initialization error:', err);
    if (server) {
      server.close();
    }
    process.exit(1);
  }
};

// Start the server
initServer();