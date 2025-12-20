require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS with specific origin
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Basic login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // For testing purposes
  const mockUser = {
    _id: '1',
    email: email,
    name: 'Test User',
    role: 'user'
  };

  res.json({
    token: 'mock_token_for_testing',
    user: mockUser
  });
});

// Start server
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Try health check at http://localhost:${PORT}/health`);
});