const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

const notificationsPath = path.join(__dirname, '../data/notifications.json');

// Helper to read notifications
const getNotificationsData = () => {
  if (!fs.existsSync(notificationsPath)) {
    fs.writeFileSync(notificationsPath, JSON.stringify([], null, 2));
    return [];
  }
  return JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
};

// Helper to save notifications
const saveNotificationsData = (notifications) => {
  fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));
};

// GET /api/notifications - Get notifications for current user
router.get('/', authenticate, (req, res) => {
  const allNotifications = getNotificationsData();
  const userId = req.user._id;
  
  // Filter notifications for current user
  const userNotifications = allNotifications.filter(n => n.userId === userId);
  
  // Create welcome notification if user has no notifications
  if (userNotifications.length === 0) {
    const welcomeNotification = {
      _id: `${userId}-welcome-${Date.now()}`,
      userId: userId,
      title: 'Welcome to TechPharma!',
      message: 'Thank you for joining our platform.',
      read: false,
      archived: false,
      createdAt: new Date().toISOString()
    };
    allNotifications.push(welcomeNotification);
    saveNotificationsData(allNotifications);
    userNotifications.push(welcomeNotification);
  }
  
  res.json({ success: true, notifications: userNotifications });
});

// POST /api/notifications/:id/read - Mark single notification as read
router.post('/:id/read', authenticate, (req, res) => {
  const notifications = getNotificationsData();
  const notification = notifications.find(n => n._id === req.params.id && n.userId === req.user._id);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  notification.read = true;
  saveNotificationsData(notifications);
  res.json({ success: true, notification });
});

// POST /api/notifications/mark-all-read - Mark all as read for current user
router.post('/mark-all-read', authenticate, (req, res) => {
  let notifications = getNotificationsData();
  const userId = req.user._id;
  notifications = notifications.map(n => 
    n.userId === userId ? { ...n, read: true } : n
  );
  saveNotificationsData(notifications);
  res.json({ success: true, message: 'All notifications marked as read' });
});

// POST /api/notifications/:id/archive - Archive notification
router.post('/:id/archive', authenticate, (req, res) => {
  const notifications = getNotificationsData();
  const notification = notifications.find(n => n._id === req.params.id && n.userId === req.user._id);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  notification.archived = true;
  saveNotificationsData(notifications);
  res.json({ success: true, message: 'Notification archived' });
});

// POST /api/notifications/:id/unarchive - Unarchive notification
router.post('/:id/unarchive', authenticate, (req, res) => {
  const notifications = getNotificationsData();
  const notification = notifications.find(n => n._id === req.params.id && n.userId === req.user._id);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  notification.archived = false;
  saveNotificationsData(notifications);
  res.json({ success: true, message: 'Notification unarchived' });
});

module.exports = router;
