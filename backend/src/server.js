require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

// Trust proxy for Render deployment
const trustProxy = process.env.NODE_ENV === 'production';

// Verify environment variables without logging sensitive data
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const app = express();

// CORS configuration based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL || 'https://techpharma.vercel.app',
      /\.vercel\.app$/ // Allow all Vercel preview deployments
    ]
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (!isAllowed) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
  exposedHeaders: ['Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - placing it before other routes
app.get('/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handling
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    // Check required environment variables with default values
    if (!process.env.MONGODB_URI) {
      console.error('Missing MONGODB_URI, please check your .env file');
      process.exit(1);
    }
    
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not found, using default development secret');
      process.env.JWT_SECRET = 'dev_secret_key';
    }

    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      heartbeatFrequencyMS: 2000,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      connectTimeoutMS: 10000
    });

    console.log('✅ Connected to MongoDB successfully');

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Performing graceful shutdown...`);
      try {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
        await new Promise((resolve) => server.close(resolve));
        console.log('Server closed');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error(' MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();
