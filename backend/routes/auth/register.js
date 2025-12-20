const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../../models/user');

router.post('/', async (req, res) => {
  try {
    console.log('Received registration request:', req.body);
    
    const { name, email, password, company } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: 'supplier', // or 'buyer' based on your requirements
      company: company,
      createdAt: new Date()
    });

    // Save user
    await user.save();

    // Generate token for the user
    const token = 'generated-token-' + Date.now(); // Replace with actual JWT token generation

    // Remove password from response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering user'
    });
  }
});

module.exports = router;