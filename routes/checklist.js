/**
 * Checklist Routes
 * Handles CRUD operations for checklist questions and completion tracking
 */

import express from 'express';
import ChecklistData from '../models/ChecklistData.js';
import ActivityTracker from '../models/ActivityTracker.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateQuestionData, validateQuestionId } from '../middleware/checklistValidation.js';

const router = express.Router();

/**
 * @route   POST /api/data/checklist/question
 * @route   POST /api/checklist
 * @desc    Add a new question to checklist
 * @access  Private
 */
router.post(['/data/checklist/question', '/checklist'], authenticateToken,validateQuestionData, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { day, questionText, link, difficulty = 'Medium' } = req.body;

  // Validate required fields
  if (!day || !questionText) {
    return res.status(400).json({
      success: false,
      error: 'Day and question text are required'
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

  // Find the specific day
  const dayIndex = checklistData.data.findIndex(d => d.day === parseInt(day));
  
  if (dayIndex === -1) {
    return res.status(404).json({
      success: false,
      error: `Day ${day} not found`
    });
  }

  // Create new question
  const newQuestion = {
    text: questionText.trim(),
    link: link || '',
    completed: false,
    difficulty: difficulty
  };

  // Add question to the day
  checklistData.data[dayIndex].questions.push(newQuestion);
  checklistData.lastUpdated = new Date();

  await checklistData.save();

  res.status(201).json({
    success: true,
    message: 'Question added successfully',
    question: newQuestion,
    day: day
  });
}));

/**
 * @route   PUT /api/data/checklist/question/:id
 * @route   PUT /api/checklist/:id
 * @desc    Edit an existing question
 * @access  Private
 */
router.put(['/data/checklist/question/:id', '/checklist/:id'], authenticateToken, validateQuestionId,
  validateQuestionData, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const questionId = req.params.id;
  const { questionText, link, difficulty, day } = req.body;

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

  // If day is provided, we need to find the question in that specific day
  let targetDayIndex = -1;
  let targetQuestionIndex = -1;

  if (day) {
    // Search in specific day
    targetDayIndex = checklistData.data.findIndex(d => d.day === parseInt(day));
    if (targetDayIndex !== -1) {
      targetQuestionIndex = checklistData.data[targetDayIndex].questions.findIndex(
        q => q._id.toString() === questionId
      );
    }
  } else {
    // Search across all days
    for (let dayIndex = 0; dayIndex < checklistData.data.length; dayIndex++) {
      const questionIndex = checklistData.data[dayIndex].questions.findIndex(
        q => q._id && q._id.toString() === questionId
      );
      
      if (questionIndex !== -1) {
        targetDayIndex = dayIndex;
        targetQuestionIndex = questionIndex;
        break;
      }
    }
  }

  if (targetDayIndex === -1 || targetQuestionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Question not found'
    });
  }

  // Update question fields
  const question = checklistData.data[targetDayIndex].questions[targetQuestionIndex];
  
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
    day: checklistData.data[targetDayIndex].day
  });
}));

/**
 * @route   DELETE /api/data/checklist/question/:id
 * @route   DELETE /api/checklist/:id
 * @desc    Delete a question
 * @access  Private
 */
router.delete(['/data/checklist/question/:id', '/checklist/:id'], authenticateToken,  validateQuestionId, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const questionId = req.params.id;
  const { day } = req.body; // Optional: specify day for faster lookup

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

  let targetDayIndex = -1;
  let targetQuestionIndex = -1;

  if (day) {
    // Search in specific day
    targetDayIndex = checklistData.data.findIndex(d => d.day === parseInt(day));
    if (targetDayIndex !== -1) {
      targetQuestionIndex = checklistData.data[targetDayIndex].questions.findIndex(
        q => q._id.toString() === questionId
      );
    }
  } else {
    // Search across all days
    for (let dayIndex = 0; dayIndex < checklistData.data.length; dayIndex++) {
      const questionIndex = checklistData.data[dayIndex].questions.findIndex(
        q => q._id && q._id.toString() === questionId
      );
      
      if (questionIndex !== -1) {
        targetDayIndex = dayIndex;
        targetQuestionIndex = questionIndex;
        break;
      }
    }
  }

  if (targetDayIndex === -1 || targetQuestionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Question not found'
    });
  }

  // Store question info for response
  const deletedQuestion = checklistData.data[targetDayIndex].questions[targetQuestionIndex];

  // Remove the question
  checklistData.data[targetDayIndex].questions.splice(targetQuestionIndex, 1);
  checklistData.lastUpdated = new Date();

  await checklistData.save();

  res.json({
    success: true,
    message: 'Question deleted successfully',
    deletedQuestion: {
      text: deletedQuestion.text,
      difficulty: deletedQuestion.difficulty,
      day: checklistData.data[targetDayIndex].day
    }
  });
}));

/**
 * @route   POST /api/activity-tracker
 * @route   PUT /api/data/checklist/question/:id/complete
 * @desc    Toggle question completion status and update activity tracker
 * @access  Private
 */
router.post(['/activity-tracker', '/data/checklist/question/:id/complete'], authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const questionId = req.params.id;
  const { completed, day } = req.body;

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

  let targetDayIndex = -1;
  let targetQuestionIndex = -1;

  if (day) {
    // Search in specific day
    targetDayIndex = checklistData.data.findIndex(d => d.day === parseInt(day));
    if (targetDayIndex !== -1) {
      targetQuestionIndex = checklistData.data[targetDayIndex].questions.findIndex(
        q => q._id.toString() === actualQuestionId
      );
    }
  } else {
    // Search across all days
    for (let dayIndex = 0; dayIndex < checklistData.data.length; dayIndex++) {
      const questionIndex = checklistData.data[dayIndex].questions.findIndex(
        q => q._id && q._id.toString() === actualQuestionId
      );
      
      if (questionIndex !== -1) {
        targetDayIndex = dayIndex;
        targetQuestionIndex = questionIndex;
        break;
      }
    }
  }

  if (targetDayIndex === -1 || targetQuestionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Question not found'
    });
  }

  const question = checklistData.data[targetDayIndex].questions[targetQuestionIndex];
  
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

  res.json({
    success: true,
    message: `Question ${newCompletedStatus ? 'completed' : 'marked as incomplete'}`,
    question: {
      _id: question._id,
      text: question.text,
      completed: question.completed,
      difficulty: question.difficulty
    },
    day: checklistData.data[targetDayIndex].day
  });
}));

/**
 * @route   GET /api/checklist/stats
 * @desc    Get checklist statistics
 * @access  Private
 */
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

  // Calculate statistics
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