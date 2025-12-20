const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Helper to read users
const getUsersData = () => {
  const usersPath = path.join(__dirname, '../data/users.json');
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, JSON.stringify([
      {
        _id: "1",
        name: "Tanmay T R",
        email: "tanmaytr05@gmail.com",
        role: "supplier"
      }
    ]));
  }
  return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
};

// Get user by ID
router.get('/:id', authenticate, (req, res) => {
  try {
    const users = getUsersData();
    const user = users.find(u => u._id === req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// List all users (for admin purposes)
router.get('/', authenticate, (req, res) => {
  try {
    const users = getUsersData();
    res.json({
      success: true,
      users: users.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

module.exports = router;