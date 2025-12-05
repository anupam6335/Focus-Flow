/**
 * Admin Notification Routes
 * Advanced notification management for admins
 */

import express from 'express';
import AdminNotification from '../models/AdminNotification.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { socketService } from '../services/socketService.js';

const router = express.Router();

// All routes require admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   POST /api/admin/notifications
 * @desc    Create a new admin notification (global or targeted)
 * @access  Private (Admin only)
 */
router.post('/notifications', asyncHandler(async (req, res) => {
  const {
    title,
    message,
    type = 'global',
    recipients = [],
    priority = 'medium',
    actionUrl = null,
    scheduledAt = null,
    expiresAt = null,
    metadata = {}
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      error: 'Title and message are required'
    });
  }

  // Validate recipients for targeted notifications
  if (type === 'targeted' && (!recipients || !Array.isArray(recipients) || recipients.length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Recipients are required for targeted notifications'
    });
  }

  // Verify recipients exist
  if (type === 'targeted') {
    const existingUsers = await User.find({ username: { $in: recipients } });
    const existingUsernames = existingUsers.map(user => user.username);
    const invalidRecipients = recipients.filter(recipient => !existingUsernames.includes(recipient));
    
    if (invalidRecipients.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid recipients: ${invalidRecipients.join(', ')}`
      });
    }
  }

  const notification = new AdminNotification({
    title,
    message,
    type,
    recipients: type === 'global' ? [] : recipients,
    sender: req.user.username,
    priority,
    actionUrl,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    metadata
  });

  await notification.save();

  // Send real-time notifications if not scheduled for future
  if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
    if (type === 'global') {
      // Send to all connected users
      socketService.broadcast('new-admin-notification', {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        timestamp: notification.createdAt
      });
    } else {
      // Send to specific recipients
      recipients.forEach(recipient => {
        socketService.emitToUser(recipient, 'new-admin-notification', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          actionUrl: notification.actionUrl,
          timestamp: notification.createdAt
        });
      });
    }
  }

  res.status(201).json({
    success: true,
    message: `Notification created successfully`,
    notification: {
      _id: notification._id,
      title: notification.title,
      type: notification.type,
      recipients: notification.recipients,
      scheduledAt: notification.scheduledAt,
      expiresAt: notification.expiresAt
    }
  });
}));

/**
 * @route   GET /api/admin/notifications
 * @desc    Get all admin notifications with filters
 * @access  Private (Admin only)
 */
router.get('/notifications', asyncHandler(async (req, res) => {
  const {
    type,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  let query = {};
  if (type) query.type = type;

  const notifications = await AdminNotification.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('sender', 'username')
    .lean();

  const total = await AdminNotification.countDocuments(query);

  res.json({
    success: true,
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @route   GET /api/admin/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (Admin only)
 */
router.get('/notifications/stats', asyncHandler(async (req, res) => {
  const totalNotifications = await AdminNotification.countDocuments();
  const globalNotifications = await AdminNotification.countDocuments({ type: 'global' });
  const targetedNotifications = await AdminNotification.countDocuments({ type: 'targeted' });
  const activeNotifications = await AdminNotification.countDocuments({ isActive: true });

  const recentNotifications = await AdminNotification.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title type createdAt deliveryStats')
    .lean();

  res.json({
    success: true,
    stats: {
      total: totalNotifications,
      global: globalNotifications,
      targeted: targetedNotifications,
      active: activeNotifications,
      recent: recentNotifications
    }
  });
}));

/**
 * @route   PUT /api/admin/notifications/:id
 * @desc    Update an admin notification
 * @access  Private (Admin only)
 */
router.put('/notifications/:id', asyncHandler(async (req, res) => {
  const { title, message, isActive, priority, expiresAt } = req.body;

  const notification = await AdminNotification.findById(req.params.id);
  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }

  if (title) notification.title = title;
  if (message) notification.message = message;
  if (typeof isActive === 'boolean') notification.isActive = isActive;
  if (priority) notification.priority = priority;
  if (expiresAt) notification.expiresAt = new Date(expiresAt);

  await notification.save();

  res.json({
    success: true,
    message: 'Notification updated successfully',
    notification
  });
}));

/**
 * @route   DELETE /api/admin/notifications/:id
 * @desc    Delete an admin notification
 * @access  Private (Admin only)
 */
router.delete('/notifications/:id', asyncHandler(async (req, res) => {
  const notification = await AdminNotification.findByIdAndDelete(req.params.id);
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
}));

/**
 * @route   GET /api/admin/notifications/:id/analytics
 * @desc    Get detailed analytics for a notification
 * @access  Private (Admin only)
 */
router.get('/notifications/:id/analytics', asyncHandler(async (req, res) => {
  const notification = await AdminNotification.findById(req.params.id)
    .populate('readBy.user', 'username')
    .lean();

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }

  const totalRecipients = notification.type === 'global' 
    ? await User.countDocuments() 
    : notification.recipients.length;

  const readPercentage = totalRecipients > 0 
    ? (notification.deliveryStats.read / totalRecipients) * 100 
    : 0;

  res.json({
    success: true,
    analytics: {
      notification: {
        title: notification.title,
        type: notification.type,
        createdAt: notification.createdAt
      },
      delivery: {
        totalRecipients,
        sent: notification.deliveryStats.sent,
        read: notification.deliveryStats.read,
        clicked: notification.deliveryStats.clicked,
        readPercentage: readPercentage.toFixed(2)
      },
      readBy: notification.readBy.slice(0, 50) // Limit to recent 50
    }
  });
}));

export default router;