const express = require('express');
const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware for health records
const validateHealthRecord = [
  body('patient')
    .isMongoId()
    .withMessage('Valid patient ID is required'),
  
  body('recordType')
    .isIn(['diagnosis', 'treatment', 'lab_result', 'vital_signs', 'prescription', 'procedure', 'imaging', 'consultation'])
    .withMessage('Invalid record type'),
  
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description is required and must be less than 2000 characters'),
  
  body('visitDate')
    .isISO8601()
    .withMessage('Valid visit date is required'),

  body('facility')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Healthcare facility is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
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

// Create a new health record
router.post('/', authenticate, authorize('doctor', 'nurse'), validateHealthRecord, async (req, res) => {
  try {
    const {
      patient,
      recordType,
      title,
      description,
      clinicalData,
      visitDate,
      facility,
      department,
      priority,
      relatedAppointment
    } = req.body;

    // Verify patient exists
    const patientUser = await User.findById(patient);
    if (!patientUser || patientUser.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient ID' });
    }

    const healthRecord = new HealthRecord({
      patient,
      provider: req.user._id,
      recordType,
      title,
      description,
      clinicalData,
      visitDate,
      facility,
      department,
      priority,
      relatedAppointment
    });

    await healthRecord.save();

    const populatedRecord = await HealthRecord.findById(healthRecord._id)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('provider', 'username profile.firstName profile.lastName profile.specialization')
      .populate('relatedAppointment', 'appointmentDate timeSlot');

    res.status(201).json({
      message: 'Health record created successfully',
      record: populatedRecord
    });

  } catch (error) {
    console.error('Create health record error:', error);
    res.status(500).json({
      message: 'Failed to create health record',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get health records (with filtering and pagination)
router.get('/', authenticate, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { patient, recordType, startDate, endDate, priority } = req.query;
    let query = {};

    // Role-based access control
    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else if (req.user.role === 'doctor' || req.user.role === 'nurse') {
      if (patient) {
        query.patient = patient;
      } else {
        query.provider = req.user._id;
      }
    }
    // Admin can access all records

    // Apply filters
    if (recordType) query.recordType = recordType;
    if (priority) query.priority = priority;

    // Date range filter
    if (startDate || endDate) {
      query.recordDate = {};
      if (startDate) query.recordDate.$gte = new Date(startDate);
      if (endDate) query.recordDate.$lte = new Date(endDate);
    }

    const records = await HealthRecord.find(query)
      .populate('patient', 'username profile.firstName profile.lastName profile.dateOfBirth')
      .populate('provider', 'username profile.firstName profile.lastName profile.specialization')
      .populate('relatedAppointment', 'appointmentDate timeSlot')
      .sort({ recordDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await HealthRecord.countDocuments(query);

    res.json({
      records,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get health records error:', error);
    res.status(500).json({
      message: 'Failed to retrieve health records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get my health records (for patients)
router.get('/my-records', authenticate, authorize('patient'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { recordType, startDate, endDate } = req.query;
    let query = { patient: req.user._id };

    if (recordType) query.recordType = recordType;

    if (startDate || endDate) {
      query.recordDate = {};
      if (startDate) query.recordDate.$gte = new Date(startDate);
      if (endDate) query.recordDate.$lte = new Date(endDate);
    }

    const records = await HealthRecord.find(query)
      .populate('provider', 'username profile.firstName profile.lastName profile.specialization')
      .populate('relatedAppointment', 'appointmentDate timeSlot')
      .sort({ recordDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await HealthRecord.countDocuments(query);

    res.json({
      records,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get my health records error:', error);
    res.status(500).json({
      message: 'Failed to retrieve health records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get specific health record
router.get('/:id', 
  authenticate, 
  validateObjectId('id'),
  async (req, res) => {
    try {
      const record = await HealthRecord.findById(req.params.id)
        .populate('patient', 'username profile.firstName profile.lastName profile.dateOfBirth')
        .populate('provider', 'username profile.firstName profile.lastName profile.specialization')
        .populate('relatedAppointment', 'appointmentDate timeSlot reason');

      if (!record) {
        return res.status(404).json({ message: 'Health record not found' });
      }

      // Check authorization
      const canAccess = 
        req.user.role === 'admin' ||
        req.user._id.toString() === record.provider._id.toString() ||
        req.user._id.toString() === record.patient._id.toString();

      if (!canAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ record });

    } catch (error) {
      console.error('Get health record error:', error);
      res.status(500).json({
        message: 'Failed to retrieve health record',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Update health record
router.put('/:id', 
  authenticate, 
  authorize('doctor', 'nurse', 'admin'),
  validateObjectId('id'),
  async (req, res) => {
    try {
      const record = await HealthRecord.findById(req.params.id);
      
      if (!record) {
        return res.status(404).json({ message: 'Health record not found' });
      }

      // Check authorization (only provider or admin can update)
      const canUpdate = 
        req.user.role === 'admin' ||
        req.user._id.toString() === record.provider.toString();

      if (!canUpdate) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const allowedUpdates = [
        'title', 'description', 'clinicalData', 
        'priority', 'tags'
      ];
      
      const updates = {};
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const updatedRecord = await HealthRecord.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      )
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('provider', 'username profile.firstName profile.lastName profile.specialization');

      res.json({
        message: 'Health record updated successfully',
        record: updatedRecord
      });

    } catch (error) {
      console.error('Update health record error:', error);
      res.status(500).json({
        message: 'Failed to update health record',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Delete health record (admin only)
router.delete('/:id', 
  authenticate, 
  authorize('admin'),
  validateObjectId('id'),
  async (req, res) => {
    try {
      const record = await HealthRecord.findByIdAndDelete(req.params.id);

      if (!record) {
        return res.status(404).json({ message: 'Health record not found' });
      }

      res.json({ message: 'Health record deleted successfully' });

    } catch (error) {
      console.error('Delete health record error:', error);
      res.status(500).json({
        message: 'Failed to delete health record',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;