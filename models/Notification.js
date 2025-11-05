/**
 * Notification Model
 * Defines notification schema for real-time user notifications
 */

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
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
    required: true,
    ref: 'User'
  },
  sender: { 
    type: String, 
    required: true,
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
    type: String, 
    required: true 
  },
  metadata: { 
    type: Object, 
    default: {} 
  },
  url: { 
    type: String, 
    required: true 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function(recipient) {
  return this.updateMany(
    { recipient, isRead: false },
    { isRead: true }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(recipient) {
  return this.countDocuments({ recipient, isRead: false });
};

export default mongoose.model('Notification', notificationSchema);