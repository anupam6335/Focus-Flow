/**
 * Notification Routes
 * Handles user notifications and real-time updates
 */

import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { socketService } from '../services/socketService.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { category = 'all' } = req.query;
  const userId = req.user.username;

  // Build query based on category
  let query = { recipient: userId };

  if (category === 'unread') {
    query.isRead = false;
  } else if (category === 'read') {
    query.isRead = true;
  }

  // Get notifications from database
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Count unread notifications
  const unreadCount = await Notification.getUnreadCount(userId);

  res.json({
    success: true,
    notifications: notifications,
    unreadCount: unreadCount,
    totalCount: notifications.length,
    readCount: notifications.filter((n) => n.isRead).length,
  });
}));

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.post('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const notificationId = req.params.id;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
}));

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;

  const result = await Notification.markAllAsRead(userId);

  res.json({
    success: true,
    message: `Marked ${result.modifiedCount} notifications as read`,
    modifiedCount: result.modifiedCount,
  });
}));

/**
 * @route   GET /api/notifications/count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/count', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;

  const unreadCount = await Notification.getUnreadCount(userId);

  res.json({
    success: true,
    unreadCount: unreadCount,
  });
}));

/**
 * @route   GET /api/notifications/real-time-status
 * @desc    Get real-time notification connection status
 * @access  Private
 */
router.get('/real-time-status', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const isConnected = socketService.isUserConnected(userId);

  res.json({
    success: true,
    realTimeEnabled: isConnected,
    connectedUsersCount: socketService.getConnectedUsersCount(),
  });
}));

export default router;