const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');

const getMessagesFilePath = () => path.join(__dirname, '../../data/messages.json');

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Get all conversations for the current user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const messages = readJsonFile(getMessagesFilePath());
    const users = readJsonFile(path.join(__dirname, '../../data/users.json'));

    // Prebuild a user map ONCE to avoid N+1 lookups per conversation partner
    const userMap = new Map(users.map(u => [u._id, u]));

    // Group messages by conversation partner (senderId/receiverId pair)
    const conversationMap = new Map();

    messages.forEach(msg => {
      const partnerId = msg.senderId === req.user._id ? msg.receiverId : msg.senderId;
      const isUser = msg.senderId === req.user._id;

      if (!conversationMap.has(partnerId)) {
        const partner = userMap.get(partnerId);   // O(1) lookup
        conversationMap.set(partnerId, {
          _id: partnerId,
          senderName: partner?.name || 'Unknown User',
          messages: [],
          lastMessageTime: null,
          unreadCount: 0,
        });
      }

      const conv = conversationMap.get(partnerId);
      conv.messages.push(msg);
      conv.lastMessageTime = msg.timestamp;
      if (!isUser && !msg.read) {
        conv.unreadCount++;
      }
    });

    const conversations = Array.from(conversationMap.values())
      .map(c => ({
        _id: c._id,
        senderName: c.senderName,
        lastMessage: c.messages[c.messages.length - 1]?.content || '',
        lastMessageTime: c.lastMessageTime,
        unreadCount: c.unreadCount,
      }))
      .sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

// Get messages between current user and another user
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = readJsonFile(getMessagesFilePath());
    const users = readJsonFile(path.join(__dirname, '../../data/users.json'));

    // Filter messages between these two users (either direction)
    const thread = messages
      .filter(msg =>
        (msg.senderId === req.user._id && msg.receiverId === userId) ||
        (msg.senderId === userId && msg.receiverId === req.user._id)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Mark received messages as read
    const updated = messages.map(msg => {
      if (msg.senderId === userId && msg.receiverId === req.user._id) {
        return { ...msg, read: true };
      }
      return msg;
    });
    writeJsonFile(getMessagesFilePath(), updated);

    res.json({ success: true, messages: thread });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Send a new message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { content, receiverId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    const messages = readJsonFile(getMessagesFilePath());

    const newMessage = {
      _id: Date.now().toString(),
      senderId: req.user._id,
      receiverId: receiverId,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    messages.push(newMessage);
    writeJsonFile(getMessagesFilePath(), messages);

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

module.exports = router;