const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

const authorizeOwnerOrRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const resourceUserId = req.params.userId || req.params.id;
    const isOwner = req.user._id.toString() === resourceUserId;
    const hasAdminRole = req.user.role === 'admin';

    if (isOwner || hasAdminRole) {
      return next();
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access your own resources or need appropriate role.',
        required: roles
      });
    }

    next();
  };
};

const authorizeAppointmentAccess = async (req, res, next) => {
  try {
    const appointmentId = req.params.id || req.params.appointmentId;
    const Appointment = require('../models/Appointment');
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const isPatient = req.user._id.toString() === appointment.patient.toString();
    const isDoctor = req.user._id.toString() === appointment.doctor.toString();
    const isAdminOrNurse = ['admin', 'nurse'].includes(req.user.role);

    if (!isPatient && !isDoctor && !isAdminOrNurse) {
      return res.status(403).json({ message: 'Access denied to this appointment.' });
    }

    req.appointment = appointment;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during authorization.' });
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizeOwnerOrRole,
  authorizeAppointmentAccess
};