const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB connection (comment out if not using MongoDB yet)
// mongoose.connect('mongodb://localhost:27017/techpharma')
//     .then(() => console.log('Connected to MongoDB'))
//     .catch(err => console.error('MongoDB connection error:', err));

// Mock data
const mockProducts = [
    {
        _id: '1',
        name: 'Industrial Power Bank',
        description: 'High-capacity industrial power bank',
        price: 299.99,
        category: 'Electronics',
        image: '/industrial-power-bank.png',
        supplier: 'ElectroTech Systems'
    },
    {
        _id: '2',
        name: 'CNC Machining Center',
        description: 'Professional CNC machining system',
        price: 15999.99,
        category: 'Machinery',
        image: '/cnc-machining-center.png',
        supplier: 'MechaTech Solutions'
    }
];

const mockCategories = [
    { _id: '1', name: 'Electronics' },
    { _id: '2', name: 'Machinery' },
    { _id: '3', name: 'Tools' }
];

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === 'tanmaytr05@gmail.com' && password === 'tanmaytr0') {
        res.json({
            token: 'mock-token-' + Date.now(),
            user: {
                _id: '1',
                email,
                name: 'Test User',
                role: 'user'
            }
        });
    } else {
        res.status(401).json({
            message: 'Invalid credentials'
        });
    }
});

app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token?.startsWith('mock-token-')) {
        res.json({
            success: true,
            user: {
                _id: '1',
                email: 'tanmaytr05@gmail.com',
                name: 'Test User',
                role: 'user'
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Products endpoints
app.get('/api/products', (req, res) => {
    try {
        // Support basic filtering/search from query params
        const { search, category, priceMin, priceMax, scope } = req.query;
        let results = mockProducts.slice();

        if (search && typeof search === 'string') {
            const q = search.toLowerCase();
            // If a scope is provided, limit matching to that scope
            if (scope === 'supplier') {
                results = results.filter(p => (
                    (p.supplier && typeof p.supplier === 'string' && p.supplier.toLowerCase().includes(q)) ||
                    (p.supplier && typeof p.supplier === 'object' && (
                        (p.supplier.name && p.supplier.name.toLowerCase().includes(q)) ||
                        (p.supplier.company && p.supplier.company.name && p.supplier.company.name.toLowerCase().includes(q))
                    ))
                ));
            } else if (scope === 'category') {
                results = results.filter(p => (p.category && p.category.toLowerCase().includes(q)));
            } else if (scope === 'product') {
                results = results.filter(p => (
                    (p.name && p.name.toLowerCase().includes(q)) ||
                    (p.description && p.description.toLowerCase().includes(q))
                ));
            } else {
                // default: search all fields
                results = results.filter(p => (
                    (p.name && p.name.toLowerCase().includes(q)) ||
                    (p.description && p.description.toLowerCase().includes(q)) ||
                    (p.category && p.category.toLowerCase().includes(q)) ||
                    (p.supplier && typeof p.supplier === 'string' && p.supplier.toLowerCase().includes(q)) ||
                    (p.supplier && typeof p.supplier === 'object' && (
                        (p.supplier.name && p.supplier.name.toLowerCase().includes(q)) ||
                        (p.supplier.company && p.supplier.company.name && p.supplier.company.name.toLowerCase().includes(q))
                    ))
                ));
            }
        }

        if (category && typeof category === 'string') {
            const cats = category.split(',').map(c => c.trim().toLowerCase());
            results = results.filter(p => p.category && cats.includes(p.category.toLowerCase()));
        }

        if (priceMin) {
            const min = parseFloat(priceMin);
            if (!isNaN(min)) results = results.filter(p => typeof p.price === 'number' && p.price >= min);
        }

        if (priceMax) {
            const max = parseFloat(priceMax);
            if (!isNaN(max)) results = results.filter(p => typeof p.price === 'number' && p.price <= max);
        }

        res.json({ products: results, total: results.length });
    } catch (err) {
        console.error('Error handling /api/products:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/products/:id', (req, res) => {
    const product = mockProducts.find(p => p._id === req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

// Categories endpoints
app.get('/api/categories', (req, res) => {
    res.json(mockCategories);
});

// Orders endpoints
app.get('/api/orders', (req, res) => {
    res.json([
        {
            _id: '1',
            products: [mockProducts[0]],
            status: 'pending',
            total: 299.99,
            createdAt: new Date()
        }
    ]);
});

// Messages endpoints
app.get('/api/messages', (req, res) => {
    res.json([
        {
            _id: '1',
            from: 'Supplier',
            message: 'Your order has been received',
            createdAt: new Date()
        }
    ]);
});

app.get('/api/messages/conversations', (req, res) => {
    res.json([
        {
            _id: '1',
            participant: 'Supplier',
            lastMessage: 'Your order has been received',
            updatedAt: new Date()
        }
    ]);
});

// Health check
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
    console.log('TechPharma Backend Server');
    console.log('-'.repeat(50));
    console.log(`• Port: ${PORT}`);
    console.log(`• URL: http://localhost:${PORT}`);
    console.log(`• Test Login:`);
    console.log(`  - Email: tanmaytr05@gmail.com`);
    console.log(`  - Password: tanmaytr0`);
    console.log('• Endpoints:');
    console.log(`  - Auth: /api/auth/*`);
    console.log(`  - Products: /api/products`);
    console.log(`  - Categories: /api/categories`);
    console.log(`  - Orders: /api/orders`);
    console.log(`  - Messages: /api/messages`);
    console.log('='.repeat(50));
});