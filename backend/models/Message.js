const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message content cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['general', 'appointment', 'prescription', 'emergency', 'system'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'replied', 'archived'],
    default: 'unread'
  },
  relatedAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  readAt: Date,
  isSystemMessage: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ from: 1, createdAt: -1 });
messageSchema.index({ to: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ priority: 1 });
messageSchema.index({ to: 1, status: 1 });
messageSchema.index({ from: 1, to: 1, createdAt: -1 });

messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

messageSchema.statics.getConversation = async function(userId1, userId2, limit = 50) {
  return this.find({
    $or: [
      { from: userId1, to: userId2 },
      { from: userId2, to: userId1 }
    ]
  })
  .populate('from', 'username profile.firstName profile.lastName role')
  .populate('to', 'username profile.firstName profile.lastName role')
  .sort({ createdAt: -1 })
  .limit(limit);
};

messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    to: userId,
    status: 'unread'
  });
};

module.exports = mongoose.model('Message', messageSchema);