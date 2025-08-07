const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient is required']
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Healthcare provider is required']
  },
  recordType: {
    type: String,
    enum: ['diagnosis', 'treatment', 'lab_result', 'vital_signs', 'prescription', 'procedure', 'imaging', 'consultation'],
    required: [true, 'Record type is required']
  },
  title: {
    type: String,
    required: [true, 'Record title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Record description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  clinicalData: {
    diagnosis: {
      icdCode: String,
      description: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'critical']
      }
    },
    vitals: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number
      },
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      respiratoryRate: Number,
      oxygenSaturation: Number
    },
    labResults: {
      testName: String,
      value: String,
      unit: String,
      referenceRange: String,
      status: {
        type: String,
        enum: ['normal', 'abnormal', 'critical']
      }
    },
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String,
      prescribedDate: Date
    }],
    procedures: {
      procedureName: String,
      cptCode: String,
      performedDate: Date,
      outcome: String,
      complications: String
    }
  },
  recordDate: {
    type: Date,
    required: [true, 'Record date is required'],
    default: Date.now
  },
  visitDate: {
    type: Date,
    required: [true, 'Visit date is required']
  },
  facility: {
    type: String,
    required: [true, 'Healthcare facility is required'],
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'amended', 'corrected'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  relatedRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthRecord'
  }],
  relatedAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  confidentiality: {
    type: String,
    enum: ['normal', 'restricted', 'very_restricted'],
    default: 'normal'
  },
  isAmendment: {
    type: Boolean,
    default: false
  },
  originalRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthRecord'
  },
  amendmentReason: String,
  signedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  signedDate: Date,
  isElectronicallySignedBy: {
    provider: Boolean,
    patient: Boolean
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
healthRecordSchema.index({ patient: 1, recordDate: -1 });
healthRecordSchema.index({ provider: 1, recordDate: -1 });
healthRecordSchema.index({ recordType: 1, recordDate: -1 });
healthRecordSchema.index({ patient: 1, recordType: 1 });
healthRecordSchema.index({ status: 1 });
healthRecordSchema.index({ priority: 1 });
healthRecordSchema.index({ visitDate: 1 });
healthRecordSchema.index({ facility: 1, department: 1 });

// Static method to get patient's health summary
healthRecordSchema.statics.getPatientSummary = async function(patientId, options = {}) {
  const { limit = 10, recordType, startDate, endDate } = options;
  
  let query = { patient: patientId, status: 'active' };
  
  if (recordType) {
    query.recordType = recordType;
  }
  
  if (startDate || endDate) {
    query.recordDate = {};
    if (startDate) query.recordDate.$gte = new Date(startDate);
    if (endDate) query.recordDate.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('provider', 'username profile.firstName profile.lastName profile.specialization')
    .populate('relatedAppointment', 'appointmentDate timeSlot')
    .sort({ recordDate: -1 })
    .limit(limit);
};

// Static method to get records by type
healthRecordSchema.statics.getRecordsByType = async function(patientId, recordType) {
  return this.find({ 
    patient: patientId, 
    recordType, 
    status: 'active' 
  })
  .populate('provider', 'username profile.firstName profile.lastName')
  .sort({ recordDate: -1 });
};

// Instance method to create amendment
healthRecordSchema.methods.createAmendment = function(amendmentData, amendmentReason) {
  const amendment = new this.constructor({
    ...amendmentData,
    patient: this.patient,
    isAmendment: true,
    originalRecord: this._id,
    amendmentReason,
    recordDate: new Date()
  });
  
  return amendment.save();
};

module.exports = mongoose.model('HealthRecord', healthRecordSchema);