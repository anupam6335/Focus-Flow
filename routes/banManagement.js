/**
 * Ban Management Routes
 * Comprehensive user banning and appeal system
 */

import express from 'express';
import Ban from '../models/Ban.js';
import BanReason from '../models/BanReason.js';
import User from '../models/User.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { requireAdmin, optionalAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @route   POST /api/admin/bans
 * @desc    Ban a user
 * @access  Private (Admin only)
 */
router.post('/bans', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const {
    username,
    reason,
    category = 'community_guidelines',
    severity = 'temporary',
    duration = 7,
    evidence = [],
    restrictions = {},
    customReason = null
  } = req.body;

  if (!username || !reason) {
    return res.status(400).json({
      success: false,
      error: 'Username and reason are required'
    });
  }

  // Check if user exists
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Check if user is already banned
  const existingBan = await Ban.getActiveBan(username);
  if (existingBan) {
    return res.status(400).json({
      success: false,
      error: 'User is already banned',
      existingBan: {
        reason: existingBan.reason,
        severity: existingBan.severity,
        autoUnbanAt: existingBan.autoUnbanAt
      }
    });
  }

  // Get ban history for this user
  const banHistory = await Ban.getUserBanHistory(username);
  const previousBans = {
    count: banHistory.length,
    lastBanDate: banHistory.length > 0 ? banHistory[0].createdAt : null
  };

  const ban = new Ban({
    username,
    bannedBy: req.user.username,
    reason: customReason || reason,
    category,
    severity,
    duration,
    evidence,
    previousBans,
    restrictions: {
      canComment: restrictions.canComment !== undefined ? restrictions.canComment : false,
      canPostBlogs: restrictions.canPostBlogs !== undefined ? restrictions.canPostBlogs : false,
      canLike: restrictions.canLike !== undefined ? restrictions.canLike : true,
      canFollow: restrictions.canFollow !== undefined ? restrictions.canFollow : true,
      canReceiveNotifications: restrictions.canReceiveNotifications !== undefined ? restrictions.canReceiveNotifications : true
    }
  });

  await ban.save();

  // Increment usage count if using a template reason
  if (!customReason) {
    await BanReason.findOneAndUpdate(
      { title: reason },
      { $inc: { usageCount: 1 } }
    );
  }

  res.status(201).json({
    success: true,
    message: `User ${username} has been banned`,
    ban: {
      _id: ban._id,
      username: ban.username,
      reason: ban.reason,
      severity: ban.severity,
      duration: ban.duration,
      autoUnbanAt: ban.autoUnbanAt,
      restrictions: ban.restrictions
    }
  });
}));

/**
 * @route   GET /api/admin/bans
 * @desc    Get all active bans with filters
 * @access  Private (Admin only)
 */
router.get('/bans', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    severity,
    category,
    search
  } = req.query;

  const skip = (page - 1) * limit;

  let query = { isActive: true };
  if (severity) query.severity = severity;
  if (category) query.category = category;
  if (search) {
    query.username = { $regex: search, $options: 'i' };
  }

  const bans = await Ban.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('bannedBy', 'username')
    .lean();

  const total = await Ban.countDocuments(query);

  res.json({
    success: true,
    bans,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @route   GET /api/admin/bans/stats
 * @desc    Get ban statistics
 * @access  Private (Admin only)
 */
router.get('/bans/stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const totalBans = await Ban.countDocuments();
  const activeBans = await Ban.countDocuments({ isActive: true });
  const temporaryBans = await Ban.countDocuments({ severity: 'temporary', isActive: true });
  const permanentBans = await Ban.countDocuments({ severity: 'permanent', isActive: true });
  const pendingAppeals = await Ban.countDocuments({
    isActive: true,
    'appeal.requested': true,
    'appeal.reviewStatus': 'pending'
  });

  const recentBans = await Ban.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('username reason severity createdAt')
    .populate('bannedBy', 'username')
    .lean();

  res.json({
    success: true,
    stats: {
      total: totalBans,
      active: activeBans,
      temporary: temporaryBans,
      permanent: permanentBans,
      pendingAppeals: pendingAppeals,
      recent: recentBans
    }
  });
}));

/**
 * @route   PUT /api/admin/bans/:id/unban
 * @desc    Unban a user
 * @access  Private (Admin only)
 */
router.put('/bans/:id/unban', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { reviewNotes } = req.body;

  const ban = await Ban.findById(req.params.id);
  if (!ban) {
    return res.status(404).json({
      success: false,
      error: 'Ban record not found'
    });
  }

  if (!ban.isActive) {
    return res.status(400).json({
      success: false,
      error: 'User is not currently banned'
    });
  }

  ban.isActive = false;
  if (ban.appeal.requested) {
    ban.appeal.reviewStatus = 'approved';
    ban.appeal.reviewedBy = req.user.username;
    ban.appeal.reviewedAt = new Date();
    ban.appeal.reviewNotes = reviewNotes;
    ban.appeal.decisionDate = new Date();
  }

  await ban.save();

  res.json({
    success: true,
    message: `User ${ban.username} has been unbanned`,
    ban: {
      username: ban.username,
      unbannedAt: new Date(),
      reviewedBy: req.user.username
    }
  });
}));

/**
 * @route   GET /api/admin/bans/appeals
 * @desc    Get pending ban appeals
 * @access  Private (Admin only)
 */
router.get('/bans/appeals', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const appeals = await Ban.getPendingAppeals()
    .skip(skip)
    .limit(parseInt(limit))
    .populate('bannedBy', 'username')
    .lean();

  const total = await Ban.countDocuments({
    isActive: true,
    'appeal.requested': true,
    'appeal.reviewStatus': 'pending'
  });

  res.json({
    success: true,
    appeals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @route   PUT /api/admin/bans/:id/appeal
 * @desc    Review a ban appeal
 * @access  Private (Admin only)
 */
router.put('/bans/:id/appeal', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { reviewStatus, reviewNotes } = req.body;

  if (!reviewStatus || !['approved', 'rejected', 'under_review'].includes(reviewStatus)) {
    return res.status(400).json({
      success: false,
      error: 'Valid review status is required (approved, rejected, or under_review)'
    });
  }

  const ban = await Ban.findById(req.params.id);
  if (!ban) {
    return res.status(404).json({
      success: false,
      error: 'Ban record not found'
    });
  }

  if (!ban.appeal.requested) {
    return res.status(400).json({
      success: false,
      error: 'No appeal request found for this ban'
    });
  }

  ban.appeal.reviewStatus = reviewStatus;
  ban.appeal.reviewedBy = req.user.username;
  ban.appeal.reviewedAt = new Date();
  ban.appeal.reviewNotes = reviewNotes;
  ban.appeal.decisionDate = new Date();

  // If appeal is approved, unban the user
  if (reviewStatus === 'approved') {
    ban.isActive = false;
  }

  await ban.save();

  res.json({
    success: true,
    message: `Appeal ${reviewStatus} for user ${ban.username}`,
    appeal: {
      username: ban.username,
      reviewStatus: ban.appeal.reviewStatus,
      reviewedBy: ban.appeal.reviewedBy,
      reviewedAt: ban.appeal.reviewedAt
    }
  });
}));

// BAN REASON TEMPLATES MANAGEMENT

/**
 * @route   POST /api/admin/ban-reasons
 * @desc    Create a new ban reason template
 * @access  Private (Admin only)
 */
router.post('/ban-reasons', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    severity = 'temporary',
    defaultDuration = 7,
    restrictions = {}
  } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({
      success: false,
      error: 'Title, description, and category are required'
    });
  }

  const existingReason = await BanReason.findOne({ title });
  if (existingReason) {
    return res.status(400).json({
      success: false,
      error: 'A ban reason with this title already exists'
    });
  }

  const banReason = new BanReason({
    title,
    description,
    category,
    severity,
    defaultDuration,
    restrictions,
    createdBy: req.user.username
  });

  await banReason.save();

  res.status(201).json({
    success: true,
    message: 'Ban reason template created successfully',
    banReason
  });
}));

/**
 * @route   GET /api/admin/ban-reasons
 * @desc    Get all ban reason templates
 * @access  Private (Admin only)
 */
router.get('/ban-reasons', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { category } = req.query;

  const reasons = await BanReason.getActiveReasons(category);

  res.json({
    success: true,
    reasons
  });
}));

// USER-FACING BAN ROUTES

/**
 * @route   GET /api/bans/my-status
 * @desc    Get current user's ban status
 * @access  Private
 */
router.get('/my-status', authenticateToken, asyncHandler(async (req, res) => {
  const ban = await Ban.getActiveBan(req.user.username);

  if (!ban) {
    return res.json({
      success: true,
      isBanned: false,
      message: 'Your account is in good standing'
    });
  }

  res.json({
    success: true,
    isBanned: true,
    ban: {
      reason: ban.reason,
      category: ban.category,
      severity: ban.severity,
      autoUnbanAt: ban.autoUnbanAt,
      daysRemaining: ban.daysRemaining,
      restrictions: ban.restrictions,
      canAppeal: ban.severity !== 'warning' && !ban.appeal.requested
    }
  });
}));

/**
 * @route   POST /api/bans/appeal
 * @desc    Submit a ban appeal
 * @access  Private
 */
router.post('/appeal', authenticateToken, asyncHandler(async (req, res) => {
  const { appealMessage } = req.body;

  if (!appealMessage || appealMessage.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Appeal message is required'
    });
  }

  const ban = await Ban.getActiveBan(req.user.username);
  if (!ban) {
    return res.status(400).json({
      success: false,
      error: 'You are not currently banned'
    });
  }

  if (ban.appeal.requested) {
    return res.status(400).json({
      success: false,
      error: 'You have already submitted an appeal'
    });
  }

  if (ban.severity === 'warning') {
    return res.status(400).json({
      success: false,
      error: 'Warning bans cannot be appealed'
    });
  }

  ban.appeal.requested = true;
  ban.appeal.requestMessage = appealMessage.trim();
  ban.appeal.requestedAt = new Date();
  ban.appeal.reviewStatus = 'pending';

  await ban.save();

  res.json({
    success: true,
    message: 'Appeal submitted successfully. Please wait for admin review.',
    appeal: {
      requestedAt: ban.appeal.requestedAt,
      reviewStatus: ban.appeal.reviewStatus
    }
  });
}));

export default router;