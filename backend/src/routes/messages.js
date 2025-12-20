const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');

// Helper functions to read/write data
const getMessagesFilePath = () => path.join(__dirname, '../../data/messages.json');
const getConversationsFilePath = () => path.join(__dirname, '../../data/conversations.json');

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
    const conversations = readJsonFile(getConversationsFilePath());
    const messages = readJsonFile(getMessagesFilePath());
    const users = readJsonFile(path.join(__dirname, '../../data/users.json'));

    // Filter conversations where the user is either sender or receiver
    const userConversations = conversations
      .filter(conv => conv.sender === req.user._id || conv.receiver === req.user._id)
      .map(conv => {
        // Get the last message for each conversation
        const lastMessage = messages
          .filter(msg => msg.conversationId === conv._id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        // Get user details for sender and receiver
        const sender = users.find(u => u._id === conv.sender);
        const receiver = users.find(u => u._id === conv.receiver);

        return {
          ...conv,
          senderName: sender?.name || 'Unknown User',
          receiverName: receiver?.name || 'Unknown User',
          lastMessage: lastMessage?.content || '',
          lastMessageTime: lastMessage?.createdAt || conv.createdAt,
          unreadCount: messages.filter(msg => 
            msg.conversationId === conv._id && 
            msg.sender !== req.user._id && 
            !msg.readBy?.includes(req.user._id)
          ).length
        };
      })
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    res.json({ 
      success: true, 
      conversations: userConversations 
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
});

// Get messages for a specific conversation
router.get('/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversations = readJsonFile(getConversationsFilePath());
    const messages = readJsonFile(getMessagesFilePath());
    const users = readJsonFile(path.join(__dirname, '../../data/users.json'));

    // Find the conversation
    const conversation = conversations.find(c => c._id === conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify user is part of the conversation
    if (conversation.sender !== req.user._id && conversation.receiver !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }

    // Get user details
    const sender = users.find(u => u._id === conversation.sender);
    const receiver = users.find(u => u._id === conversation.receiver);

    // Get messages for this conversation
    const conversationMessages = messages
      .filter(msg => msg.conversationId === conversationId)
      .map(msg => ({
        ...msg,
        senderName: users.find(u => u._id === msg.sender)?.name || 'Unknown User'
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Mark messages as read
    const updatedMessages = messages.map(msg => {
      if (msg.conversationId === conversationId && msg.sender !== req.user._id) {
        return {
          ...msg,
          readBy: [...new Set([...(msg.readBy || []), req.user._id])]
        };
      }
      return msg;
    });
    writeJsonFile(getMessagesFilePath(), updatedMessages);

    res.json({
      success: true,
      conversation: {
        ...conversation,
        senderName: sender?.name || 'Unknown User',
        receiverName: receiver?.name || 'Unknown User'
      },
      messages: conversationMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Send a new message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { conversationId, content, receiverId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const conversations = readJsonFile(getConversationsFilePath());
    const messages = readJsonFile(getMessagesFilePath());
    const users = readJsonFile(path.join(__dirname, '../../data/users.json'));

    let conversation;
    if (conversationId) {
      // Find existing conversation
      conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Verify user is part of the conversation
      if (conversation.sender !== req.user._id && conversation.receiver !== req.user._id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to send messages in this conversation'
        });
      }
    } else if (receiverId) {
      // Create new conversation
      conversation = {
        _id: Date.now().toString(),
        sender: req.user._id,
        receiver: receiverId,
        createdAt: new Date().toISOString()
      };
      conversations.push(conversation);
      writeJsonFile(getConversationsFilePath(), conversations);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either conversationId or receiverId is required'
      });
    }

    // Create new message
    const newMessage = {
      _id: Date.now().toString(),
      conversationId: conversation._id,
      sender: req.user._id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      readBy: [req.user._id]
    };

    messages.push(newMessage);
    writeJsonFile(getMessagesFilePath(), messages);

    // Add sender name to response
    const sender = users.find(u => u._id === req.user._id);
    
    res.json({
      success: true,
      message: {
        ...newMessage,
        senderName: sender?.name || 'Unknown User'
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

module.exports = router;