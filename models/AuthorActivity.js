/**
 * Author Activity Model
 * Tracks comprehensive author activity and interactions
 */

import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  author: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'blog_created',
      'blog_updated',
      'comment_received',
      'comment_replied',
      'like_received',
      'share_received',
      'blog_viewed'
    ]
  },
  blogSlug: {
    type: String,
    ref: 'Blog'
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  targetUser: {
    type: String,
    ref: 'User'
  },
  metadata: {
    type: Object,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes
activitySchema.index({ author: 1, createdAt: -1 });
activitySchema.index({ author: 1, type: 1, createdAt: -1 });
activitySchema.index({ blogSlug: 1, createdAt: -1 });

// Static method to record activity
activitySchema.statics.recordActivity = function(activityData) {
  return this.create(activityData);
};

// Static method to get author activity with pagination
activitySchema.statics.getAuthorActivity = function(author, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ author })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('targetUser', 'username avatar')
    .lean();
};

// Static method to get activity stats
activitySchema.statics.getActivityStats = function(author, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        author,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }
    }
  ]);
};

export default mongoose.model('AuthorActivity', activitySchema);