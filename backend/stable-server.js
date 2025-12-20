const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Create Express app
const app = express();
const PORT = 5000;

// Crash prevention and error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Basic middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something broke!',
        message: err.message 
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Test login endpoint
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });

        // Test credentials
        if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
            const user = {
                _id: '1',
                email: email,
                name: 'Test User',
                role: 'user'
            };

            const token = jwt.sign(user, 'your-secret-key', { expiresIn: '1h' });

            return res.json({ 
                success: true,
                token, 
                user 
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Start server with retries
function startServer(retries = 5) {
    try {
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.clear();
            console.log('='.repeat(50));
            console.log(`Backend Server Running`);
            console.log('-'.repeat(50));
            console.log(`• Port: ${PORT}`);
            console.log(`• URL: http://localhost:${PORT}`);
            console.log(`• Health: http://localhost:${PORT}/health`);
            console.log(`• CORS: Enabled for http://localhost:3000`);
            console.log('='.repeat(50));
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`Port ${PORT} is in use, retrying...`);
                if (retries > 0) {
                    setTimeout(() => {
                        server.close();
                        startServer(retries - 1);
                    }, 1000);
                } else {
                    console.error(`Could not start server after 5 retries`);
                    process.exit(1);
                }
            } else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        if (retries > 0) {
            console.log('Retrying in 1 second...');
            setTimeout(() => startServer(retries - 1), 1000);
        } else {
            console.error('Server failed to start after 5 retries');
            process.exit(1);
        }
    }
}

// Start the server
startServer();