const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validateMessage, validateObjectId, validatePagination } = require('../middleware/validation');
const { messageLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', authenticate, messageLimiter, validateMessage, async (req, res) => {
  try {
    const { to, subject, content, type, priority, relatedAppointment } = req.body;

    const recipient = await User.findById(to);
    if (!recipient || !recipient.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive recipient' });
    }

    const canMessage = 
      req.user.role === 'admin' ||
      ['doctor', 'nurse'].includes(req.user.role) ||
      (req.user.role === 'patient' && ['doctor', 'nurse', 'admin'].includes(recipient.role));

    if (!canMessage) {
      return res.status(403).json({ 
        message: 'You are not authorized to send messages to this user' 
      });
    }

    const message = new Message({
      from: req.user._id,
      to,
      subject,
      content,
      type: type || 'general',
      priority: priority || 'normal',
      relatedAppointment
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('from', 'username profile.firstName profile.lastName role')
      .populate('to', 'username profile.firstName profile.lastName role')
      .populate('relatedAppointment', 'appointmentDate timeSlot');

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/inbox', authenticate, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { status, type, priority } = req.query;
    let query = { to: req.user._id };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (priority) {
      query.priority = priority;
    }

    const messages = await Message.find(query)
      .populate('from', 'username profile.firstName profile.lastName role')
      .populate('relatedAppointment', 'appointmentDate timeSlot')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments(query);
    const unreadCount = await Message.countDocuments({ 
      to: req.user._id, 
      status: 'unread' 
    });

    res.json({
      messages,
      unreadCount,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({
      message: 'Failed to retrieve messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/sent', authenticate, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ from: req.user._id })
      .populate('to', 'username profile.firstName profile.lastName role')
      .populate('relatedAppointment', 'appointmentDate timeSlot')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ from: req.user._id });

    res.json({
      messages,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get sent messages error:', error);
    res.status(500).json({
      message: 'Failed to retrieve sent messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/conversation/:userId', 
  authenticate, 
  validateObjectId('userId'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const conversation = await Message.getConversation(req.user._id, userId, limit);

      await Message.updateMany(
        { 
          from: userId, 
          to: req.user._id, 
          status: 'unread' 
        },
        { 
          status: 'read', 
          readAt: new Date() 
        }
      );

      res.json({
        conversation,
        participant: {
          _id: user._id,
          username: user.username,
          profile: user.profile,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        message: 'Failed to retrieve conversation',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/:id', 
  authenticate, 
  validateObjectId('id'),
  async (req, res) => {
    try {
      const message = await Message.findById(req.params.id)
        .populate('from', 'username profile.firstName profile.lastName role')
        .populate('to', 'username profile.firstName profile.lastName role')
        .populate('relatedAppointment', 'appointmentDate timeSlot reason');

      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      const isAuthorized = 
        message.from._id.toString() === req.user._id.toString() ||
        message.to._id.toString() === req.user._id.toString() ||
        req.user.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({ message: 'Access denied to this message' });
      }

      if (message.to._id.toString() === req.user._id.toString() && message.status === 'unread') {
        await message.markAsRead();
      }

      res.json({ message });

    } catch (error) {
      console.error('Get message error:', error);
      res.status(500).json({
        message: 'Failed to retrieve message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.patch('/:id/status', 
  authenticate, 
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['unread', 'read', 'replied', 'archived'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const message = await Message.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      if (message.to.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update your own messages' });
      }

      message.status = status;
      if (status === 'read' && !message.readAt) {
        message.readAt = new Date();
      }

      await message.save();

      res.json({
        message: 'Message status updated successfully',
        data: message
      });

    } catch (error) {
      console.error('Update message status error:', error);
      res.status(500).json({
        message: 'Failed to update message status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.delete('/:id', 
  authenticate, 
  validateObjectId('id'),
  async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      const canDelete = 
        message.from.toString() === req.user._id.toString() ||
        message.to.toString() === req.user._id.toString() ||
        req.user.role === 'admin';

      if (!canDelete) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await Message.findByIdAndDelete(req.params.id);

      res.json({ message: 'Message deleted successfully' });

    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        message: 'Failed to delete message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/stats/unread-count', authenticate, async (req, res) => {
  try {
    const unreadCount = await Message.getUnreadCount(req.user._id);
    
    res.json({ unreadCount });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      message: 'Failed to get unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;