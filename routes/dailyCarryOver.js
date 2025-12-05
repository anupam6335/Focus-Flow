import express from 'express';
import StructuredTodo from '../models/StructuredTodo.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   POST /api/todos/process-carry-over
 * @desc    Process daily carry-over for todos (Admin only or system process)
 * @access  Private (Admin)
 */
router.post('/process-carry-over', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const result = await StructuredTodo.processDailyCarryOver();

  res.json({
    success: true,
    message: `Daily carry-over processed for ${result.processedUsers} users`,
    result
  });
}));

/**
 * @route   POST /api/todos/process-user-carry-over
 * @desc    Process carry-over for specific user (for testing)
 * @access  Private
 */
router.post('/process-user-carry-over', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const userTodos = await StructuredTodo.getUserTodos(userId);
  const carriedCount = userTodos.carryOverTodos(yesterdayStr, today);

  await userTodos.save();

  res.json({
    success: true,
    message: `Carried over ${carriedCount} todos from ${yesterdayStr} to ${today}`,
    carriedCount,
    fromDate: yesterdayStr,
    toDate: today
  });
}));

export default router;