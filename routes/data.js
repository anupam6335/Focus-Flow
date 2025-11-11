/**
 * Data Routes
 * Handles user checklist data synchronization and management
 */

import express from 'express';
import ChecklistData from '../models/ChecklistData.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { syncChecklistData, forceSyncChecklistData } from '../services/dataSyncService.js';
import { ensureDifficultyField } from '../utils/helpers.js';

const router = express.Router();

/**
 * @route   GET /api/data
 * @desc    Get user checklist data
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  let data = await ChecklistData.findOne({ userId });

  if (!data) {
    data = await ChecklistData.getUserData(userId);
  } else {
    // Ensure backward compatibility for existing data
    data.data = ensureDifficultyField(data.data);
  }

  res.json({
    success: true,
    data: data.data,
    version: data.version,
    lastUpdated: data.lastUpdated,
  });
}));

/**
 * @route   POST /api/data
 * @desc    Save user checklist data with conflict resolution
 * @access  Private
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { data, clientVersion, lastUpdated } = req.body;

  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Data is required'
    });
  }

  try {
    const result = await syncChecklistData(userId, data, clientVersion, lastUpdated);

    res.json({
      success: true,
      data: result.data,
      version: result.version,
      lastUpdated: result.lastUpdated,
    });
  } catch (error) {
    if (error.name === 'ConflictError') {
      return res.status(409).json({
        success: false,
        error: error.message,
        serverData: error.serverData,
        serverVersion: error.serverVersion,
        serverLastUpdated: error.serverLastUpdated,
        requiresUserResolution: error.requiresUserResolution,
        message: 'Significant changes detected. Please review and resolve.',
      });
    }
    throw error;
  }
}));

/**
 * @route   POST /api/data/force-sync
 * @desc    Force sync - get latest data from server without conflict checks
 * @access  Private
 */
router.post('/force-sync', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;

  const data = await forceSyncChecklistData(userId);

  res.json({
    success: true,
    data: data.data,
    version: data.version,
    lastUpdated: data.lastUpdated,
  });
}));

export default router;