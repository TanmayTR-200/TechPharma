require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');

// Import routes
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const productsRoutes = require('./src/routes/products');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://techpharma-frontend.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error'
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
=========================================
🚀 TechPharma Backend Server Running
-----------------------------------------
• Port: ${PORT}
• URL: http://localhost:${PORT}
• Environment: ${process.env.NODE_ENV}
=========================================`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

startServer();