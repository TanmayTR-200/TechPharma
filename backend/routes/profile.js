const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user data
    if (req.body.company) {
      // Initialize company object if it doesn't exist
      if (!user.company) {
        user.company = {
          name: '',
          description: '',
          website: '',
          address: '',
          logo: ''
        };
      }
      // Ensure we're properly merging the company data
      user.company = {
        ...user.company,
        ...req.body.company
      };
      
      // Log the update for debugging
      console.log('Updating company info:', user.company);
    }

    // Update other fields
    if (req.body.phone !== undefined) {
      user.phone = req.body.phone;
    }
    
    try {
      const updatedUser = await user.save();
      console.log('Updated user:', updatedUser);
      // Return only non-sensitive data
      const { password, resetToken, ...userData } = updatedUser;
      res.json(userData);
    } catch (saveError) {
      console.error('Error saving user:', saveError);
      res.status(500).json({ message: 'Error saving user data', error: saveError.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;