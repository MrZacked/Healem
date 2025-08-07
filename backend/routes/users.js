const express = require('express');
const User = require('../models/User');
const { authenticate, authorize, authorizeOwnerOrRole } = require('../middleware/auth');
const { validateUpdateProfile, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

router.get('/', 
  authenticate, 
  authorize('admin', 'nurse'), 
  validatePagination,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const { role, search } = req.query;
      let query = {};
      
      if (role) {
        query.role = role;
      }
      
      if (search) {
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { username: { $regex: sanitizedSearch, $options: 'i' } },
          { email: { $regex: sanitizedSearch, $options: 'i' } },
          { 'profile.firstName': { $regex: sanitizedSearch, $options: 'i' } },
          { 'profile.lastName': { $regex: sanitizedSearch, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      res.json({
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        message: 'Failed to retrieve users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/doctors', authenticate, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { specialization, department } = req.query;
    let query = { role: 'doctor', isActive: true };
    
    if (specialization) {
      const sanitizedSpecialization = specialization.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['profile.specialization'] = { $regex: sanitizedSpecialization, $options: 'i' };
    }
    
    if (department) {
      const sanitizedDepartment = department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['profile.department'] = { $regex: sanitizedDepartment, $options: 'i' };
    }

    const doctors = await User.find(query)
      .select('-password')
      .sort({ 'profile.firstName': 1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      doctors,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      message: 'Failed to retrieve doctors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/:id', 
  authenticate, 
  validateObjectId('id'),
  authorizeOwnerOrRole('admin', 'nurse', 'doctor'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user: user.getPublicProfile() });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        message: 'Failed to retrieve user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.put('/:id/profile', 
  authenticate, 
  validateObjectId('id'),
  authorizeOwnerOrRole('admin', 'patient', 'doctor', 'nurse'),
  validateUpdateProfile,
  async (req, res) => {
    try {
      const { profile } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { profile } },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: user.getPublicProfile()
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.patch('/:id/status', 
  authenticate, 
  authorize('admin'),
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be a boolean value' });
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: user.getPublicProfile()
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        message: 'Failed to update user status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'),
  validateObjectId('id'),
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        message: 'Failed to delete user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;