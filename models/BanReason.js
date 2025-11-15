/**
 * Ban Reason Templates Model
 * Admin-defined ban reasons for consistent moderation
 */

import mongoose from 'mongoose';

const banReasonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
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
    required: true
  },
  severity: {
    type: String,
    enum: ['warning', 'temporary', 'permanent'],
    default: 'temporary'
  },
  defaultDuration: {
    type: Number, // days
    default: 7
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
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  usageCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
banReasonSchema.index({ category: 1, severity: 1 });
banReasonSchema.index({ isActive: 1 });
banReasonSchema.index({ createdBy: 1 });

// Method to increment usage count
banReasonSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Static method to get active reasons by category
banReasonSchema.statics.getActiveReasons = function(category = null) {
  const query = { isActive: true };
  if (category) query.category = category;
  return this.find(query).sort({ severity: -1, usageCount: -1 });
};

export default mongoose.model('BanReason', banReasonSchema);