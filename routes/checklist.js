

import express from 'express';
import ChecklistData from '../models/ChecklistData.js';
import ActivityTracker from '../models/ActivityTracker.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateQuestionData, validateQuestionId } from '../middleware/checklistValidation.js';
import { checkAndSendNotifications } from '../services/notificationService.js';

const router = express.Router();

// Helper function to get current date in Asia/Kolkata timezone
const getCurrentKolkataDate = () => {
  const now = new Date();
  // Convert to Asia/Kolkata timezone (UTC+5:30)
  const kolkataOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const kolkataTime = new Date(now.getTime() + kolkataOffset);
  return kolkataTime.toISOString().split('T')[0]; // YYYY-MM-DD format
};

/**
 * @route   GET /api/day
 * @desc    Get questions for a specific date (default: today in Asia/Kolkata)
 * @access  Private
 */
router.get('/day', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { date = getCurrentKolkataDate() } = req.query;

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date format. Use YYYY-MM-DD'
    });
  }

  let checklistData = await ChecklistData.findOne({ userId });
  
  if (!checklistData) {
    // Return empty array if no data exists
    return res.json({
      success: true,
      date: date,
      questions: [],
      message: 'No data found for this date'
    });
  }

  // Find the day with the specified date
  const dayData = checklistData.data.find(day => day.date === date);
  
  if (!dayData) {
    // Return empty array if no data for this date
    return res.json({
      success: true,
      date: date,
      questions: [],
      message: 'No data found for this date'
    });
  }

  res.json({
    success: true,
    date: date,
    questions: dayData.questions,
    day: dayData.day // Keep for backward compatibility
  });
}));

/**
 * @route   GET /api/days/previous
 * @desc    Get all days before today (Asia/Kolkata timezone)
 * @access  Private
 */
router.get('/days/previous', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const today = getCurrentKolkataDate();

  const checklistData = await ChecklistData.findOne({ userId });
  
  if (!checklistData) {
    return res.json({
      success: true,
      days: []
    });
  }

  // Filter days that are strictly before today
  const previousDays = checklistData.data.filter(day => {
    return day.date < today; // Lexicographical comparison works for YYYY-MM-DD
  });

  // Sort by date descending (most recent first)
  previousDays.sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    success: true,
    days: previousDays.map(day => ({
      date: day.date,
      day: day.day,
      questions: day.questions,
      tags: day.tags,
      linksArray: day.linksArray
    }))
  });
}));

/**
 * @route   POST /api/data/checklist/question
 * @route   POST /api/checklist
 * @desc    Add a new question to checklist for today's date
 * @access  Private
 */
router.post(['/data/checklist/question', '/checklist'], authenticateToken, validateQuestionData, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { questionText, link, difficulty = 'Medium' } = req.body;
  
  // Use today's date in Asia/Kolkata timezone
  const today = getCurrentKolkataDate();

  if (!questionText) {
    return res.status(400).json({
      success: false,
      error: 'Question text is required'
    });
  }

  // Validate difficulty
  const validDifficulties = ['Easy', 'Medium', 'Hard'];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({
      success: false,
      error: 'Difficulty must be Easy, Medium, or Hard'
    });
  }

  let checklistData = await ChecklistData.findOne({ userId });

  if (!checklistData) {
    checklistData = await ChecklistData.getUserData(userId);
  }

  // Find today's data in the array
  let todayIndex = checklistData.data.findIndex(day => day.date === today);
  
  if (todayIndex === -1) {
    // Create new day entry for today
    const lastDay = checklistData.data.reduce((max, day) => Math.max(max, day.day), 0);
    const newDay = {
      day: lastDay + 1,
      date: today,
      questions: [],
      tags: [],
      links: '',
      linksArray: []
    };
    checklistData.data.push(newDay);
    todayIndex = checklistData.data.length - 1; // Get the index of the newly added day
  }

  // Create new question
  const newQuestion = {
    text: questionText.trim(),
    link: link || '',
    completed: false,
    difficulty: difficulty
  };

  // CRITICAL FIX: Add question directly to the array element, not to a temporary variable
  checklistData.data[todayIndex].questions.push(newQuestion);
  checklistData.lastUpdated = new Date();

  await checklistData.save();

  res.status(201).json({
    success: true,
    message: 'Question added successfully',
    question: newQuestion,
    date: today
  });
}));

/**
 * @route   PUT /api/data/checklist/question/:id
 * @route   PUT /api/checklist/:id
 * @desc    Edit an existing question (searches across all dates)
 * @access  Private
 */
router.put(['/data/checklist/question/:id', '/checklist/:id'], authenticateToken, validateQuestionId, validateQuestionData, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const questionId = req.params.id;
  const { questionText, link, difficulty } = req.body;

  if (!questionId) {
    return res.status(400).json({
      success: false,
      error: 'Question ID is required'
    });
  }

  const checklistData = await ChecklistData.findOne({ userId });

  if (!checklistData) {
    return res.status(404).json({
      success: false,
      error: 'Checklist data not found'
    });
  }

  // Search across all days for the question
  let targetDay = null;
  let targetQuestionIndex = -1;

  for (const day of checklistData.data) {
    const questionIndex = day.questions.findIndex(
      q => q._id && q._id.toString() === questionId
    );
    
    if (questionIndex !== -1) {
      targetDay = day;
      targetQuestionIndex = questionIndex;
      break;
    }
  }

  if (!targetDay || targetQuestionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Question not found'
    });
  }

  // Update question fields
  const question = targetDay.questions[targetQuestionIndex];
  
  if (questionText !== undefined) {
    question.text = questionText.trim();
  }
  
  if (link !== undefined) {
    question.link = link;
  }
  
  if (difficulty !== undefined) {
    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Difficulty must be Easy, Medium, or Hard'
      });
    }
    question.difficulty = difficulty;
  }

  checklistData.lastUpdated = new Date();
  await checklistData.save();

  res.json({
    success: true,
    message: 'Question updated successfully',
    question: question,
    date: targetDay.date
  });
}));

/**
 * @route   DELETE /api/data/checklist/question/:id
 * @route   DELETE /api/checklist/:id
 * @desc    Delete a question (searches across all dates)
 * @access  Private
 */
router.delete(['/data/checklist/question/:id', '/checklist/:id'], authenticateToken, validateQuestionId, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const questionId = req.params.id;

  if (!questionId) {
    return res.status(400).json({
      success: false,
      error: 'Question ID is required'
    });
  }

  const checklistData = await ChecklistData.findOne({ userId });

  if (!checklistData) {
    return res.status(404).json({
      success: false,
      error: 'Checklist data not found'
    });
  }

  // Search across all days for the question
  let targetDay = null;
  let targetQuestionIndex = -1;

  for (const day of checklistData.data) {
    const questionIndex = day.questions.findIndex(
      q => q._id && q._id.toString() === questionId
    );
    
    if (questionIndex !== -1) {
      targetDay = day;
      targetQuestionIndex = questionIndex;
      break;
    }
  }

  if (!targetDay || targetQuestionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Question not found'
    });
  }

  // Store question info for response
  const deletedQuestion = targetDay.questions[targetQuestionIndex];

  // Remove the question
  targetDay.questions.splice(targetQuestionIndex, 1);
  checklistData.lastUpdated = new Date();

  await checklistData.save();

  res.json({
    success: true,
    message: 'Question deleted successfully',
    deletedQuestion: {
      text: deletedQuestion.text,
      difficulty: deletedQuestion.difficulty,
      date: targetDay.date
    }
  });
}));

/**
 * @route   POST /api/data/checklist/question/:id/complete
 * @desc    Toggle question completion status
 * @access  Private
 */
router.post(['/activity-tracker', '/data/checklist/question/:id/complete'], authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const questionId = req.params.id;
  const { completed } = req.body;

  // For POST /api/activity-tracker, we need questionId in body
  const actualQuestionId = questionId || req.body.questionId;

  if (!actualQuestionId) {
    return res.status(400).json({
      success: false,
      error: 'Question ID is required'
    });
  }

  const checklistData = await ChecklistData.findOne({ userId });

  if (!checklistData) {
    return res.status(404).json({
      success: false,
      error: 'Checklist data not found'
    });
  }

  // Search across all days for the question
  let targetDay = null;
  let targetQuestionIndex = -1;

  for (const day of checklistData.data) {
    const questionIndex = day.questions.findIndex(
      q => q._id && q._id.toString() === actualQuestionId
    );
    
    if (questionIndex !== -1) {
      targetDay = day;
      targetQuestionIndex = questionIndex;
      break;
    }
  }

  if (!targetDay || targetQuestionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Question not found'
    });
  }

  const question = targetDay.questions[targetQuestionIndex];
  
  // Toggle completion status if not explicitly provided
  const newCompletedStatus = completed !== undefined ? completed : !question.completed;
  question.completed = newCompletedStatus;
  
  checklistData.lastUpdated = new Date();
  await checklistData.save();

  // Update activity tracker if question is being marked as completed
  if (newCompletedStatus) {
    let activityTracker = await ActivityTracker.findOne({ userId });
    
    if (!activityTracker) {
      activityTracker = new ActivityTracker({
        userId,
        activityData: {
          currentStreak: 0,
          totalSolved: 0,
          averageDaily: 0,
          maxStreak: 0,
          heatmapData: {},
          activityHistory: [],
        }
      });
    }

    // Update activity data
    activityTracker.activityData.totalSolved += 1;
    
    // Update streak based on today's activity
    const today = new Date().toDateString();
    const lastActivity = activityTracker.activityData.activityHistory[activityTracker.activityData.activityHistory.length - 1];
    
    if (!lastActivity || lastActivity.date !== today) {
      // New activity for today
      activityTracker.activityData.activityHistory.push({
        date: today,
        solved: 1
      });
      
      // Update streak
      await activityTracker.updateStreak();
    } else {
      // Update today's activity
      lastActivity.solved += 1;
    }

    activityTracker.lastUpdated = new Date();
    await activityTracker.save();
  }

  await checkAndSendNotifications(userId, { questionsCompleted: newCompletedStatus });

  res.json({
    success: true,
    message: `Question ${newCompletedStatus ? 'completed' : 'marked as incomplete'}`,
    question: {
      _id: question._id,
      text: question.text,
      completed: question.completed,
      difficulty: question.difficulty
    },
    date: targetDay.date
  });
}));

// Existing stats route remains the same...
router.get('/checklist/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;

  const [checklistData, activityTracker] = await Promise.all([
    ChecklistData.findOne({ userId }),
    ActivityTracker.findOne({ userId })
  ]);

  if (!checklistData) {
    return res.json({
      success: true,
      stats: {
        totalQuestions: 0,
        completedQuestions: 0,
        completionRate: 0,
        byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
        currentStreak: 0,
        totalSolved: 0
      }
    });
  }

  // Calculate statistics from ALL days
  let totalQuestions = 0;
  let completedQuestions = 0;
  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };

  checklistData.data.forEach(day => {
    day.questions.forEach(question => {
      totalQuestions++;
      if (question.completed) {
        completedQuestions++;
        const difficulty = question.difficulty || 'Medium';
        byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;
      }
    });
  });

  const completionRate = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

  res.json({
    success: true,
    stats: {
      totalQuestions,
      completedQuestions,
      completionRate: Math.round(completionRate * 100) / 100,
      byDifficulty,
      currentStreak: activityTracker ? activityTracker.activityData.currentStreak : 0,
      totalSolved: activityTracker ? activityTracker.activityData.totalSolved : completedQuestions,
      daysTracked: checklistData.data.length
    }
  });
}));

export default router;