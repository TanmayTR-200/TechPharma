require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Basic login endpoint for testing
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    // For testing, using hardcoded credentials
    if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
      return res.json({
        token: 'test-token',
        user: {
          _id: '1',
          email,
          name: 'Test User',
          role: 'user'
        }
      });
    }

    res.status(401).json({
      message: 'Invalid credentials'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// Start server
const server = app.listen(PORT, 'localhost', (error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Test with:');
  console.log(`- Health check: http://localhost:${PORT}/health`);
  console.log(`- Login: http://localhost:${PORT}/api/auth/login`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free up the port and try again.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});