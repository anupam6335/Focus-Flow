/**
 * Enhanced Notification Routes
 * Handles both legacy and new category-based notifications
 */

import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { socketService } from '../services/socketService.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user (legacy + new categories)
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { category = 'all', limit = 50 } = req.query;
  const userId = req.user.username;

  // Get user's notification document
  const notificationDoc = await Notification.getUserNotifications(userId);
  
  // Get legacy notifications
  const legacyQuery = { recipient: userId };
  if (category === 'unread') {
    legacyQuery.isRead = false;
  } else if (category === 'read') {
    legacyQuery.isRead = true;
  }

  const legacyNotifications = await Notification.find(legacyQuery)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  // Prepare response data
  let notifications = [];
  let categoryData = {};

  // Add legacy notifications
  notifications = legacyNotifications.map(notif => ({
    _id: notif._id,
    type: notif.type,
    category: 'legacy',
    message: notif.message,
    url: notif.url,
    isRead: notif.isRead,
    createdAt: notif.createdAt,
    metadata: notif.metadata
  }));

  // Add category-based notifications based on filter
  if (category === 'all' || category === 'todo') {
    categoryData.todo = notificationDoc.user.todo
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit))
      .map(notif => ({
        _id: notif._id,
        type: notif.type,
        category: 'todo',
        message: notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        metadata: notif.metadata
      }));
  }

  if (category === 'all' || category === 'question') {
    categoryData.question = notificationDoc.user.question
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit))
      .map(notif => ({
        _id: notif._id,
        type: notif.type,
        category: 'question',
        message: notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        metadata: notif.metadata
      }));
  }

  if (category === 'all' || category === 'global') {
    categoryData.global = notificationDoc.user.global
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit))
      .map(notif => ({
        _id: notif._id,
        type: notif.type,
        category: 'global',
        message: notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        metadata: notif.metadata
      }));
  }

  // Apply category filter for legacy notifications
  if (category !== 'all') {
    notifications = notifications.filter(notif => notif.category === category);
  }

  // Apply read/unread filter
  if (category === 'unread') {
    categoryData.todo = categoryData.todo?.filter(notif => !notif.isRead);
    categoryData.question = categoryData.question?.filter(notif => !notif.isRead);
    categoryData.global = categoryData.global?.filter(notif => !notif.isRead);
  } else if (category === 'read') {
    categoryData.todo = categoryData.todo?.filter(notif => notif.isRead);
    categoryData.question = categoryData.question?.filter(notif => notif.isRead);
    categoryData.global = categoryData.global?.filter(notif => notif.isRead);
  }

  // Count unread notifications
  const unreadCount = await Notification.getUnreadCount(userId);

  res.json({
    success: true,
    notifications,
    categories: categoryData,
    unreadCount,
    totalCount: notifications.length + 
                (categoryData.todo?.length || 0) + 
                (categoryData.question?.length || 0) + 
                (categoryData.global?.length || 0),
  });
}));

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark a legacy notification as read
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
 * @route   POST /api/notifications/:category/:id/read
 * @desc    Mark a category-based notification as read
 * @access  Private
 */
router.post('/:category/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { category, id } = req.params;

  const validCategories = ['todo', 'question', 'global'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid category'
    });
  }

  const notificationDoc = await Notification.getUserNotifications(userId);
  await notificationDoc.markCategoryAsRead(category, id);

  res.json({
    success: true,
    message: `${category} notification marked as read`,
  });
}));

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all notifications as read (legacy + categories)
 * @access  Private
 */
router.post('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;

  const result = await Notification.markAllAsRead(userId);

  res.json({
    success: true,
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount,
  });
}));

/**
 * @route   POST /api/notifications/:category/read-all
 * @desc    Mark all notifications in a category as read
 * @access  Private
 */
router.post('/:category/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { category } = req.params;

  const validCategories = ['todo', 'question', 'global'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid category'
    });
  }

  const notificationDoc = await Notification.getUserNotifications(userId);
  await notificationDoc.markAllCategoryAsRead(category);

  res.json({
    success: true,
    message: `All ${category} notifications marked as read`,
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
    unreadCount,
  });
}));

/**
 * @route   GET /api/notifications/category-count
 * @desc    Get unread count by category
 * @access  Private
 */
router.get('/category-count', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;

  const notificationDoc = await Notification.getUserNotifications(userId);
  
  const categoryCounts = {
    todo: notificationDoc.user.todo.filter(n => !n.isRead).length,
    question: notificationDoc.user.question.filter(n => !n.isRead).length,
    global: notificationDoc.user.global.filter(n => !n.isRead).length,
    legacy: await Notification.countDocuments({ recipient: userId, isRead: false })
  };

  res.json({
    success: true,
    categoryCounts,
    total: Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)
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