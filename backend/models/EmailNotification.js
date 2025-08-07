const mongoose = require('mongoose');

const emailNotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notificationType: {
    type: String,
    enum: [
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
    ],
    required: [true, 'Notification type is required']
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  emailContent: {
    htmlBody: {
      type: String,
      required: [true, 'HTML email body is required']
    },
    textBody: {
      type: String,
      required: [true, 'Text email body is required']
    }
  },
  templateData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['appointment', 'healthRecord', 'message', 'user', 'prescription']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0,
    max: [5, 'Maximum 5 retry attempts allowed']
  },
  lastAttempt: Date,
  sentAt: Date,
  failureReason: String,
  deliveryStatus: {
    delivered: Boolean,
    bounced: Boolean,
    opened: Boolean,
    clicked: Boolean,
    openedAt: Date,
    clickedAt: Date
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    endDate: Date,
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    dayOfMonth: Number,
    monthOfYear: Number
  },
  metadata: {
    campaignId: String,
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
emailNotificationSchema.index({ recipient: 1, createdAt: -1 });
emailNotificationSchema.index({ status: 1, scheduledFor: 1 });
emailNotificationSchema.index({ notificationType: 1 });
emailNotificationSchema.index({ priority: 1, scheduledFor: 1 });
emailNotificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

// Static method to create appointment reminder
emailNotificationSchema.statics.createAppointmentReminder = async function(appointmentId, reminderType = '24_hours') {
  const Appointment = require('./Appointment');
  const User = require('./User');
  
  const appointment = await Appointment.findById(appointmentId)
    .populate('patient')
    .populate('doctor');
  
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const reminderTimes = {
    '24_hours': 24 * 60 * 60 * 1000,
    '2_hours': 2 * 60 * 60 * 1000,
    '30_minutes': 30 * 60 * 1000
  };

  const reminderDelay = reminderTimes[reminderType] || reminderTimes['24_hours'];
  const scheduledFor = new Date(appointment.appointmentDate.getTime() - reminderDelay);

  // Only schedule if the reminder time is in the future
  if (scheduledFor <= new Date()) {
    return null;
  }

  const templateData = {
    patientName: `${appointment.patient.profile.firstName} ${appointment.patient.profile.lastName}`,
    doctorName: `Dr. ${appointment.doctor.profile.firstName} ${appointment.doctor.profile.lastName}`,
    appointmentDate: appointment.appointmentDate.toLocaleDateString(),
    appointmentTime: appointment.timeSlot.start,
    specialization: appointment.doctor.profile.specialization,
    reminderType
  };

  const notification = new this({
    recipient: appointment.patient._id,
    notificationType: 'appointment_reminder',
    subject: `Appointment Reminder - ${templateData.appointmentDate} at ${templateData.appointmentTime}`,
    emailContent: {
      htmlBody: this.generateAppointmentReminderHTML(templateData),
      textBody: this.generateAppointmentReminderText(templateData)
    },
    templateData,
    relatedEntity: {
      entityType: 'appointment',
      entityId: appointmentId
    },
    scheduledFor,
    priority: reminderType === '30_minutes' ? 'high' : 'normal'
  });

  return notification.save();
};

// Static method to create lab results notification
emailNotificationSchema.statics.createLabResultsNotification = async function(patientId, healthRecordId) {
  const User = require('./User');
  const HealthRecord = require('./HealthRecord');
  
  const patient = await User.findById(patientId);
  const healthRecord = await HealthRecord.findById(healthRecordId).populate('provider');
  
  if (!patient || !healthRecord) {
    throw new Error('Patient or health record not found');
  }

  const templateData = {
    patientName: `${patient.profile.firstName} ${patient.profile.lastName}`,
    testName: healthRecord.title,
    providerName: `Dr. ${healthRecord.provider.profile.firstName} ${healthRecord.provider.profile.lastName}`,
    resultDate: healthRecord.recordDate.toLocaleDateString()
  };

  const notification = new this({
    recipient: patientId,
    sender: healthRecord.provider._id,
    notificationType: 'lab_results_ready',
    subject: `Lab Results Available - ${templateData.testName}`,
    emailContent: {
      htmlBody: this.generateLabResultsHTML(templateData),
      textBody: this.generateLabResultsText(templateData)
    },
    templateData,
    relatedEntity: {
      entityType: 'healthRecord',
      entityId: healthRecordId
    },
    priority: 'high'
  });

  return notification.save();
};

// Email template generators
emailNotificationSchema.statics.generateAppointmentReminderHTML = function(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Appointment Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .appointment-details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Reminder</h1>
        </div>
        <div class="content">
          <p>Dear ${data.patientName},</p>
          <p>This is a reminder of your upcoming appointment:</p>
          <div class="appointment-details">
            <h3>Appointment Details</h3>
            <p><strong>Doctor:</strong> ${data.doctorName}</p>
            <p><strong>Specialization:</strong> ${data.specialization}</p>
            <p><strong>Date:</strong> ${data.appointmentDate}</p>
            <p><strong>Time:</strong> ${data.appointmentTime}</p>
          </div>
          <p>Please arrive 15 minutes early for check-in.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Healem Health Management System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

emailNotificationSchema.statics.generateAppointmentReminderText = function(data) {
  return `
Appointment Reminder

Dear ${data.patientName},

This is a reminder of your upcoming appointment:

Appointment Details:
- Doctor: ${data.doctorName}
- Specialization: ${data.specialization}
- Date: ${data.appointmentDate}
- Time: ${data.appointmentTime}

Please arrive 15 minutes early for check-in.

If you need to reschedule or cancel, please contact us at least 24 hours in advance.

Healem Health Management System
This is an automated message. Please do not reply to this email.
  `;
};

emailNotificationSchema.statics.generateLabResultsHTML = function(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Lab Results Available</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .results-info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lab Results Available</h1>
        </div>
        <div class="content">
          <p>Dear ${data.patientName},</p>
          <p>Your lab results are now available for review.</p>
          <div class="results-info">
            <h3>Test Information</h3>
            <p><strong>Test:</strong> ${data.testName}</p>
            <p><strong>Provider:</strong> ${data.providerName}</p>
            <p><strong>Result Date:</strong> ${data.resultDate}</p>
          </div>
          <p>Please log into your patient portal to view your complete results.</p>
          <p>If you have any questions about your results, please contact your healthcare provider.</p>
        </div>
        <div class="footer">
          <p>Healem Health Management System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

emailNotificationSchema.statics.generateLabResultsText = function(data) {
  return `
Lab Results Available

Dear ${data.patientName},

Your lab results are now available for review.

Test Information:
- Test: ${data.testName}
- Provider: ${data.providerName}
- Result Date: ${data.resultDate}

Please log into your patient portal to view your complete results.

If you have any questions about your results, please contact your healthcare provider.

Healem Health Management System
This is an automated message. Please do not reply to this email.
  `;
};

// Instance method to mark as sent
emailNotificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Instance method to mark as failed
emailNotificationSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.attempts += 1;
  this.lastAttempt = new Date();
  this.failureReason = reason;
  return this.save();
};

module.exports = mongoose.model('EmailNotification', emailNotificationSchema);