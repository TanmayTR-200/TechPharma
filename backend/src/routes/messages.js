const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');

// Repositories - PostgreSQL when DATABASE_URL is set, shared JSON/cache otherwise.
const { users: usersRepo, messages: messagesRepo, notifications: notificationsRepo } = require('../db');

// Get all conversations for the current user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const messages = await messagesRepo.list();
    const users = await usersRepo.listAll();

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

    console.log(`[messages] user=${req.user._id} totalMsgs=${messages.length} conversations=${conversations.length}`);

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

    // Messages between these two users (either direction), oldest first.
    // Fetched BEFORE marking as read, so the response keeps pre-mark values -
    // exactly like the old read-all/write-back implementation behaved.
    const thread = await messagesRepo.findThread(req.user._id, userId);

    // Mark received messages as read
    await messagesRepo.markReceivedFrom(userId, req.user._id);

    // Include the conversation partner's name so the chat UI can show
    // it without calling the restricted GET /api/users/:id endpoint
    const partner = await usersRepo.findById(userId);

    res.json({ success: true, messages: thread, partner: partner ? { _id: partner._id, name: partner.name } : null });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Send a new message (with lock for concurrent send safety)
router.post('/send', authenticate, async (req, res) => {
  try {
    const { content, receiverId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    const { withLock } = require('../inventory/lock');

    const result = await withLock(async () => {
      // Use collision-safe ID + server timestamp for ordering
      const now = Date.now();
      const newMessage = {
        _id: now.toString() + Math.random().toString(36).slice(2, 6),
        senderId: req.user._id,
        receiverId: receiverId,
        content: content.trim(),
        timestamp: new Date(now).toISOString(),
        serverTimestamp: now,
        read: false,
      };

      await messagesRepo.create(newMessage);

      // Create a notification for the recipient
      const sender = await usersRepo.findById(req.user._id);
      const senderName = sender?.name || 'Someone';
      await notificationsRepo.create({
        _id: now.toString() + Math.random().toString(36).slice(2, 6) + 'msg',
        userId: receiverId,
        title: 'New message',
        message: `${senderName} sent you a message: "${content.trim().slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
        type: 'info',
        read: false,
        archived: false,
        createdAt: new Date().toISOString(),
        metadata: { senderId: req.user._id, senderName },
      });

      return { message: newMessage };
    });

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

module.exports = router;