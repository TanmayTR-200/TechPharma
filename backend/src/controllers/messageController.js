const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, productId } = req.body;
    const senderId = req.user._id;

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      product: productId || undefined
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, receiverId],
        product: productId,
        unreadCounts: { [receiverId.toString()]: 1 }
      });
    } else {
      // Increment unread count for receiver
      const currentCount = conversation.unreadCounts[receiverId.toString()] || 0;
      conversation.unreadCounts[receiverId.toString()] = currentCount + 1;
    }

    // Create message
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      product: productId,
      conversation: conversation._id
    });

    // Save both
    await message.save();
    conversation.lastMessage = message._id;
    await conversation.save();

    // Populate message for response
    await message.populate([
      { path: 'sender', select: 'firstName lastName company' },
      { path: 'product', select: 'name images' }
    ]);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate([
      { 
        path: 'participants', 
        select: 'firstName lastName company'
      },
      {
        path: 'lastMessage',
        select: 'content createdAt read'
      },
      {
        path: 'product',
        select: 'name images'
      }
    ])
    .sort('-updatedAt')
    .lean();

    // Transform data for frontend
    const transformedConversations = conversations.map(conv => ({
      ...conv,
      otherUser: conv.participants.find(p => p._id.toString() !== req.user._id.toString()),
      unreadCount: conv.unreadCounts?.[req.user._id.toString()] || 0
    }));

    res.json(transformedConversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({ conversation: conversationId })
      .populate([
        { path: 'sender', select: 'firstName lastName company' },
        { path: 'product', select: 'name images' }
      ])
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: req.user._id,
        read: false
      },
      { read: true }
    );

    // Reset unread count
    await Conversation.findOneAndUpdate(
      { _id: conversationId },
      { $set: { [`unreadCounts.${req.user._id}`]: 0 } }
    );

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOneAndUpdate(
      { _id: messageId, receiver: req.user._id },
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Update conversation unread count
    await Conversation.findOneAndUpdate(
      { _id: message.conversation },
      { $set: { [`unreadCount.${req.user._id}`]: 0 } }
    );

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: error.message });
  }
};
