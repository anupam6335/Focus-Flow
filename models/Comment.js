/**
 * Comment Model
 * Defines comment schema with nested replies and engagement tracking
 */

import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  blogSlug: { 
    type: String, 
    required: true,
    ref: 'Blog'
  },
  author: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  content: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    default: null,
    ref: 'Comment'
  },
  likes: { 
    type: Number, 
    default: 0,
    min: 0
  },
  dislikes: { 
    type: Number, 
    default: 0,
    min: 0
  },
  likedBy: [{ 
    type: String,
    ref: 'User'
  }],
  dislikedBy: [{ 
    type: String,
    ref: 'User'
  }],
  reports: { 
    type: Number, 
    default: 0,
    min: 0
  },
  reportedBy: [{ 
    type: String,
    ref: 'User'
  }],
  isEdited: { 
    type: Boolean, 
    default: false 
  },
  isPinned: { 
    type: Boolean, 
    default: false 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
}, {
  timestamps: true
});

// Compound indexes for performance
commentSchema.index({ blogSlug: 1, createdAt: -1 });
commentSchema.index({ blogSlug: 1, parentId: 1 });
commentSchema.index({ blogSlug: 1, isPinned: -1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

// Virtual for net score (likes - dislikes)
commentSchema.virtual('netScore').get(function() {
  return this.likes - this.dislikes;
});

// Method to check if user has voted
commentSchema.methods.hasUserVoted = function(username) {
  return {
    liked: this.likedBy.includes(username),
    disliked: this.dislikedBy.includes(username)
  };
};

// Static method to find comments by blog with nested replies
commentSchema.statics.findByBlogSlug = async function(blogSlug, sort = 'newest') {
  let sortCriteria = {};
  
  switch (sort) {
    case 'newest':
      sortCriteria = { createdAt: -1 };
      break;
    case 'oldest':
      sortCriteria = { createdAt: 1 };
      break;
    case 'popular':
      // Sort by net score (likes - dislikes)
      break;
    default:
      sortCriteria = { createdAt: -1 };
  }

  const comments = await this.find({ 
    blogSlug, 
    isDeleted: false 
  }).sort(sortCriteria);

  // Build comment tree structure
  const buildCommentTree = (parentId = null) => {
    return comments
      .filter(comment => {
        if (parentId === null) return comment.parentId === null;
        return comment.parentId && comment.parentId.toString() === parentId.toString();
      })
      .map(comment => ({
        ...comment.toObject(),
        replies: buildCommentTree(comment._id)
      }));
  };

  return buildCommentTree();
};

export default mongoose.model('Comment', commentSchema);