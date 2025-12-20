const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Basic Express setup
const app = express();
const PORT = 5000;

// Create a store for dashboard data cache
const cache = new Map();

// Rate limiter for all routes
const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // limit each IP to 100 requests per minute
    message: {
        status: 'error',
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true, // Include rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter rate limiter for dashboard
const dashboardLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 20, // limit each IP to 20 requests per minute
    message: {
        status: 'error',
        message: 'Too many dashboard requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting if cache is still valid
        const cachedData = cache.get('dashboard');
        return cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000;
    }
});

// Basic middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(globalLimiter);

// Debug middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Dashboard endpoint with caching
app.get('/api/dashboard', dashboardLimiter, (req, res) => {
    try {
        const cacheKey = 'dashboard';
        const cachedData = cache.get(cacheKey);
        const now = Date.now();
        
        // Return cached data if it's less than 5 minutes old
        if (cachedData && now - cachedData.timestamp < 5 * 60 * 1000) {
            // Include remaining cache time in headers
            const remainingTime = 5 * 60 * 1000 - (now - cachedData.timestamp);
            res.set({
                'Cache-Control': `public, max-age=${Math.floor(remainingTime / 1000)}`,
                'Expires': new Date(now + remainingTime).toUTCString(),
                'X-Cache': 'HIT',
                'X-Cache-Remaining': `${Math.floor(remainingTime / 1000)}s`
            });
            return res.json(cachedData.data);
        }

        // Generate fresh data
        const data = {
            data: {
                stats: {
                    totalProducts: Math.floor(Math.random() * 100),
                    productViews: Math.floor(Math.random() * 1000),
                    recentOrders: Math.floor(Math.random() * 50),
                    revenue: Math.floor(Math.random() * 100000)
                },
                orders: []
            }
        };

        // Cache the new data
        cache.set(cacheKey, {
            data,
            timestamp: now
        });

        // Set cache headers for fresh data
        res.set({
            'Cache-Control': 'public, max-age=300',
            'Expires': new Date(now + 300000).toUTCString(),
            'X-Cache': 'MISS',
            'X-Cache-Remaining': '300s'
        });

        return res.json(data);
    } catch (error) {
        console.error('Dashboard endpoint error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Test credentials
    if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
        const user = {
            _id: '1',
            email: email,
            name: 'Test User',
            role: 'user'
        };

        const token = 'test-token-' + Date.now();

        return res.json({ token, user });
    }

    return res.status(401).json({
        message: 'Invalid email or password'
    });
});

// Start server
try {
    app.listen(PORT, '0.0.0.0', () => {
        console.clear();
        console.log('='.repeat(50));
        console.log(`Server running on port ${PORT}`);
        console.log('-'.repeat(50));
        console.log('Test endpoints:');
        console.log(`1. Health: http://localhost:${PORT}/health`);
        console.log(`2. Login: http://localhost:${PORT}/api/auth/login`);
        console.log('='.repeat(50));
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Please free it up first.`);
        } else {
            console.error('Server error:', err.message);
        }
        process.exit(1);
    });
} catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
}