/**
 * Activity Routes
 * Handles user activity tracking and progress statistics
 */

import express from 'express';
import ActivityTracker from '../models/ActivityTracker.js';
import ChecklistData from '../models/ChecklistData.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @route   GET /api/activity-tracker
 * @desc    Get activity tracker data for authenticated user
 * @access  Private
 */
router.get('/activity-tracker', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  let activityData = await ActivityTracker.findOne({ userId });

  if (!activityData) {
    // Create default activity data
    activityData = await ActivityTracker.create({
      userId,
      activityData: {
        currentStreak: 0,
        totalSolved: 0,
        averageDaily: 0,
        maxStreak: 0,
        heatmapData: {},
        activityHistory: [],
      },
    });
  }

  res.json({
    success: true,
    activityData: activityData.activityData,
  });
}));

/**
 * @route   POST /api/activity-tracker
 * @desc    Save activity tracker data
 * @access  Private
 */
router.post('/activity-tracker', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { activityData } = req.body;

  if (!activityData) {
    return res.status(400).json({
      success: false,
      error: 'Activity data is required'
    });
  }

  let tracker = await ActivityTracker.findOne({ userId });

  if (!tracker) {
    tracker = new ActivityTracker({ userId });
  }

  tracker.activityData = activityData;
  tracker.lastUpdated = new Date();

  await tracker.save();

  res.json({
    success: true,
    message: 'Activity data saved successfully',
  });
}));

/**
 * @route   GET /api/progress-stats
 * @desc    Get progress statistics for authenticated user
 * @access  Private
 */
router.get('/progress-stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const checklistData = await ChecklistData.findOne({ userId });

  if (!checklistData || !checklistData.data) {
    return res.json({
      success: true,
      stats: {
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
      },
    });
  }

  const stats = {
    total: 0,
    easy: 0,
    medium: 0,
    hard: 0,
  };

  checklistData.data.forEach((day) => {
    if (day.questions && Array.isArray(day.questions)) {
      day.questions.forEach((question) => {
        if (question.completed) {
          stats.total++;
          const difficulty = (question.difficulty || "medium").toLowerCase();
          if (stats[difficulty] !== undefined) {
            stats[difficulty]++;
          } else {
            stats.medium++;
          }
        }
      });
    }
  });

  res.json({
    success: true,
    stats,
  });
}));

/**
 * @route   GET /api/progress-stats/:username
 * @desc    Get progress statistics for any user (public)
 * @access  Public
 */
router.get('/progress-stats/:username', asyncHandler(async (req, res) => {
  const username = req.params.username;
  const checklistData = await ChecklistData.findOne({ userId: username });

  if (!checklistData || !checklistData.data) {
    return res.json({
      success: true,
      stats: {
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
      },
    });
  }

  const stats = {
    total: 0,
    easy: 0,
    medium: 0,
    hard: 0,
  };

  checklistData.data.forEach((day) => {
    if (day.questions && Array.isArray(day.questions)) {
      day.questions.forEach((question) => {
        if (question.completed) {
          stats.total++;
          const difficulty = (question.difficulty || "medium").toLowerCase();
          if (stats[difficulty] !== undefined) {
            stats[difficulty]++;
          } else {
            stats.medium++;
          }
        }
      });
    }
  });

  res.json({
    success: true,
    stats,
  });
}));

export default router;