const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Mock login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Basic mock authentication
  if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
    res.json({
      token: 'mock_token_for_development',
      user: {
        _id: '1',
        email: email,
        name: 'Test User',
        role: 'user'
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Development server running on port ${PORT}`);
  console.log(`🔗 Try accessing: http://localhost:${PORT}/health`);
});