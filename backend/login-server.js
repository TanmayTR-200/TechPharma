const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Add logging for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length) {
        console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password });

    if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
        // Successful login
        const token = 'test-token-' + Date.now();
        const user = {
            _id: '1',
            email: email,
            name: 'Test User',
            role: 'user'
        };

        console.log('Login successful:', { user });
        return res.json({
            success: true,
            token,
            user
        });
    }

    // Failed login
    console.log('Login failed: Invalid credentials');
    return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
    });
});

// Token validation endpoint
app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    console.log('Token validation request:', { authHeader });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    const token = authHeader.split(' ')[1];
    if (token.startsWith('test-token-')) {
        return res.json({
            success: true,
            user: {
                _id: '1',
                email: 'tanmaytr05@gmail.com',
                name: 'Test User',
                role: 'user'
            }
        });
    }

    return res.status(401).json({
        success: false,
        message: 'Invalid token'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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