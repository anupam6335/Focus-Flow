/**
 * Blog Routes
 * Handles blog CRUD operations and engagement
 */

import express from "express";
import Blog from "../models/Blog.js";
import Comment from "../models/Comment.js";
import AuthorActivity from "../models/AuthorActivity.js";
import User from "../models/User.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import { validateBlog, validatePagination } from "../middleware/validation.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { generateSlug } from "../utils/helpers.js";
import {
  createNotification,
  handleMentionsInContent,
  triggerRealTimeBlogNotifications,
} from "../services/notificationService.js";
import { socketService } from "../services/socketService.js";

const router = express.Router();

// Apply pagination middleware to all list routes
router.use(["/all", "/my", "/popular"], validatePagination);

/**
 * @route   GET /api/blogs/all
 * @desc    Get all public blogs with advanced filtering and sorting
 * @access  Public
 */
router.get(
  "/all",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      page,
      limit,
      skip,
      sort = "newest",
      category,
      tag,
      author,
      search,
    } = req.query;

    // Build query for public blogs
    const query = { isPublic: true };

    // Add filters
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    let blogs;
    let total;

    // Use aggregation for complex sorting
    if (sort === "popular") {
      blogs = await Blog.getPopularBlogs(parseInt(limit), "overall");
      total = await Blog.countDocuments(query);
    } else {
      let sortCriteria = {};
      switch (sort) {
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

      blogs = await Blog.find(query)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .select(
          "title slug author excerpt tags category likes views shares commentCount readingTime createdAt featured"
        );

      total = await Blog.countDocuments(query);
    }

    // Get comment counts for blogs
    const blogSlugs = blogs.map((blog) => blog.slug);
    const commentCounts = await Comment.aggregate([
      { $match: { blogSlug: { $in: blogSlugs }, isDeleted: false } },
      { $group: { _id: "$blogSlug", count: { $sum: 1 } } },
    ]);

    // Add comment counts to blogs
    const commentCountMap = commentCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const blogsWithCounts = blogs.map((blog) => ({
      ...(blog.toObject ? blog.toObject() : blog),
      commentCount: commentCountMap[blog.slug] || 0,
    }));

    res.json({
      success: true,
      blogs: blogsWithCounts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      filters: { category, tag, author, search, sort },
    });
  })
);

/**
 * @route   GET /api/blogs/my
 * @desc    Get user's blogs (both public and private)
 * @access  Private
 */
router.get(
  "/my",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.query;
    const username = req.user.username;

    const blogs = await Blog.findByAuthor(username, username, page, limit);
    const total = await Blog.countDocuments({ author: username });

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  })
);

/**
 * @route   GET /api/blogs/popular
 * @desc    Get popular blogs by different factors
 * @access  Public
 */
router.get(
  "/popular",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      limit = 10,
      factor = "overall",
      timeframe = "all", // all, week, month
    } = req.query;

    let dateFilter = {};
    if (timeframe === "week") {
      dateFilter.createdAt = {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
    } else if (timeframe === "month") {
      dateFilter.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    const blogs = await Blog.getPopularBlogs(parseInt(limit), factor);

    res.json({
      success: true,
      blogs,
      factor,
      timeframe,
      limit: parseInt(limit),
    });
  })
);

/**
 * @route   GET /api/blogs/:slug
 * @desc    Get single blog by slug with access control for private blogs
 * @access  Public (with access control for private blogs)
 */
router.get(
  "/:slug",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { accessCode } = req.query;
    const username = req.user?.username;

    const blog = await Blog.findOne({ slug });

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Check access for private blogs
    if (!blog.isPublic) {
      const isAuthor = username && username === blog.author;
      const hasValidAccessCode =
        accessCode && (await blog.validateAccessCode(accessCode, username));

      if (!isAuthor && !hasValidAccessCode) {
        return res.status(403).json({
          success: false,
          error: "Access denied. This is a private blog.",
          requiresAccessCode: true,
        });
      }
    }

    // Increment views for non-author viewers
    if (!username || username !== blog.author) {
      await blog.incrementViews();

      // Record view activity
      await AuthorActivity.recordActivity({
        author: blog.author,
        type: "blog_viewed",
        blogSlug: blog.slug,
        targetUser: username,
        metadata: {
          blogTitle: blog.title,
        },
      });
    }

    // Get comments count
    const commentCount = await Comment.countDocuments({
      blogSlug: slug,
      isDeleted: false,
    });

    const blogWithDetails = {
      ...blog.toObject(),
      commentCount,
    };

    res.json({
      success: true,
      blog: blogWithDetails,
    });
  })
);

/**
 * @route   POST /api/blogs
 * @desc    Create a new blog with enhanced features
 * @access  Private
 */
router.post(
  "/",
  authenticateToken,
  validateBlog,
  asyncHandler(async (req, res) => {
    const {
      title,
      content,
      isPublic = true,
      tags = [],
      category = "general",
    } = req.body;
    const username = req.user.username;

    // Generate slug from title
    const slug = generateSlug(title);

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        success: false,
        error: "Blog with this title already exists",
      });
    }

    const blog = new Blog({
      title,
      slug,
      content,
      author: username,
      isPublic,
      tags,
      category,
    });

    await blog.save();

    // Record activity
    await AuthorActivity.recordActivity({
      author: username,
      type: "blog_created",
      blogSlug: blog.slug,
      metadata: {
        blogTitle: blog.title,
        isPublic: blog.isPublic,
      },
    });

    // Handle mentions in blog content
    await handleMentionsInContent(
      content,
      username,
      blog.slug,
      blog._id,
      "blog"
    );

    // Notify followers about new blog
    if (isPublic) {
      const notificationData = await triggerRealTimeBlogNotifications(
        blog,
        username
      );

      // Send real-time notifications to followers
      const followers = await User.find({ following: username });
      followers.forEach((follower) => {
        socketService.emitToUser(
          follower.username,
          "new-blog",
          notificationData
        );
      });
    }

    res.status(201).json({
      success: true,
      blog: {
        ...blog.toObject(),
        id: blog._id,
      },
      message: "Blog created successfully",
    });
  })
);

/**
 * @route   PUT /api/blogs/:slug
 * @desc    Update a blog with inline editing support
 * @access  Private (author only)
 */
router.put(
  "/:slug",
  authenticateToken,
  validateBlog,
  asyncHandler(async (req, res) => {
    const { title, content, isPublic, tags, category } = req.body;
    const username = req.user.username;
    const blogSlug = req.params.slug;

    const blog = await Blog.findOne({ slug: blogSlug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Check if user is the author
    if (blog.author !== username) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    let newSlug = blog.slug;
    if (title && title !== blog.title) {
      newSlug = generateSlug(title);

      // Check if new slug already exists
      const existingBlog = await Blog.findOne({ slug: newSlug });
      if (existingBlog && existingBlog._id.toString() !== blog._id.toString()) {
        return res.status(400).json({
          success: false,
          error: "Blog with this title already exists",
        });
      }
    }

    blog.title = title || blog.title;
    blog.slug = newSlug;
    blog.content = content || blog.content;
    blog.isPublic = isPublic !== undefined ? isPublic : blog.isPublic;
    blog.tags = tags || blog.tags;
    blog.category = category || blog.category;
    blog.updatedAt = new Date();

    await blog.save();

    // Record update activity
    await AuthorActivity.recordActivity({
      author: username,
      type: "blog_updated",
      blogSlug: blog.slug,
      metadata: {
        blogTitle: blog.title,
      },
    });

    res.json({
      success: true,
      blog: {
        ...blog.toObject(),
        id: blog._id,
      },
      message: "Blog updated successfully",
    });
  })
);

/**
 * @route   DELETE /api/blogs/:slug
 * @desc    Delete a blog
 * @access  Private (author only)
 */
router.delete(
  "/:slug",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const username = req.user.username;
    const blogSlug = req.params.slug;

    const blog = await Blog.findOne({ slug: blogSlug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Check if user is the author
    if (blog.author !== username) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    await Blog.deleteOne({ slug: blogSlug });

    // Also delete related comments
    await Comment.deleteMany({ blogSlug });

    res.json({
      success: true,
      message: "Blog deleted successfully",
    });
  })
);

/**
 * @route   POST /api/blogs/:slug/like
 * @desc    Like or unlike a blog
 * @access  Private
 */
router.post(
  "/:slug/like",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const blogSlug = req.params.slug;
    const username = req.user.username;

    const blog = await Blog.findOne({ slug: blogSlug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Prevent self-like
    if (blog.author === username) {
      return res.status(400).json({
        success: false,
        error: "Cannot like your own blog",
      });
    }

    const hasLiked = blog.likedBy.includes(username);

    if (hasLiked) {
      // Unlike the blog
      blog.likes = Math.max(0, blog.likes - 1);
      blog.likedBy = blog.likedBy.filter((user) => user !== username);
    } else {
      // Like the blog
      blog.likes += 1;
      blog.likedBy.push(username);

      // Record like activity
      await AuthorActivity.recordActivity({
        author: blog.author,
        type: "like_received",
        blogSlug: blog.slug,
        targetUser: username,
        metadata: {
          blogTitle: blog.title,
        },
      });

      // Notify blog author about like
      if (blog.author !== username) {
        await createNotification({
          type: "like_on_blog",
          recipient: blog.author,
          sender: username,
          blogSlug: blog.slug,
          message: `${username} liked your blog "${blog.title}"`,
          metadata: {
            blogTitle: blog.title,
          },
        });
      }
    }

    await blog.save();

    res.json({
      success: true,
      likes: blog.likes,
      hasLiked: !hasLiked,
      message: hasLiked ? "Blog unliked" : "Blog liked",
    });
  })
);

/**
 * @route   POST /api/blogs/:slug/share
 * @desc    Share a blog
 * @access  Private
 */
router.post(
  "/:slug/share",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const blogSlug = req.params.slug;
    const username = req.user.username;

    const blog = await Blog.findOne({ slug: blogSlug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Prevent self-share
    if (blog.author === username) {
      return res.status(400).json({
        success: false,
        error: "Cannot share your own blog",
      });
    }

    const hasShared = blog.sharedBy.includes(username);

    if (!hasShared) {
      blog.shares += 1;
      blog.sharedBy.push(username);

      // Record share activity
      await AuthorActivity.recordActivity({
        author: blog.author,
        type: "share_received",
        blogSlug: blog.slug,
        targetUser: username,
        metadata: {
          blogTitle: blog.title,
        },
      });

      await blog.save();
    }

    res.json({
      success: true,
      shares: blog.shares,
      hasShared: true,
      message: "Blog shared successfully",
    });
  })
);

/**
 * @route   POST /api/blogs/:slug/view
 * @desc    Increment blog view count
 * @access  Public
 */
router.post(
  "/:slug/view",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Increment view count for all users (but don't double-count for authors)
    const username = req.user?.username;
    if (!username || username !== blog.author) {
      blog.views = (blog.views || 0) + 1;
      await blog.save();
    }

    res.json({
      success: true,
      views: blog.views,
    });
  })
);

/**
 * @route   POST /api/blogs/:slug/generate-access-code
 * @desc    Generate access code for private blog
 * @access  Private (author only)
 */
router.post(
  "/:slug/generate-access-code",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const username = req.user.username;
    const blogSlug = req.params.slug;

    const blog = await Blog.findOne({ slug: blogSlug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Check if user is the author
    if (blog.author !== username) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Check if blog is private
    if (blog.isPublic) {
      return res.status(400).json({
        success: false,
        error: "Access codes are only for private blogs",
      });
    }

    const accessCode = await blog.generateAccessCode();

    res.json({
      success: true,
      accessCode,
      message: "Access code generated successfully",
      expiresAt: blog.privateAccess[blog.privateAccess.length - 1].expiresAt,
    });
  })
);

/**
 * @route   POST /api/blogs/:slug/validate-access-code
 * @desc    Validate access code for private blog
 * @access  Private
 */
router.post(
  "/:slug/validate-access-code",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { accessCode } = req.body;
    const username = req.user.username;
    const blogSlug = req.params.slug;

    if (!accessCode) {
      return res.status(400).json({
        success: false,
        error: "Access code is required",
      });
    }

    const blog = await Blog.findOne({ slug: blogSlug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    const isValid = await blog.validateAccessCode(accessCode, username);

    if (isValid) {
      res.json({
        success: true,
        message: "Access granted",
        blog: {
          slug: blog.slug,
          title: blog.title,
          author: blog.author,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Invalid or expired access code",
      });
    }
  })
);

/**
 * @route   GET /api/blogs/:slug/access-codes
 * @desc    Get access codes for private blog
 * @access  Private (author only)
 */
router.get(
  "/:slug/access-codes",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const username = req.user.username;
    const blogSlug = req.params.slug;

    const blog = await Blog.findOne({ slug: blogSlug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Check if user is the author
    if (blog.author !== username) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.json({
      success: true,
      accessCodes: blog.privateAccess.map((access) => ({
        code: access.code,
        created: access.createdAt,
        expiresAt: access.expiresAt,
        usedBy: access.usedBy,
        isActive: access.isActive,
      })),
    });
  })
);

/**
 * @route   GET /api/blogs/author/:username/activity
 * @desc    Get author activity record
 * @access  Public
 */
router.get(
  "/author/:username/activity",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { author: username };
    if (type) query.type = type;

    const activities = await AuthorActivity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("targetUser", "username avatar")
      .lean();

    const total = await AuthorActivity.countDocuments(query);

    // Get activity stats
    const stats = await AuthorActivity.getActivityStats(username);

    res.json({
      success: true,
      activities,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

export default router;
