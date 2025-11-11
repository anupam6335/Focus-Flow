/**
 * Blog Routes
 * Handles blog CRUD operations and engagement
 */

import express from 'express';
import Blog from '../models/Blog.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateBlog, validatePagination } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateSlug } from '../utils/helpers.js';
import { createNotification, handleMentionsInContent, triggerRealTimeBlogNotifications } from '../services/notificationService.js';

const router = express.Router();

// Apply pagination middleware to all list routes
router.use(['/all', '/my', '/popular'], validatePagination);

/**
 * @route   GET /api/blogs/all
 * @desc    Get all public blogs
 * @access  Public
 */
router.get('/all', optionalAuth, asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.query;

  // Only show public blogs for "All Blogs"
  const query = { isPublic: true };

  const blogs = await Blog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('title slug author isPublic tags createdAt updatedAt content likes likedBy views');

  const total = await Blog.countDocuments(query);

  res.json({
    success: true,
    blogs,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total,
  });
}));

/**
 * @route   GET /api/blogs/my
 * @desc    Get user's blogs (both public and private)
 * @access  Private
 */
router.get('/my', authenticateToken, asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.query;
  const username = req.user.username;

  // Show all blogs by the current user
  const blogs = await Blog.findByAuthor(username, username, page, limit);

  const total = await Blog.countDocuments({ author: username });

  res.json({
    success: true,
    blogs,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total,
  });
}));

/**
 * @route   GET /api/blogs/popular
 * @desc    Get popular blogs
 * @access  Public
 */
router.get('/popular', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Only show public blogs for unauthenticated users
  const query = { isPublic: true };

  const blogs = await Blog.find(query).select(
    'title slug author isPublic tags likes likedBy views createdAt updatedAt content'
  );

  // Calculate popularity score and sort
  const blogsWithPopularity = blogs
    .map((blog) => ({
      ...blog.toObject(),
      popularityScore: (blog.likes || 0) + (blog.views || 0),
    }))
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    blogs: blogsWithPopularity,
  });
}));

/**
 * @route   GET /api/blogs/:slug
 * @desc    Get single blog by slug
 * @access  Public (with access control for private blogs)
 */
router.get('/:slug', optionalAuth, asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug });

  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Check if user can access private blog
  if (!blog.isPublic) {
    if (!req.user || req.user.username !== blog.author) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
  }

  res.json({
    success: true,
    blog
  });
}));

/**
 * @route   POST /api/blogs
 * @desc    Create a new blog
 * @access  Private
 */
router.post('/', authenticateToken, validateBlog, asyncHandler(async (req, res) => {
  const { title, content, isPublic = true, tags = [] } = req.body;
  const username = req.user.username;

  // Generate slug from title
  const slug = generateSlug(title);

  // Check if slug already exists
  const existingBlog = await Blog.findOne({ slug });
  if (existingBlog) {
    return res.status(400).json({
      success: false,
      error: 'Blog with this title already exists'
    });
  }

  const blog = new Blog({
    title,
    slug,
    content,
    author: username,
    isPublic,
    tags,
  });

  await blog.save();

  // Handle mentions in blog content
  await handleMentionsInContent(
    content,
    username,
    blog.slug,
    blog._id,
    'blog'
  );

  // Notify followers about new blog
  if (isPublic) {
    await triggerRealTimeBlogNotifications(blog, username);
  }

  res.status(201).json({
    success: true,
    blog: {
      ...blog.toObject(),
      id: blog._id,
    },
  });
}));

/**
 * @route   PUT /api/blogs/:slug
 * @desc    Update a blog
 * @access  Private (author only)
 */
router.put('/:slug', authenticateToken, validateBlog, asyncHandler(async (req, res) => {
  const { title, content, isPublic, tags } = req.body;
  const username = req.user.username;
  const blogSlug = req.params.slug;

  const blog = await Blog.findOne({ slug: blogSlug });
  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Check if user is the author
  if (blog.author !== username) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
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
        error: 'Blog with this title already exists'
      });
    }
  }

  blog.title = title || blog.title;
  blog.slug = newSlug;
  blog.content = content || blog.content;
  blog.isPublic = isPublic !== undefined ? isPublic : blog.isPublic;
  blog.tags = tags || blog.tags;
  blog.updatedAt = new Date();

  await blog.save();

  res.json({
    success: true,
    blog: {
      ...blog.toObject(),
      id: blog._id,
    },
  });
}));

/**
 * @route   DELETE /api/blogs/:slug
 * @desc    Delete a blog
 * @access  Private (author only)
 */
router.delete('/:slug', authenticateToken, asyncHandler(async (req, res) => {
  const username = req.user.username;
  const blogSlug = req.params.slug;

  const blog = await Blog.findOne({ slug: blogSlug });
  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Check if user is the author
  if (blog.author !== username) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await Blog.deleteOne({ slug: blogSlug });

  res.json({
    success: true,
    message: 'Blog deleted successfully'
  });
}));

/**
 * @route   POST /api/blogs/:slug/like
 * @desc    Like or unlike a blog
 * @access  Private
 */
router.post('/:slug/like', authenticateToken, asyncHandler(async (req, res) => {
  const blogSlug = req.params.slug;
  const username = req.user.username;

  const blog = await Blog.findOne({ slug: blogSlug });
  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Prevent self-like
  if (blog.author === username) {
    return res.status(400).json({
      success: false,
      error: 'Cannot like your own blog'
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

    // Notify blog author about like
    if (blog.author !== username) {
      await createNotification({
        type: 'like_on_blog',
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
    message: hasLiked ? 'Blog unliked' : 'Blog liked',
  });
}));

/**
 * @route   POST /api/blogs/:slug/view
 * @desc    Increment blog view count
 * @access  Public
 */
router.post('/:slug/view', asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug });

  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Increment view count for all users
  blog.views = (blog.views || 0) + 1;
  await blog.save();

  res.json({
    success: true,
    views: blog.views,
  });
}));

export default router;