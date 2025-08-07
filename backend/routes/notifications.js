const express = require('express');
const EmailNotification = require('../models/EmailNotification');
const emailService = require('../services/emailService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware for email notifications
const validateEmailNotification = [
  body('recipient')
    .isMongoId()
    .withMessage('Valid recipient ID is required'),
  
  body('notificationType')
    .isIn([
      'appointment_reminder',
      'appointment_confirmation', 
      'appointment_cancellation',
      'appointment_rescheduled',
      'medication_reminder',
      'lab_results_ready',
      'treatment_plan_update',
      'system_notification',
      'health_record_shared',
      'password_reset',
      'welcome_email',
      'discharge_instructions'
    ])
    .withMessage('Invalid notification type'),
  
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and must be less than 200 characters'),
  
  body('content.htmlBody')
    .isString()
    .isLength({ min: 1 })
    .withMessage('HTML content is required'),
  body('content.textBody')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Text content is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Create and send email notification
router.post('/', authenticate, authorize('admin', 'doctor', 'nurse'), validateEmailNotification, async (req, res) => {
  try {
    const { recipient, notificationType, subject, content, metadata, priority, scheduledFor } = req.body;

    const notification = new EmailNotification({
      recipient,
      sender: req.user._id,
      notificationType,
      subject,
      emailContent: {
        htmlBody: content.htmlBody,
        textBody: content.textBody
      },
      metadata: metadata || {},
      priority: priority || 'normal',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      status: 'pending'
    });

    await notification.save();

    // If scheduled for immediate sending
    if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
      try {
        await emailService.sendEmail(notification._id);
        notification.status = 'sent';
        notification.sentAt = new Date();
        await notification.save();
      } catch (sendError) {
        notification.status = 'failed';
        notification.failureReason = sendError.message;
        await notification.save();
      }
    }

    res.status(201).json({
      message: 'Email notification created successfully',
      notification: {
        id: notification._id,
        status: notification.status,
        scheduledFor: notification.scheduledFor,
        sentAt: notification.sentAt
      }
    });

  } catch (error) {
    console.error('Create email notification error:', error);
    res.status(500).json({ message: 'Server error creating notification' });
  }
});

// Get email notifications for current user
router.get('/my-notifications', authenticate, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.notificationType = type;
    }

    const notifications = await EmailNotification.find(query)
      .populate('sender', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EmailNotification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Admin: Get all email notifications
router.get('/', authenticate, authorize('admin'), validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, recipient } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.notificationType = type;
    }

    if (recipient) {
      query.recipient = recipient;
    }

    const notifications = await EmailNotification.find(query)
      .populate('recipient', 'username email profile.firstName profile.lastName')
      .populate('sender', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EmailNotification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Retry failed email notification
router.post('/:id/retry', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const notification = await EmailNotification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.status !== 'failed') {
      return res.status(400).json({ message: 'Only failed notifications can be retried' });
    }

    notification.status = 'pending';
    notification.failureReason = null;
    await notification.save();

    try {
      await emailService.sendEmail(notification._id);
      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (sendError) {
      notification.status = 'failed';
      notification.failureReason = sendError.message;
    }
    
    await notification.save();

    res.json({
      message: 'Notification retry attempted',
      status: notification.status,
      sentAt: notification.sentAt
    });

  } catch (error) {
    console.error('Retry notification error:', error);
    res.status(500).json({ message: 'Server error retrying notification' });
  }
});

module.exports = router;