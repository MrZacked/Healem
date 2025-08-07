const express = require('express');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { authenticate, authorize, authorizeAppointmentAccess } = require('../middleware/auth');
const { validateAppointment, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

router.post('/', authenticate, authorize('patient'), validateAppointment, async (req, res) => {
  try {
    const { doctor, appointmentDate, timeSlot, reason, type, priority } = req.body;

    const doctorUser = await User.findById(doctor);
    if (!doctorUser || doctorUser.role !== 'doctor' || !doctorUser.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive doctor selected' });
    }

    const appointment = new Appointment({
      patient: req.user._id,
      doctor,
      appointmentDate,
      timeSlot,
      reason,
      type: type || 'consultation',
      priority: priority || 'medium'
    });

    try {
      await appointment.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        return res.status(409).json({ 
          message: 'Doctor is not available at the selected time slot' 
        });
      }
      throw saveError;
    }
    
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('doctor', 'username profile.firstName profile.lastName profile.specialization');

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: populatedAppointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      message: 'Failed to book appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/', authenticate, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let query = {};
    const { status, date, doctorId, patientId } = req.query;

    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.appointmentDate = {
        $gte: searchDate,
        $lt: nextDay
      };
    }

    if (doctorId && ['admin', 'nurse'].includes(req.user.role)) {
      query.doctor = doctorId;
    }

    if (patientId && ['admin', 'nurse', 'doctor'].includes(req.user.role)) {
      query.patient = patientId;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'username profile.firstName profile.lastName profile.phone')
      .populate('doctor', 'username profile.firstName profile.lastName profile.specialization profile.department')
      .sort({ appointmentDate: 1, 'timeSlot.start': 1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      message: 'Failed to retrieve appointments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/:id', 
  authenticate, 
  validateObjectId('id'),
  authorizeAppointmentAccess,
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id)
        .populate('patient', 'username profile.firstName profile.lastName profile.phone profile.dateOfBirth')
        .populate('doctor', 'username profile.firstName profile.lastName profile.specialization profile.department');

      res.json({ appointment });

    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({
        message: 'Failed to retrieve appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.patch('/:id/status', 
  authenticate, 
  validateObjectId('id'),
  authorizeAppointmentAccess,
  async (req, res) => {
    try {
      const { status, notes } = req.body;
      const appointment = req.appointment;
      
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const canUpdateStatus = 
        req.user.role === 'admin' ||
        req.user.role === 'nurse' ||
        (req.user.role === 'doctor' && req.user._id.toString() === appointment.doctor.toString()) ||
        (req.user.role === 'patient' && req.user._id.toString() === appointment.patient.toString() && status === 'cancelled');

      if (!canUpdateStatus) {
        return res.status(403).json({ message: 'Not authorized to update appointment status' });
      }

      appointment.status = status;
      
      if (status === 'cancelled') {
        appointment.cancelledBy = req.user._id;
        appointment.cancellationReason = notes;
      }

      if (notes) {
        if (req.user.role === 'doctor') {
          appointment.notes.doctor = notes;
        } else if (req.user.role === 'patient') {
          appointment.notes.patient = notes;
        } else if (['admin', 'nurse'].includes(req.user.role)) {
          appointment.notes.admin = notes;
        }
      }

      await appointment.save();

      const updatedAppointment = await Appointment.findById(appointment._id)
        .populate('patient', 'username profile.firstName profile.lastName')
        .populate('doctor', 'username profile.firstName profile.lastName profile.specialization');

      res.json({
        message: 'Appointment status updated successfully',
        appointment: updatedAppointment
      });

    } catch (error) {
      console.error('Update appointment status error:', error);
      res.status(500).json({
        message: 'Failed to update appointment status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.put('/:id', 
  authenticate, 
  validateObjectId('id'),
  authorizeAppointmentAccess,
  async (req, res) => {
    try {
      const appointment = req.appointment;
      const { appointmentDate, timeSlot, reason, type, priority } = req.body;

      const canUpdate = 
        req.user.role === 'admin' ||
        req.user.role === 'nurse' ||
        (req.user.role === 'patient' && req.user._id.toString() === appointment.patient.toString() && appointment.status === 'pending');

      if (!canUpdate) {
        return res.status(403).json({ 
          message: 'Not authorized to update this appointment or appointment cannot be modified' 
        });
      }

      if (appointmentDate && timeSlot) {
        const isAvailable = await Appointment.checkAvailability(
          appointment.doctor, 
          appointmentDate, 
          timeSlot
        );
        
        if (!isAvailable) {
          return res.status(409).json({ 
            message: 'Doctor is not available at the selected time slot' 
          });
        }
        
        appointment.appointmentDate = appointmentDate;
        appointment.timeSlot = timeSlot;
      }

      if (reason) appointment.reason = reason;
      if (type) appointment.type = type;
      if (priority) appointment.priority = priority;

      await appointment.save();

      const updatedAppointment = await Appointment.findById(appointment._id)
        .populate('patient', 'username profile.firstName profile.lastName')
        .populate('doctor', 'username profile.firstName profile.lastName profile.specialization');

      res.json({
        message: 'Appointment updated successfully',
        appointment: updatedAppointment
      });

    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({
        message: 'Failed to update appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.delete('/:id', 
  authenticate, 
  validateObjectId('id'),
  authorize('admin'),
  async (req, res) => {
    try {
      const appointment = await Appointment.findByIdAndDelete(req.params.id);
      
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      res.json({ message: 'Appointment deleted successfully' });

    } catch (error) {
      console.error('Delete appointment error:', error);
      res.status(500).json({
        message: 'Failed to delete appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/doctor/:doctorId/availability', 
  authenticate, 
  validateObjectId('doctorId'),
  async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: 'Date parameter is required' });
      }

      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const bookedAppointments = await Appointment.find({
        doctor: doctorId,
        appointmentDate: {
          $gte: searchDate,
          $lt: nextDay
        },
        status: { $in: ['pending', 'confirmed'] }
      }).select('timeSlot');

      const workingHours = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ];

      const availableSlots = workingHours.filter(slot => {
        return !bookedAppointments.some(appointment => 
          appointment.timeSlot.start === slot
        );
      });

      res.json({
        date,
        availableSlots,
        bookedSlots: bookedAppointments.map(app => app.timeSlot)
      });

    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({
        message: 'Failed to retrieve availability',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;