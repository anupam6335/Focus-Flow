/**
 * Notification Model
 * Enhanced schema with category-based storage for todos, questions, global, and future categories
 */

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  // New category-based storage structure
  user: {
    todo: [{
      type: {
        type: String,
        enum: ['reminder', 'all_completed', 'daily_reminder'],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      metadata: {
        pendingCount: Number,
        completedCount: Number,
        totalCount: Number,
        date: String
      },
      isRead: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    question: [{
      type: {
        type: String,
        enum: ['reminder', 'all_completed', 'milestone_5', 'milestone_10', 'milestone_20'],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      metadata: {
        pendingCount: Number,
        completedCount: Number,
        totalCount: Number,
        questionsSolved: Number,
        date: String
      },
      isRead: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    global: [{
      type: {
        type: String,
        enum: ['daily_streak', 'admin', 'system'],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      metadata: {
        streakCount: Number,
        sender: String,
        actionUrl: String
      },
      isRead: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Legacy fields for backward compatibility
  type: {
    type: String,
    enum: [
      "new_blog",
      "comment_on_blog",
      "reply_to_comment",
      "like_on_comment",
      "like_on_blog",
      "mention_in_blog",
      "mention_in_comment",
      "comments_disabled",
      "user_activity",
    ],
  },
  recipient: {
    type: String,
    ref: 'User'
  },
  sender: {
    type: String,
    ref: 'User'
  },
  blogSlug: {
    type: String,
    default: null,
    ref: 'Blog'
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    ref: 'Comment'
  },
  message: {
    type: String
  },
  metadata: {
    type: Object,
    default: {}
  },
  url: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, 'user.todo.isRead': 1 });
notificationSchema.index({ userId: 1, 'user.question.isRead': 1 });
notificationSchema.index({ userId: 1, 'user.global.isRead': 1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 });

// Virtual for total unread count (both legacy and new)
notificationSchema.virtual('totalUnread').get(function() {
  let count = 0;
  
  // Count new category-based notifications
  if (this.user) {
    count += this.user.todo.filter(n => !n.isRead).length;
    count += this.user.question.filter(n => !n.isRead).length;
    count += this.user.global.filter(n => !n.isRead).length;
  }
  
  // Count legacy notifications
  if (this.recipient && !this.isRead) {
    count += 1;
  }
  
  return count;
});

// Method to add todo notification
notificationSchema.methods.addTodoNotification = function(type, message, metadata = {}) {
  this.user.todo.push({
    type,
    message,
    metadata: {
      ...metadata,
      date: new Date().toISOString().split('T')[0]
    },
    isRead: false,
    createdAt: new Date()
  });
  
  // Keep only recent 50 notifications per category
  if (this.user.todo.length > 50) {
    this.user.todo = this.user.todo.slice(-50);
  }
  
  return this.save();
};

// Method to add question notification
notificationSchema.methods.addQuestionNotification = function(type, message, metadata = {}) {
  this.user.question.push({
    type,
    message,
    metadata: {
      ...metadata,
      date: new Date().toISOString().split('T')[0]
    },
    isRead: false,
    createdAt: new Date()
  });
  
  if (this.user.question.length > 50) {
    this.user.question = this.user.question.slice(-50);
  }
  
  return this.save();
};

// Method to add global notification
notificationSchema.methods.addGlobalNotification = function(type, message, metadata = {}) {
  this.user.global.push({
    type,
    message,
    metadata,
    isRead: false,
    createdAt: new Date()
  });
  
  if (this.user.global.length > 50) {
    this.user.global = this.user.global.slice(-50);
  }
  
  return this.save();
};

// Method to mark category notification as read
notificationSchema.methods.markCategoryAsRead = function(category, notificationId) {
  if (this.user[category]) {
    const notification = this.user[category].id(notificationId);
    if (notification) {
      notification.isRead = true;
      return this.save();
    }
  }
  return Promise.resolve(this);
};

// Method to mark all category notifications as read
notificationSchema.methods.markAllCategoryAsRead = function(category) {
  if (this.user[category]) {
    this.user[category].forEach(notification => {
      notification.isRead = true;
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get or create user notifications
notificationSchema.statics.getUserNotifications = async function(userId) {
  let notificationDoc = await this.findOne({ userId });
  
  if (!notificationDoc) {
    notificationDoc = new this({
      userId,
      user: {
        todo: [],
        question: [],
        global: []
      }
    });
    await notificationDoc.save();
  }
  
  return notificationDoc;
};

// Static method to mark all as read for user (backward compatible)
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { 
      $or: [
        { recipient: userId, isRead: false },
        { userId, 'user.todo.isRead': false },
        { userId, 'user.question.isRead': false },
        { userId, 'user.global.isRead': false }
      ]
    },
    { 
      $set: {
        isRead: true,
        'user.todo.$[].isRead': true,
        'user.question.$[].isRead': true,
        'user.global.$[].isRead': true
      }
    }
  );
};

// Static method to get unread count (backward compatible)
notificationSchema.statics.getUnreadCount = async function(userId) {
  const notificationDoc = await this.findOne({ userId });
  let count = 0;
  
  // Count legacy notifications
  count += await this.countDocuments({ recipient: userId, isRead: false });
  
  // Count new category notifications
  if (notificationDoc && notificationDoc.user) {
    count += notificationDoc.user.todo.filter(n => !n.isRead).length;
    count += notificationDoc.user.question.filter(n => !n.isRead).length;
    count += notificationDoc.user.global.filter(n => !n.isRead).length;
  }
  
  return count;
};

export default mongoose.model('Notification', notificationSchema);