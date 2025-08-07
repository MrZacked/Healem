const express = require('express');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const HealthRecord = require('../models/HealthRecord');
const EmailNotification = require('../models/EmailNotification');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin dashboard overview
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });

    const usersByRole = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Appointment statistics
    const totalAppointments = await Appointment.countDocuments();
    const upcomingAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: today },
      status: { $in: ['pending', 'confirmed'] }
    });
    const appointmentsThisMonth = await Appointment.countDocuments({
      createdAt: { $gte: oneMonthAgo }
    });

    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Message statistics
    const totalMessages = await Message.countDocuments();
    const unreadMessages = await Message.countDocuments({ status: 'unread' });
    const messagesThisWeek = await Message.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });

    // Health records statistics
    const totalHealthRecords = await HealthRecord.countDocuments();
    const recentHealthRecords = await HealthRecord.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });

    const recordsByType = await HealthRecord.aggregate([
      { $group: { _id: '$recordType', count: { $sum: 1 } } }
    ]);

    // Email notification statistics
    const totalNotifications = await EmailNotification.countDocuments();
    const pendingNotifications = await EmailNotification.countDocuments({ status: 'pending' });
    const failedNotifications = await EmailNotification.countDocuments({ status: 'failed' });

    res.json({
      overview: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisWeek: newUsersThisWeek,
          byRole: usersByRole.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        appointments: {
          total: totalAppointments,
          upcoming: upcomingAppointments,
          thisMonth: appointmentsThisMonth,
          byStatus: appointmentsByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        messages: {
          total: totalMessages,
          unread: unreadMessages,
          thisWeek: messagesThisWeek
        },
        healthRecords: {
          total: totalHealthRecords,
          recent: recentHealthRecords,
          byType: recordsByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        notifications: {
          total: totalNotifications,
          pending: pendingNotifications,
          failed: failedNotifications
        }
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// Appointment analytics
router.get('/appointments', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily appointment counts
    const dailyAppointments = await Appointment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Most popular doctors
    const popularDoctors = await Appointment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'doctorInfo'
        }
      },
      { $unwind: '$doctorInfo' },
      {
        $project: {
          _id: 1,
          count: 1,
          name: { 
            $concat: ['$doctorInfo.profile.firstName', ' ', '$doctorInfo.profile.lastName'] 
          },
          specialization: '$doctorInfo.profile.specialization'
        }
      }
    ]);

    // Appointment completion rates
    const appointmentStats = await Appointment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAppointments = appointmentStats.reduce((sum, stat) => sum + stat.count, 0);
    const completionRate = totalAppointments > 0 ? 
      (appointmentStats.find(s => s._id === 'completed')?.count || 0) / totalAppointments * 100 : 0;

    res.json({
      period: days,
      dailyAppointments,
      popularDoctors,
      appointmentStats,
      completionRate: Math.round(completionRate * 100) / 100
    });

  } catch (error) {
    console.error('Appointment analytics error:', error);
    res.status(500).json({ message: 'Server error fetching appointment analytics' });
  }
});

// User engagement analytics
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // User registration trends
    const registrationTrends = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // User activity analysis
    const activeUserStats = await User.aggregate([
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'patient',
          as: 'patientAppointments'
        }
      },
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'doctor',
          as: 'doctorAppointments'
        }
      },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'from',
          as: 'sentMessages'
        }
      },
      {
        $project: {
          role: 1,
          isActive: 1,
          lastLoginAt: 1,
          totalAppointments: { 
            $add: [
              { $size: '$patientAppointments' },
              { $size: '$doctorAppointments' }
            ]
          },
          messagesSent: { $size: '$sentMessages' }
        }
      },
      {
        $group: {
          _id: '$role',
          totalUsers: { $sum: 1 },
          activeUsers: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          avgAppointments: { $avg: '$totalAppointments' },
          avgMessages: { $avg: '$messagesSent' }
        }
      }
    ]);

    res.json({
      period: days,
      registrationTrends,
      activityByRole: activeUserStats
    });

  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ message: 'Server error fetching user analytics' });
  }
});

// Health records analytics
router.get('/health-records', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Records by type
    const recordsByType = await HealthRecord.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$recordType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Most active providers
    const activeProviders = await HealthRecord.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$provider', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'providerInfo'
        }
      },
      { $unwind: '$providerInfo' },
      {
        $project: {
          _id: 1,
          count: 1,
          name: { 
            $concat: ['$providerInfo.profile.firstName', ' ', '$providerInfo.profile.lastName'] 
          },
          role: '$providerInfo.role',
          specialization: '$providerInfo.profile.specialization'
        }
      }
    ]);

    // Daily record creation
    const dailyRecords = await HealthRecord.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      period: days,
      recordsByType,
      activeProviders,
      dailyRecords
    });

  } catch (error) {
    console.error('Health records analytics error:', error);
    res.status(500).json({ message: 'Server error fetching health records analytics' });
  }
});

// System performance metrics
router.get('/system', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Error rates and failed operations
    const failedNotifications = await EmailNotification.countDocuments({
      status: 'failed',
      createdAt: { $gte: startDate }
    });

    const totalNotifications = await EmailNotification.countDocuments({
      createdAt: { $gte: startDate }
    });

    const errorRate = totalNotifications > 0 ? 
      (failedNotifications / totalNotifications) * 100 : 0;

    // Database collection sizes
    const collectionStats = {
      users: await User.countDocuments(),
      appointments: await Appointment.countDocuments(),
      messages: await Message.countDocuments(),
      healthRecords: await HealthRecord.countDocuments(),
      notifications: await EmailNotification.countDocuments()
    };

    // Recent activity summary
    const recentActivity = {
      newUsers: await User.countDocuments({ createdAt: { $gte: startDate } }),
      newAppointments: await Appointment.countDocuments({ createdAt: { $gte: startDate } }),
      newMessages: await Message.countDocuments({ createdAt: { $gte: startDate } }),
      newHealthRecords: await HealthRecord.countDocuments({ createdAt: { $gte: startDate } }),
      sentNotifications: await EmailNotification.countDocuments({ 
        status: 'sent',
        createdAt: { $gte: startDate } 
      })
    };

    res.json({
      period: days,
      systemHealth: {
        errorRate: Math.round(errorRate * 100) / 100,
        failedNotifications,
        totalNotifications
      },
      collectionStats,
      recentActivity
    });

  } catch (error) {
    console.error('System analytics error:', error);
    res.status(500).json({ message: 'Server error fetching system analytics' });
  }
});

module.exports = router;