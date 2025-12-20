const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Auth middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'No authentication token provided' 
        });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        // For real JWT tokens
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
        
        // Read users from the JSON file to get correct role
        const usersPath = path.join(__dirname, '../data/users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const user = users.find(u => u._id === (decoded.userId || decoded._id));
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Set user data with correct role from database
        req.user = {
            ...decoded,
            userId: user._id,
            _id: user._id,
            role: user.role || 'buyer', // Use role from database
            name: user.name,
            company: user.company
        };
        
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid authentication token'
        });
    }
};

module.exports = { authenticate };