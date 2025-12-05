/**
 * Author Activity Routes
 * Handles author activity tracking and statistics
 */

import express from "express";
import AuthorActivity from "../models/AuthorActivity.js";
import Blog from "../models/Blog.js";
import Comment from "../models/Comment.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

/**
 * @route   GET /api/author-activity/:username
 * @desc    Get author activity with pagination and filtering
 * @access  Public
 */
router.get(
  "/:username",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { author: username };
    if (type) query.type = type;

    const activities = await AuthorActivity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("targetUser", "username avatar")
      .lean();

    const total = await AuthorActivity.countDocuments(query);

    // Get activity stats
    const stats = await AuthorActivity.getActivityStats(username);

    res.json({
      success: true,
      activities,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * @route   GET /api/author-activity/:username/stats
 * @desc    Get author activity statistics
 * @access  Public
 */
router.get(
  "/:username/stats",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { days = 30 } = req.query;

    const stats = await AuthorActivity.getActivityStats(
      username,
      parseInt(days)
    );

    res.json({
      success: true,
      stats,
      period: `${days} days`,
    });
  })
);

/**
 * @route   GET /api/author-activity/:username/summary
 * @desc    Get comprehensive author summary
 * @access  Public
 */
router.get(
  "/:username/summary",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;

    // Get blog stats
    const blogStats = await Blog.aggregate([
      { $match: { author: username } },
      {
        $group: {
          _id: null,
          totalBlogs: { $sum: 1 },
          publicBlogs: { $sum: { $cond: ["$isPublic", 1, 0] } },
          privateBlogs: { $sum: { $cond: ["$isPublic", 0, 1] } },
          totalLikes: { $sum: "$likes" },
          totalViews: { $sum: "$views" },
          totalShares: { $sum: "$shares" },
          avgReadingTime: { $avg: "$readingTime" },
        },
      },
    ]);

    // Get comment stats
    const commentStats = await Comment.aggregate([
      { $match: { author: username, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          totalLikes: { $sum: "$likes" },
          totalReplies: { $sum: { $cond: [{ $gt: ["$depth", 0] }, 1, 0] } },
        },
      },
    ]);

    // Get activity stats
    const activityStats = await AuthorActivity.getActivityStats(username, 30);

    // Get recent popular blogs
    const popularBlogs = await Blog.find({ author: username, isPublic: true })
      .sort({ likes: -1, views: -1 })
      .limit(3)
      .select("title slug likes views createdAt")
      .lean();

    const summary = {
      blogStats: blogStats[0] || {
        totalBlogs: 0,
        publicBlogs: 0,
        privateBlogs: 0,
        totalLikes: 0,
        totalViews: 0,
        totalShares: 0,
        avgReadingTime: 0,
      },
      commentStats: commentStats[0] || {
        totalComments: 0,
        totalLikes: 0,
        totalReplies: 0,
      },
      activityStats,
      popularBlogs,
    };

    res.json({
      success: true,
      summary,
    });
  })
);

/**
 * @route   GET /api/author-activity/:username/engagement
 * @desc    Get author engagement metrics over time
 * @access  Public
 */
router.get(
  "/:username/engagement",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get daily engagement metrics
    const dailyEngagement = await AuthorActivity.aggregate([
      {
        $match: {
          author: username,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          likesReceived: {
            $sum: { $cond: [{ $eq: ["$type", "like_received"] }, 1, 0] },
          },
          commentsReceived: {
            $sum: { $cond: [{ $eq: ["$type", "comment_received"] }, 1, 0] },
          },
          sharesReceived: {
            $sum: { $cond: [{ $eq: ["$type", "share_received"] }, 1, 0] },
          },
          viewsReceived: {
            $sum: { $cond: [{ $eq: ["$type", "blog_viewed"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      engagement: dailyEngagement,
      period: `${days} days`,
    });
  })
);

export default router;
