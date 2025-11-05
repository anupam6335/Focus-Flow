/**
 * Ban Management Model
 * Comprehensive user banning system with reasons and appeals
 */

import mongoose from 'mongoose';

const banSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  bannedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'abusive_content',
      'community_guidelines',
      'multiple_reports',
      'spam_activity',
      'platform_misuse',
      'suspicious_activity',
      'custom'
    ],
    default: 'community_guidelines'
  },
  severity: {
    type: String,
    enum: ['warning', 'temporary', 'permanent'],
    default: 'temporary'
  },
  duration: {
    type: Number, // Duration in days, 0 for permanent
    default: 7
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoUnbanAt: {
    type: Date,
    default: function() {
      if (this.severity === 'permanent') return null;
      const durationMs = (this.duration || 7) * 24 * 60 * 60 * 1000;
      return new Date(Date.now() + durationMs);
    }
  },
  evidence: [{
    type: {
      type: String,
      enum: ['comment', 'blog', 'report', 'system_log', 'custom']
    },
    content: String,
    url: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  previousBans: {
    count: {
      type: Number,
      default: 0
    },
    lastBanDate: Date
  },
  appeal: {
    requested: {
      type: Boolean,
      default: false
    },
    requestMessage: String,
    requestedAt: Date,
    reviewedBy: {
      type: String,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'under_review'],
      default: 'pending'
    },
    reviewNotes: String,
    decisionDate: Date
  },
  restrictions: {
    canComment: {
      type: Boolean,
      default: false
    },
    canPostBlogs: {
      type: Boolean,
      default: false
    },
    canLike: {
      type: Boolean,
      default: true
    },
    canFollow: {
      type: Boolean,
      default: true
    },
    canReceiveNotifications: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes
banSchema.index({ username: 1, isActive: 1 });
banSchema.index({ isActive: 1, autoUnbanAt: 1 });
banSchema.index({ 'appeal.reviewStatus': 1 });
banSchema.index({ category: 1, severity: 1 });
banSchema.index({ createdAt: -1 });

// Virtual for days remaining
banSchema.virtual('daysRemaining').get(function() {
  if (!this.isActive || this.severity === 'permanent' || !this.autoUnbanAt) {
    return null;
  }
  const now = new Date();
  const diffTime = this.autoUnbanAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if ban is expired
banSchema.methods.isExpired = function() {
  if (!this.isActive) return true;
  if (this.severity === 'permanent') return false;
  if (!this.autoUnbanAt) return false;
  return new Date() > this.autoUnbanAt;
};

// Static method to get active ban for user
banSchema.statics.getActiveBan = function(username) {
  return this.findOne({
    username,
    isActive: true,
    $or: [
      { severity: 'permanent' },
      { autoUnbanAt: { $gt: new Date() } },
      { autoUnbanAt: null }
    ]
  });
};

// Static method to get user's ban history
banSchema.statics.getUserBanHistory = function(username, limit = 10) {
  return this.find({ username })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get pending appeals
banSchema.statics.getPendingAppeals = function() {
  return this.find({
    isActive: true,
    'appeal.requested': true,
    'appeal.reviewStatus': 'pending'
  }).sort({ 'appeal.requestedAt': 1 });
};

export default mongoose.model('Ban', banSchema);