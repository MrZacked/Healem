const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Doctor is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Appointment date must be in the future'
    }
  },
  timeSlot: {
    start: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    end: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'check-up', 'emergency', 'surgery'],
    default: 'consultation'
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  notes: {
    patient: {
      type: String,
      maxlength: [1000, 'Patient notes cannot exceed 1000 characters']
    },
    doctor: {
      type: String,
      maxlength: [1000, 'Doctor notes cannot exceed 1000 characters']
    },
    admin: {
      type: String,
      maxlength: [500, 'Admin notes cannot exceed 500 characters']
    }
  },
  prescription: [{
    medication: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  followUpDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  estimatedDuration: {
    type: Number,
    default: 30,
    min: [15, 'Minimum appointment duration is 15 minutes'],
    max: [240, 'Maximum appointment duration is 4 hours']
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

appointmentSchema.pre('save', function(next) {
  if (this.timeSlot && this.timeSlot.start && this.timeSlot.end) {
    const startTime = this.timeSlot.start.split(':').map(Number);
    const endTime = this.timeSlot.end.split(':').map(Number);
    
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];
    
    if (startMinutes >= endMinutes) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1, 'timeSlot.start': 1 });
appointmentSchema.index({ 
  doctor: 1, 
  appointmentDate: 1, 
  'timeSlot.start': 1, 
  'timeSlot.end': 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    status: { $in: ['pending', 'confirmed'] } 
  }
});

appointmentSchema.statics.checkAvailability = async function(doctorId, date, timeSlot) {
  const existingAppointment = await this.findOne({
    doctor: doctorId,
    appointmentDate: date,
    $or: [
      {
        'timeSlot.start': { $lt: timeSlot.end },
        'timeSlot.end': { $gt: timeSlot.start }
      }
    ],
    status: { $in: ['pending', 'confirmed'] }
  });
  
  return !existingAppointment;
};

module.exports = mongoose.model('Appointment', appointmentSchema);