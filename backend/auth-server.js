const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Body:', req.body);
    next();
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password });

    // Check if email exists first
    if (email === 'tanmaytr05@gmail.com') {
        // If email exists but password is wrong
        if (password !== 'tanmaytr0') {
            console.log('Login failed: Incorrect password');
            return res.status(401).json({
                success: false,
                message: 'Incorrect password. The password should be: tanmaytr0'
            });
        }

        // If both email and password are correct
        const response = {
            success: true,
            user: {
                _id: '1',
                email: email,
                name: 'Test User',
                role: 'user'
            },
            token: 'test-token-' + Date.now()
        };
        
        console.log('Login successful:', response);
        return res.json(response);
    }

    // If email doesn't exist
    console.log('Login failed: Email not found');
    return res.status(401).json({
        success: false,
        message: 'Account not found. Please check your email or sign up.'
    });
});

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log('='.repeat(50));
    console.log('Backend Server Running');
    console.log('-'.repeat(50));
    console.log(`• Port: ${PORT}`);
    console.log(`• URL: http://localhost:${PORT}`);
    console.log(`• Test Login:`);
    console.log(`  - Email: tanmaytr05@gmail.com`);
    console.log(`  - Password: tanmaytr0`);
    console.log('='.repeat(50));
});