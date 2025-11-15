/**
 * Blog Model
 * Defines blog post schema with content, metadata, and engagement tracking
 */

import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  content: { 
    type: String, 
    required: true 
  },
  author: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  isPublic: { 
    type: Boolean, 
    default: true 
  },
  tags: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],
  likes: { 
    type: Number, 
    default: 0,
    min: 0
  },
  likedBy: [{ 
    type: String,
    ref: 'User'
  }],
  views: { 
    type: Number, 
    default: 0,
    min: 0
  },
  notificationSent: { 
    type: Boolean, 
    default: false 
  },
}, {
  timestamps: true
});

// Compound indexes for common query patterns
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ isPublic: 1, createdAt: -1 });
blogSchema.index({ tags: 1, createdAt: -1 });
blogSchema.index({ slug: 1 });
blogSchema.index({ likes: -1 });
blogSchema.index({ views: -1 });

// Virtual for comment count
blogSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: 'slug',
  foreignField: 'blogSlug',
  count: true
});

// Method to increment views
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to find public blogs with pagination
blogSchema.statics.findPublicBlogs = function(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ isPublic: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v');
};

// Static method to find by author with privacy control
blogSchema.statics.findByAuthor = function(author, currentUser = null, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const query = { author };
  
  // If not the author, only show public blogs
  if (currentUser !== author) {
    query.isPublic = true;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v');
};

export default mongoose.model('Blog', blogSchema);