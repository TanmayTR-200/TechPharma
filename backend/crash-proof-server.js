require('express-async-errors');
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('🔴 Uncaught Exception:', error);
    // Keep the process running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
    // Keep the process running
});

// Basic middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🟢 [${timestamp}] ${req.method} ${req.url}`);
    if (Object.keys(req.body).length) {
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    }
    if (req.headers.authorization) {
        console.log('🔑 Auth:', req.headers.authorization.substring(0, 20) + '...');
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        time: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('👤 Login attempt:', { email });

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Test credentials
        if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
            const token = 'test-token-' + Date.now();
            const user = {
                _id: '1',
                email: email,
                name: 'Test User',
                role: 'user'
            };

            console.log('✅ Login successful:', { email });
            return res.json({
                success: true,
                token,
                user
            });
        }

        console.log('❌ Login failed:', { email });
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    } catch (error) {
        console.error('🔴 Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Token validation endpoint
app.get('/api/auth/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
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
    } catch (error) {
        console.error('🔴 Token validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔴 Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Function to start server with retries
function startServer(retries = 5) {
    const PORT = 5000;

    try {
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.clear();
            console.log('\n' + '='.repeat(50));
            console.log('🚀 TechPharma Backend Server');
            console.log('-'.repeat(50));
            console.log('✅ Status: Running');
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`⏰ Started: ${new Date().toISOString()}`);
            console.log('\n📝 Test Credentials:');
            console.log('   Email: tanmaytr05@gmail.com');
            console.log('   Password: tanmaytr0');
            console.log('\n🛠️  Endpoints:');
            console.log('   POST /api/auth/login - Login');
            console.log('   GET  /api/auth/me    - Validate token');
            console.log('   GET  /health        - Health check');
            console.log('=' .repeat(50) + '\n');
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`🔄 Port ${PORT} is busy, retrying in 1s...`);
                if (retries > 0) {
                    setTimeout(() => {
                        server.close();
                        startServer(retries - 1);
                    }, 1000);
                } else {
                    console.error(`❌ Could not start server after 5 retries`);
                    process.exit(1);
                }
            } else {
                console.error('🔴 Server error:', error);
            }
        });

        // Handle server shutdown
        process.on('SIGTERM', () => {
            console.log('\n👋 Shutting down gracefully...');
            server.close(() => {
                console.log('✅ Server closed successfully');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('🔴 Failed to start server:', error);
        if (retries > 0) {
            console.log('🔄 Retrying in 1 second...');
            setTimeout(() => startServer(retries - 1), 1000);
        } else {
            console.error('❌ Server failed to start after 5 retries');
            process.exit(1);
        }
    }
}

// Start the server
startServer();