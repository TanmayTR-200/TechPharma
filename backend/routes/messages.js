const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Helper to read messages
const getMessagesData = () => {
  const messagesPath = path.join(__dirname, '../data/messages.json');
  if (!fs.existsSync(messagesPath)) {
    fs.writeFileSync(messagesPath, JSON.stringify([]));
    return [];
  }
  return JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
};

// Helper to read users
const getUsersData = () => {
  const usersPath = path.join(__dirname, '../data/users.json');
  if (!fs.existsSync(usersPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
};

// Helper to write messages
const saveMessagesData = (messages) => {
  const messagesPath = path.join(__dirname, '../data/messages.json');
  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
};

// Get all conversations for a user
router.get('/conversations', authenticate, (req, res) => {
  try {
    const messages = getMessagesData();
    const userId = req.user._id;
    const users = getUsersData();

    // Get unique conversations with user details
    const conversationMap = new Map();
    
    messages
      .filter(msg => msg.senderId === userId || msg.receiverId === userId)
      .forEach(msg => {
        const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        
        if (!conversationMap.has(otherId)) {
          const otherUser = users.find(u => u._id === otherId);
          conversationMap.set(otherId, {
            _id: otherId,
            sender: userId,
            receiver: otherId,
            senderName: req.user.name,
            receiverName: otherUser ? otherUser.name : 'Unknown',
            lastMessage: msg.content,
            lastMessageTime: msg.timestamp,
            unreadCount: 0
          });
        } else {
          // Update to latest message
          const existing = conversationMap.get(otherId);
          if (new Date(msg.timestamp) > new Date(existing.lastMessageTime)) {
            existing.lastMessage = msg.content;
            existing.lastMessageTime = msg.timestamp;
          }
        }
        
        // Count unread messages
        if (msg.receiverId === userId && !msg.read) {
          conversationMap.get(otherId).unreadCount++;
        }
      });

    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
});

// Get messages between two users
router.get('/:userId', authenticate, (req, res) => {
  try {
    const messages = getMessagesData();
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    const conversation = messages
      .filter(msg => 
        (msg.senderId === currentUserId && msg.receiverId === otherUserId) ||
        (msg.senderId === otherUserId && msg.receiverId === currentUserId)
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Mark messages as read
    messages.forEach(msg => {
      if (msg.receiverId === currentUserId && msg.senderId === otherUserId) {
        msg.read = true;
      }
    });
    saveMessagesData(messages);

    res.json({
      success: true,
      messages: conversation
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
});

// Send a message
router.post('/send', authenticate, (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and content are required'
      });
    }

    const messages = getMessagesData();
    const newMessage = {
      _id: Date.now().toString(),
      senderId: req.user._id,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      read: false
    };

    messages.push(newMessage);
    saveMessagesData(messages);

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
});

module.exports = router;