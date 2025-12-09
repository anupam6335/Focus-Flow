/**
 * Enhanced Blog Model
 * Added share tracking and access codes for private blogs
 */

import mongoose from "mongoose";

const privateAccessSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: {
    type: String,
    required: true,
    ref: "User",
  },
  usedBy: [
    {
      username: String,
      usedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  expiresAt: {
    type: Date,
    default: function () {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30); // 30 days expiry
      return expiry;
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      maxlength: 300,
    },
    author: {
      type: String,
      required: true,
      ref: "User",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    category: {
      type: String,
      default: "general",
    },
    // Engagement metrics
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: [
      {
        type: String,
        ref: "User",
      },
    ],
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    shares: {
      type: Number,
      default: 0,
      min: 0,
    },
    sharedBy: [
      {
        type: String,
        ref: "User",
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
    // Private blog access
    privateAccess: [privateAccessSchema],
    // Metadata
    featured: {
      type: Boolean,
      default: false,
    },
    readingTime: {
      type: Number, // in minutes
      default: 0,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    lastCommentedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performance
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ isPublic: 1, createdAt: -1 });
blogSchema.index({ tags: 1, createdAt: -1 });
blogSchema.index({ slug: 1 });
blogSchema.index({ likes: -1 });
blogSchema.index({ views: -1 });
blogSchema.index({ shares: -1 });
blogSchema.index({ commentCount: -1 });
blogSchema.index({ "privateAccess.code": 1 });
blogSchema.index({ category: 1, createdAt: -1 });

// Virtual for popularity score
blogSchema.virtual("popularityScore").get(function () {
  return (
    this.likes * 2 + this.views * 1 + this.shares * 3 + this.commentCount * 2
  );
});

// Virtual for comment count (from comments collection)
blogSchema.virtual("comments", {
  ref: "Comment",
  localField: "slug",
  foreignField: "blogSlug",
  count: true,
});

// Pre-save middleware to calculate reading time and excerpt
blogSchema.pre("save", function (next) {
  // Calculate reading time (average 200 words per minute)
  const wordCount = this.content.split(/\s+/).length;
  this.readingTime = Math.ceil(wordCount / 200);

  // Generate excerpt if not provided
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 300).replace(/[#*`]/g, "");
  }

  next();
});

// Method to increment views
blogSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Method to generate access code for private blog
blogSchema.methods.generateAccessCode = function () {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.privateAccess.push({
    code,
    createdBy: this.author,
  });
  return this.save().then(() => code);
};

// Method to validate access code
blogSchema.methods.validateAccessCode = function (code, username) {
  const access = this.privateAccess.find(
    (a) =>
      a.code === code &&
      a.isActive &&
      (!a.expiresAt || a.expiresAt > new Date())
  );

  if (access && !access.usedBy.some((u) => u.username === username)) {
    access.usedBy.push({ username });
    return this.save().then(() => true);
  }

  return Promise.resolve(false);
};

// Static method to find public blogs with pagination
blogSchema.statics.findPublicBlogs = function (
  page = 1,
  limit = 10,
  sort = "newest"
) {
  const skip = (page - 1) * limit;
  let sortCriteria = {};

  switch (sort) {
    case "popular":
      sortCriteria = { popularityScore: -1, createdAt: -1 };
      break;
    case "views":
      sortCriteria = { views: -1, createdAt: -1 };
      break;
    case "likes":
      sortCriteria = { likes: -1, createdAt: -1 };
      break;
    case "comments":
      sortCriteria = { commentCount: -1, createdAt: -1 };
      break;
    default:
      sortCriteria = { createdAt: -1 };
  }

  return this.find({ isPublic: true })
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit)
    .select("-__v -privateAccess");
};

// Static method to find by author with privacy control
blogSchema.statics.findByAuthor = function (
  author,
  currentUser = null,
  page = 1,
  limit = 10
) {
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
    .select("-__v -privateAccess");
};

// Static method to get popular blogs by different factors
blogSchema.statics.getPopularBlogs = function (limit = 10, factor = "overall") {
  let sortCriteria = {};

  switch (factor) {
    case "views":
      sortCriteria = { views: -1, createdAt: -1 };
      break;
    case "likes":
      sortCriteria = { likes: -1, createdAt: -1 };
      break;
    case "shares":
      sortCriteria = { shares: -1, createdAt: -1 };
      break;
    case "comments":
      sortCriteria = { commentCount: -1, createdAt: -1 };
      break;
    default: // overall popularity
      // Use aggregation for complex popularity score
      return this.aggregate([
        { $match: { isPublic: true } },
        {
          $addFields: {
            popularityScore: {
              $add: [
                { $multiply: ["$likes", 2] },
                { $multiply: ["$views", 1] },
                { $multiply: ["$shares", 3] },
                { $multiply: ["$commentCount", 2] },
              ],
            },
          },
        },
        { $sort: { popularityScore: -1, createdAt: -1 } },
        { $limit: parseInt(limit) },
        {
          $project: {
            title: 1,
            slug: 1,
            author: 1,
            excerpt: 1,
            tags: 1,
            likes: 1,
            views: 1,
            shares: 1,
            commentCount: 1,
            readingTime: 1,
            createdAt: 1,
            popularityScore: 1,
          },
        },
      ]);
  }

  return this.find({ isPublic: true })
    .sort(sortCriteria)
    .limit(limit)
    .select(
      "title slug author excerpt tags likes views shares commentCount readingTime createdAt"
    );
};

export default mongoose.model("Blog", blogSchema);
