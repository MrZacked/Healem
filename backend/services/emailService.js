const EmailNotification = require('../models/EmailNotification');

// Mock email service for development; integrate with a provider in production
class EmailService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@healem.com';
    this.fromName = process.env.FROM_NAME || 'Healem Health Management';
  }

  // Send a single email notification
  async sendEmail(notificationId) {
    try {
      const notification = await EmailNotification.findById(notificationId)
        .populate('recipient', 'email username profile.firstName profile.lastName')
        .populate('sender', 'email username profile.firstName profile.lastName');

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.status !== 'pending') {
        throw new Error('Notification is not in pending status');
      }

      // Check if scheduled time has arrived
      if (notification.scheduledFor > new Date()) {
        console.log(`Email notification ${notificationId} is scheduled for future delivery`);
        return false;
      }

      const emailData = {
        to: notification.recipient.email,
        from: `${this.fromName} <${this.fromEmail}>`,
        subject: notification.subject,
        html: notification.emailContent.htmlBody,
        text: notification.emailContent.textBody,
        priority: notification.priority
      };

      // In production, this would call actual email service
      const result = await this.sendEmailViaProvider(emailData);

      if (result.success) {
        await notification.markAsSent();
        console.log(`Email sent successfully to ${notification.recipient.email}`);
        return true;
      } else {
        await notification.markAsFailed(result.error);
        console.error(`Failed to send email to ${notification.recipient.email}:`, result.error);
        return false;
      }

    } catch (error) {
      console.error('Email service error:', error);
      
      if (notificationId) {
        try {
          const notification = await EmailNotification.findById(notificationId);
          if (notification) {
            await notification.markAsFailed(error.message);
          }
        } catch (updateError) {
          console.error('Failed to update notification status:', updateError);
        }
      }
      
      throw error;
    }
  }

  // Mock email provider (replace with actual service in production)
  async sendEmailViaProvider(emailData) {
    try {
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // In development, just log the email
      if (!this.isProduction) {
        console.log('EMAIL SENT (DEVELOPMENT MODE):');
        console.log('To:', emailData.to);
        console.log('Subject:', emailData.subject);
        console.log('Priority:', emailData.priority);
        console.log('Text Content:', emailData.text.substring(0, 200) + '...');
        console.log('---');
        
        return { success: true, messageId: 'dev-' + Date.now() };
      }

      // Production email sending would go here
      // Example with different providers:
      /*
      // SendGrid example:
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const result = await sgMail.send(emailData);
      
      // Nodemailer example:
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter(config);
      const result = await transporter.sendMail(emailData);
      
      // AWS SES example:
      const AWS = require('aws-sdk');
      const ses = new AWS.SES({region: 'us-east-1'});
      const result = await ses.sendEmail(params).promise();
      */

      return { success: true, messageId: 'prod-' + Date.now() };

    } catch (error) {
      console.error('Email provider error:', error);
      return { success: false, error: error.message };
    }
  }

  // Process pending emails (for cron job or background worker)
  async processPendingEmails(limit = 50) {
    try {
      const pendingNotifications = await EmailNotification.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: 5 }
      })
      .sort({ priority: -1, scheduledFor: 1 })
      .limit(limit);

      console.log(`Processing ${pendingNotifications.length} pending email notifications`);

      const results = {
        sent: 0,
        failed: 0,
        skipped: 0
      };

      for (const notification of pendingNotifications) {
        try {
          const success = await this.sendEmail(notification._id);
          if (success) {
            results.sent++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error(`Failed to process notification ${notification._id}:`, error);
          results.failed++;
        }
      }

      console.log('Email processing results:', results);
      return results;

    } catch (error) {
      console.error('Error processing pending emails:', error);
      throw error;
    }
  }

  // Process failed emails for retry
  async retryFailedEmails(maxRetries = 3) {
    try {
      const failedNotifications = await EmailNotification.find({
        status: 'failed',
        attempts: { $lt: maxRetries },
        lastAttempt: { 
          $lt: new Date(Date.now() - 30 * 60 * 1000) // Wait 30 minutes before retry
        }
      })
      .sort({ priority: -1, lastAttempt: 1 })
      .limit(20);

      console.log(`Retrying ${failedNotifications.length} failed email notifications`);

      for (const notification of failedNotifications) {
        try {
          // Reset to pending for retry
          notification.status = 'pending';
          await notification.save();
          
          await this.sendEmail(notification._id);
        } catch (error) {
          console.error(`Failed to retry notification ${notification._id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error retrying failed emails:', error);
      throw error;
    }
  }

  // Send appointment reminder
  async sendAppointmentReminder(appointmentId, reminderType = '24_hours') {
    try {
      const notification = await EmailNotification.createAppointmentReminder(appointmentId, reminderType);
      
      if (!notification) {
        console.log('Appointment reminder not scheduled (too late)');
        return false;
      }

      // If scheduled for immediate delivery, send now
      if (notification.scheduledFor <= new Date()) {
        return await this.sendEmail(notification._id);
      }

      console.log(`Appointment reminder scheduled for ${notification.scheduledFor}`);
      return true;

    } catch (error) {
      console.error('Error scheduling appointment reminder:', error);
      throw error;
    }
  }

  // Send lab results notification
  async sendLabResultsNotification(patientId, healthRecordId) {
    try {
      const notification = await EmailNotification.createLabResultsNotification(patientId, healthRecordId);
      return await this.sendEmail(notification._id);

    } catch (error) {
      console.error('Error sending lab results notification:', error);
      throw error;
    }
  }

  // Send custom notification
  async sendCustomNotification(recipientId, notificationType, subject, content, options = {}) {
    try {
      const notification = new EmailNotification({
        recipient: recipientId,
        sender: options.senderId,
        notificationType,
        subject,
        emailContent: {
          htmlBody: content.htmlBody,
          textBody: content.textBody
        },
        templateData: options.templateData || {},
        relatedEntity: options.relatedEntity,
        scheduledFor: options.scheduledFor || new Date(),
        priority: options.priority || 'normal'
      });

      await notification.save();

      // If scheduled for immediate delivery, send now
      if (notification.scheduledFor <= new Date()) {
        return await this.sendEmail(notification._id);
      }

      return true;

    } catch (error) {
      console.error('Error sending custom notification:', error);
      throw error;
    }
  }

  // Get email statistics
  async getEmailStats(startDate, endDate) {
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await EmailNotification.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          byType: {
            $push: {
              type: '$notificationType',
              priority: '$priority'
            }
          }
        }
      }
    ]);

    const typeStats = await EmailNotification.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$notificationType',
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    return {
      statusStats: stats,
      typeStats: typeStats
    };
  }
}

module.exports = new EmailService();