const express = require('express');
const router = express.Router();

// Mock notifications data
const notifications = [
  {
    id: 1,
    message: "Welcome to TechPharma!",
    read: false,
    createdAt: new Date().toISOString()
  }
];

// GET /api/notifications
router.get('/', (req, res) => {
  res.json({ success: true, notifications });
});

module.exports = router;
