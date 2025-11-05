/**
 * User Restriction Model
 * Tracks user restrictions for content moderation
 */

import mongoose from 'mongoose';

const userRestrictionSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  blogSlug: { 
    type: String, 
    required: true,
    ref: 'Blog'
  },
  restrictedAt: { 
    type: Date, 
    default: Date.now 
  },
  reason: { 
    type: String, 
    default: "Multiple reports" 
  },
}, {
  timestamps: true
});

// Compound index for efficient lookups
userRestrictionSchema.index({ username: 1, blogSlug: 1 });
userRestrictionSchema.index({ restrictedAt: -1 });

export default mongoose.model('UserRestriction', userRestrictionSchema);