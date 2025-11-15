/**
 * Enhanced Notification Service
 * Handles creation and delivery of all notification types
 */

import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Todo from '../models/Todo.js';
import ChecklistData from '../models/ChecklistData.js';
import { NOTIFICATION_TYPES } from '../utils/constants.js';
import { extractMentions } from '../utils/helpers.js';
import { socketService } from './socketService.js';

/**
 * Get or create notification document for user
 */
const getNotificationDoc = async (userId) => {
  return await Notification.getUserNotifications(userId);
};

/**
 * Create and deliver a legacy notification (for blogs, comments, etc.)
 */
export const createNotification = async (notificationData) => {
  try {
    const {
      type,
      recipient,
      sender,
      blogSlug,
      commentId,
      message,
      metadata = {},
    } = notificationData;

    // Generate precise URL based on notification type
    let url = '';
    switch (type) {
      case NOTIFICATION_TYPES.NEW_BLOG:
      case NOTIFICATION_TYPES.LIKE_ON_BLOG:
      case NOTIFICATION_TYPES.MENTION_IN_BLOG:
      case NOTIFICATION_TYPES.COMMENTS_DISABLED:
        url = `/blogs/${blogSlug}`;
        break;
      case NOTIFICATION_TYPES.COMMENT_ON_BLOG:
      case NOTIFICATION_TYPES.REPLY_TO_COMMENT:
      case NOTIFICATION_TYPES.LIKE_ON_COMMENT:
      case NOTIFICATION_TYPES.MENTION_IN_COMMENT:
        url = `/blogs/${blogSlug}?comment=${commentId}`;
        break;
      default:
        url = '/blogs';
    }

    // Create and save notification to database
    const notification = new Notification({
      type,
      recipient,
      sender,
      blogSlug,
      commentId,
      message,
      metadata,
      url,
      isRead: false,
    });

    await notification.save();

    // Send real-time notification
    socketService.emitToUser(recipient, 'new-notification', {
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      url: notification.url,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Todo Notification Functions
 */

export const sendTodoReminderNotification = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const pendingTodos = await Todo.countDocuments({ 
      userId, 
      dueDate: today, 
      status: 'pending' 
    });

    if (pendingTodos > 0) {
      const notificationDoc = await getNotificationDoc(userId);
      await notificationDoc.addTodoNotification(
        'reminder',
        `You have ${pendingTodos} pending todo(s) for today. Keep going! 💪`,
        { pendingCount: pendingTodos }
      );

      // Send real-time notification
      socketService.emitToUser(userId, 'new-todo-notification', {
        category: 'todo',
        type: 'reminder',
        message: `You have ${pendingTodos} pending todo(s) for today. Keep going! 💪`,
        metadata: { pendingCount: pendingTodos }
      });
    }
  } catch (error) {
    console.error('Error sending todo reminder:', error);
  }
};

export const sendTodoAllCompletedNotification = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const completedTodos = await Todo.countDocuments({ 
      userId, 
      dueDate: today, 
      status: 'done' 
    });

    if (completedTodos > 0) {
      const notificationDoc = await getNotificationDoc(userId);
      await notificationDoc.addTodoNotification(
        'all_completed',
        '🎉 All tasks done! Take a breather and celebrate your productivity.',
        { completedCount: completedTodos }
      );

      socketService.emitToUser(userId, 'new-todo-notification', {
        category: 'todo',
        type: 'all_completed',
        message: '🎉 All tasks done! Take a breather and celebrate your productivity.',
        metadata: { completedCount: completedTodos }
      });
    }
  } catch (error) {
    console.error('Error sending todo completion notification:', error);
  }
};

/**
 * Question Notification Functions
 */

export const sendQuestionReminderNotification = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const checklistData = await ChecklistData.findOne({ userId });
    
    if (checklistData) {
      const todayData = checklistData.data.find(day => day.date === today);
      if (todayData) {
        const pendingQuestions = todayData.questions.filter(q => !q.completed).length;
        const totalQuestions = todayData.questions.length;

        if (pendingQuestions > 0 && totalQuestions > 0) {
          const notificationDoc = await getNotificationDoc(userId);
          await notificationDoc.addQuestionNotification(
            'reminder',
            `You have ${pendingQuestions} question(s) pending for today. Stay consistent! 📚`,
            { 
              pendingCount: pendingQuestions,
              totalCount: totalQuestions 
            }
          );

          socketService.emitToUser(userId, 'new-question-notification', {
            category: 'question',
            type: 'reminder',
            message: `You have ${pendingQuestions} question(s) pending for today. Stay consistent! 📚`,
            metadata: { 
              pendingCount: pendingQuestions,
              totalCount: totalQuestions 
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sending question reminder:', error);
  }
};

export const sendQuestionAllCompletedNotification = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const checklistData = await ChecklistData.findOne({ userId });
    
    if (checklistData) {
      const todayData = checklistData.data.find(day => day.date === today);
      if (todayData) {
        const completedQuestions = todayData.questions.filter(q => q.completed).length;
        const totalQuestions = todayData.questions.length;

        if (completedQuestions === totalQuestions && totalQuestions > 0) {
          const notificationDoc = await getNotificationDoc(userId);
          await notificationDoc.addQuestionNotification(
            'all_completed',
            '🌟 Amazing! You have completed all questions for today. Great job!',
            { 
              completedCount: completedQuestions,
              totalCount: totalQuestions 
            }
          );

          socketService.emitToUser(userId, 'new-question-notification', {
            category: 'question',
            type: 'all_completed',
            message: '🌟 Amazing! You have completed all questions for today. Great job!',
            metadata: { 
              completedCount: completedQuestions,
              totalCount: totalQuestions 
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sending question completion notification:', error);
  }
};

export const sendQuestionMilestoneNotification = async (userId, questionsSolved) => {
  try {
    const milestones = [5, 10, 20];
    
    if (milestones.includes(questionsSolved)) {
      const messages = {
        5: '🔥 Great start! You have solved 5 questions today. Keep the momentum going!',
        10: '🚀 Incredible! You have reached 10 questions today. You are on fire!',
        20: '🏆 Legendary! 20 questions solved today. You are crushing it!'
      };

      const notificationDoc = await getNotificationDoc(userId);
      await notificationDoc.addQuestionNotification(
        `milestone_${questionsSolved}`,
        messages[questionsSolved],
        { questionsSolved }
      );

      socketService.emitToUser(userId, 'new-question-notification', {
        category: 'question',
        type: `milestone_${questionsSolved}`,
        message: messages[questionsSolved],
        metadata: { questionsSolved }
      });
    }
  } catch (error) {
    console.error('Error sending question milestone:', error);
  }
};

/**
 * Global Notification Functions
 */

export const sendDailyStreakNotification = async (userId) => {
  try {
    // Check if we've already sent today's notification
    const notificationDoc = await getNotificationDoc(userId);
    const today = new Date().toISOString().split('T')[0];
    
    const alreadySent = notificationDoc.user.global.some(notification => 
      notification.type === 'daily_streak' && 
      notification.metadata.date === today
    );

    if (!alreadySent) {
      await notificationDoc.addGlobalNotification(
        'daily_streak',
        '📅 Maintain your daily streak! Set your todos and questions for today to stay consistent.',
        { date: today }
      );

      socketService.emitToUser(userId, 'new-global-notification', {
        category: 'global',
        type: 'daily_streak',
        message: '📅 Maintain your daily streak! Set your todos and questions for today to stay consistent.',
        metadata: { date: today }
      });
    }
  } catch (error) {
    console.error('Error sending daily streak notification:', error);
  }
};

export const sendAdminNotificationToUser = async (userId, message, sender = 'admin', actionUrl = null) => {
  try {
    const notificationDoc = await getNotificationDoc(userId);
    await notificationDoc.addGlobalNotification(
      'admin',
      message,
      { sender, actionUrl }
    );

    socketService.emitToUser(userId, 'new-global-notification', {
      category: 'global',
      type: 'admin',
      message,
      metadata: { sender, actionUrl }
    });
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
};

/**
 * Check and send appropriate notifications based on user activity
 */
export const checkAndSendNotifications = async (userId, context = {}) => {
  try {
    // Send daily streak notification (once per day)
    await sendDailyStreakNotification(userId);

    // Check and send todo notifications
    const today = new Date().toISOString().split('T')[0];
    const todos = await Todo.find({ userId, dueDate: today });
    const pendingTodos = todos.filter(t => t.status === 'pending').length;
    const completedTodos = todos.filter(t => t.status === 'done').length;

    if (pendingTodos > 0) {
      await sendTodoReminderNotification(userId);
    } else if (completedTodos > 0) {
      await sendTodoAllCompletedNotification(userId);
    }

    // Check and send question notifications
    const checklistData = await ChecklistData.findOne({ userId });
    if (checklistData) {
      const todayData = checklistData.data.find(day => day.date === today);
      if (todayData) {
        const pendingQuestions = todayData.questions.filter(q => !q.completed).length;
        const completedQuestions = todayData.questions.filter(q => q.completed).length;

        if (pendingQuestions > 0) {
          await sendQuestionReminderNotification(userId);
        } else if (completedQuestions === todayData.questions.length && todayData.questions.length > 0) {
          await sendQuestionAllCompletedNotification(userId);
        }

        // Check for milestone if questions were completed in this action
        if (context.questionsCompleted) {
          await sendQuestionMilestoneNotification(userId, completedQuestions);
        }
      }
    }
  } catch (error) {
    console.error('Error in notification check:', error);
  }
};

// Existing functions remain for backward compatibility
export const handleMentionsInContent = async (content, sender, blogSlug, entityId, entityType) => {
  try {
    const mentions = extractMentions(content);

    for (const mentionedUser of mentions) {
      const userExists = await User.findOne({ username: mentionedUser });
      if (userExists && mentionedUser !== sender) {
        const notificationType = entityType === 'blog' 
          ? NOTIFICATION_TYPES.MENTION_IN_BLOG 
          : NOTIFICATION_TYPES.MENTION_IN_COMMENT;

        await createNotification({
          type: notificationType,
          recipient: mentionedUser,
          sender: sender,
          blogSlug: blogSlug,
          commentId: entityType === 'comment' ? entityId : null,
          message: `${sender} mentioned you in a ${entityType}`,
          metadata: {
            entityType: entityType,
            contentPreview: content.substring(0, 100),
            entityId: entityId,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error handling mentions:', error);
  }
};

export const triggerRealTimeBlogNotifications = async (blog, authorUsername) => {
  try {
    const followers = await User.find({
      following: authorUsername,
      "notificationPreferences.newBlogs": true,
    });

    const notificationData = {
      _id: blog._id,
      type: NOTIFICATION_TYPES.NEW_BLOG,
      title: "New blog published",
      message: `${authorUsername} published "${blog.title}"`,
      author: authorUsername,
      blogSlug: blog.slug,
      timestamp: new Date(),
      isRead: false,
      realTime: true,
    };

    return notificationData;
  } catch (error) {
    console.error('Error triggering real-time blog notifications:', error);
    throw error;
  }
};

export const handleCommentsDisabled = async (blogSlug, blogAuthor) => {
  try {
    await createNotification({
      type: NOTIFICATION_TYPES.COMMENTS_DISABLED,
      recipient: blogAuthor,
      sender: "system",
      blogSlug: blogSlug,
      message: "Comments on your blog have been disabled due to multiple reports",
      metadata: {
        reason: "Multiple user reports",
        action: "comments_disabled",
      },
    });
  } catch (error) {
    console.error('Error sending comments disabled notification:', error);
  }
};