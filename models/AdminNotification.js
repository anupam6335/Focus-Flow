/**
 * Admin Notification Model
 * For global and targeted notifications sent by admins
 */

import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['global', 'targeted', 'announcement', 'warning', 'info'],
    default: 'global'
  },
  sender: {
    type: String,
    required: true,
    ref: 'User'
  },
  recipients: [{
    type: String,
    ref: 'User'
  }],
  // For targeted notifications - empty array means global
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  actionUrl: {
    type: String,
    default: null
  },
  metadata: {
    type: Object,
    default: {}
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  readBy: [{
    user: {
      type: String,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveryStats: {
    sent: {
      type: Number,
      default: 0
    },
    read: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
adminNotificationSchema.index({ type: 1, createdAt: -1 });
adminNotificationSchema.index({ sender: 1, createdAt: -1 });
adminNotificationSchema.index({ recipients: 1 });
adminNotificationSchema.index({ isActive: 1 });
adminNotificationSchema.index({ expiresAt: 1 });
adminNotificationSchema.index({ scheduledAt: 1 });

// Virtual for total recipients count
adminNotificationSchema.virtual('totalRecipients').get(function() {
  return this.type === 'global' ? 'all' : this.recipients.length;
});

// Method to mark as read by user
adminNotificationSchema.methods.markAsRead = function(username) {
  if (!this.readBy.some(entry => entry.user === username)) {
    this.readBy.push({ user: username });
    this.deliveryStats.read += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get active global notifications
adminNotificationSchema.statics.getActiveGlobalNotifications = function() {
  return this.find({
    type: 'global',
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ],
    $or: [
      { scheduledAt: null },
      { scheduledAt: { $lte: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to get user's admin notifications
adminNotificationSchema.statics.getUserNotifications = function(username) {
  return this.find({
    isActive: true,
    $or: [
      { type: 'global' },
      { recipients: username }
    ],
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ],
    $or: [
      { scheduledAt: null },
      { scheduledAt: { $lte: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

export default mongoose.model('AdminNotification', adminNotificationSchema);