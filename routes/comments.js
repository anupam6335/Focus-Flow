/**
 * Comment Routes
 * Handles comment CRUD operations and engagement
 */

import express from 'express';
import Comment from '../models/Comment.js';
import Blog from '../models/Blog.js';
import UserRestriction from '../models/UserRestriction.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateComment, validatePagination } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createNotification, handleMentionsInContent, handleCommentsDisabled } from '../services/notificationService.js';
import { socketService } from '../services/socketService.js';

const router = express.Router();

// Apply pagination middleware
router.use(['/blogs/:slug/comments'], validatePagination);

/**
 * @route   GET /api/comments/blogs/:slug/comments
 * @desc    Get comments for a blog with nested replies
 * @access  Public
 */
router.get('/blogs/:slug/comments', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { sort = 'newest' } = req.query;

  const comments = await Comment.findByBlogSlug(slug, sort);

  // Separate pinned comments (only top-level can be pinned)
  const pinnedComments = comments.filter((comment) => comment.isPinned);
  const normalComments = comments.filter((comment) => !comment.isPinned);

  // Apply sorting to normal comments only
  let sortedNormalComments = [...normalComments];
  if (sort === 'popular') {
    sortedNormalComments.sort(
      (a, b) => b.likes - b.dislikes - (a.likes - a.dislikes)
    );
  }

  res.json({
    success: true,
    comments: [...pinnedComments, ...sortedNormalComments],
    pinnedCount: pinnedComments.length,
  });
}));

/**
 * @route   POST /api/comments/blogs/:slug/comments
 * @desc    Create a new comment or reply
 * @access  Private
 */
router.post('/blogs/:slug/comments', authenticateToken, validateComment, asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { content, parentId } = req.body;
  const username = req.user.username;

  // Check if user is restricted from commenting on this blog
  const restriction = await UserRestriction.findOne({
    username,
    blogSlug: slug,
  });

  if (restriction) {
    return res.status(403).json({
      success: false,
      error: 'You are restricted from commenting on this blog due to multiple reports'
    });
  }

  const comment = new Comment({
    blogSlug: slug,
    author: username,
    content: content.trim(),
    parentId: parentId || null,
  });

  await comment.save();

  // Notify blog author about new comment
  const blog = await Blog.findOne({ slug });
  if (blog && blog.author !== username) {
    await createNotification({
      type: 'comment_on_blog',
      recipient: blog.author,
      sender: username,
      blogSlug: slug,
      commentId: comment._id,
      message: `${username} commented on your blog "${blog.title}"`,
      metadata: {
        blogTitle: blog.title,
        commentContent: content.substring(0, 100),
      },
    });
  }

  // Notify parent comment author about reply
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (parentComment && parentComment.author !== username) {
      await createNotification({
        type: 'reply_to_comment',
        recipient: parentComment.author,
        sender: username,
        blogSlug: slug,
        commentId: comment._id,
        message: `${username} replied to your comment on "${blog.title}"`,
        metadata: {
          blogTitle: blog.title,
          replyContent: content.substring(0, 100),
        },
      });
    }
  }

  // Check for mentions in comment
  await handleMentionsInContent(
    content,
    username,
    slug,
    comment._id,
    'comment'
  );

  // Populate the new comment with replies array for consistency
  const commentWithReplies = {
    ...comment.toObject(),
    replies: [],
  };

  // Broadcast new comment to all users in the blog room
  socketService.emitToRoom(slug, 'new-comment', commentWithReplies);

  res.status(201).json({
    success: true,
    comment: commentWithReplies,
  });
}));

/**
 * @route   PUT /api/comments/:commentId/edit
 * @desc    Edit a comment
 * @access  Private (author only)
 */
router.put('/:commentId/edit', authenticateToken, validateComment, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const username = req.user.username;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Check if user is the author
  if (comment.author !== username) {
    return res.status(403).json({
      success: false,
      error: 'You can only edit your own comments'
    });
  }

  comment.content = content.trim();
  comment.isEdited = true;
  comment.updatedAt = new Date();

  await comment.save();

  // Broadcast update to all users in real-time
  socketService.emitToRoom(comment.blogSlug, 'comment-updated', comment);

  res.json({
    success: true,
    comment,
    message: 'Comment updated successfully',
  });
}));

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete a comment (soft delete)
 * @access  Private (author only)
 */
router.delete('/:commentId', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const username = req.user.username;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Check if user is the author
  if (comment.author !== username) {
    return res.status(403).json({
      success: false,
      error: 'You can only delete your own comments'
    });
  }

  comment.isDeleted = true;
  comment.updatedAt = new Date();

  await comment.save();

  // Broadcast deletion to all users
  socketService.emitToRoom(comment.blogSlug, 'comment-deleted', commentId);

  res.json({
    success: true,
    message: 'Comment deleted successfully',
  });
}));

/**
 * @route   POST /api/comments/:commentId/like
 * @desc    Like or unlike a comment
 * @access  Private
 */
router.post('/:commentId/like', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const username = req.user.username;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Prevent self-like
  if (comment.author === username) {
    return res.status(400).json({
      success: false,
      error: 'Cannot like your own comment'
    });
  }

  const hasLiked = comment.likedBy.includes(username);
  const hasDisliked = comment.dislikedBy.includes(username);

  if (hasLiked) {
    // Unlike
    comment.likes = Math.max(0, comment.likes - 1);
    comment.likedBy = comment.likedBy.filter((user) => user !== username);
  } else {
    // Like - remove dislike first if exists
    if (hasDisliked) {
      comment.dislikes = Math.max(0, comment.dislikes - 1);
      comment.dislikedBy = comment.dislikedBy.filter(
        (user) => user !== username
      );
    }

    // Add like
    comment.likes += 1;
    comment.likedBy.push(username);

    // Notify comment author about like
    await createNotification({
      type: 'like_on_comment',
      recipient: comment.author,
      sender: username,
      blogSlug: comment.blogSlug,
      commentId: comment._id,
      message: `${username} liked your comment`,
      metadata: {
        blogSlug: comment.blogSlug,
        commentPreview: comment.content.substring(0, 50),
        liker: username,
      },
    });
  }

  await comment.save();

  // Broadcast vote update
  socketService.emitToRoom(comment.blogSlug, 'comment-vote-updated', {
    commentId,
    likes: comment.likes,
    dislikes: comment.dislikes,
  });

  res.json({
    success: true,
    likes: comment.likes,
    dislikes: comment.dislikes,
    hasLiked: !hasLiked,
    message: hasLiked ? 'Comment unliked' : 'Comment liked',
  });
}));

/**
 * @route   POST /api/comments/:commentId/dislike
 * @desc    Dislike or undislike a comment
 * @access  Private
 */
router.post('/:commentId/dislike', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const username = req.user.username;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Prevent self-dislike
  if (comment.author === username) {
    return res.status(400).json({
      success: false,
      error: 'Cannot dislike your own comment'
    });
  }

  const hasDisliked = comment.dislikedBy.includes(username);
  const hasLiked = comment.likedBy.includes(username);

  if (hasDisliked) {
    // Undislike
    comment.dislikes = Math.max(0, comment.dislikes - 1);
    comment.dislikedBy = comment.dislikedBy.filter(
      (user) => user !== username
    );
  } else {
    // Dislike - remove like first if exists
    if (hasLiked) {
      comment.likes = Math.max(0, comment.likes - 1);
      comment.likedBy = comment.likedBy.filter((user) => user !== username);
    }

    // Add dislike
    comment.dislikes += 1;
    comment.dislikedBy.push(username);
  }

  await comment.save();

  // Broadcast vote update
  socketService.emitToRoom(comment.blogSlug, 'comment-vote-updated', {
    commentId,
    likes: comment.likes,
    dislikes: comment.dislikes,
  });

  res.json({
    success: true,
    likes: comment.likes,
    dislikes: comment.dislikes,
    hasDisliked: !hasDisliked,
    message: hasDisliked ? 'Comment undisliked' : 'Comment disliked',
  });
}));

/**
 * @route   POST /api/comments/:commentId/report
 * @desc    Report a comment
 * @access  Private
 */
router.post('/:commentId/report', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const username = req.user.username;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Check if user already reported
  if (comment.reportedBy.includes(username)) {
    return res.status(400).json({
      success: false,
      error: 'You have already reported this comment'
    });
  }

  comment.reports += 1;
  comment.reportedBy.push(username);

  // If multiple reports (3 or more), restrict the comment author
  if (comment.reports >= 3) {
    const restriction = new UserRestriction({
      username: comment.author,
      blogSlug: comment.blogSlug,
      reason: 'Multiple reports on comments',
    });
    await restriction.save();

    // Check if we should disable comments on the blog
    const blogReports = await Comment.aggregate([
      {
        $match: {
          blogSlug: comment.blogSlug,
          reports: { $gte: 3 },
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);

    const highReportCount = blogReports[0]?.count || 0;

    // If 3 or more comments have 3+ reports, notify blog owner
    if (highReportCount >= 3) {
      await handleCommentsDisabled(comment.blogSlug, comment.author);
    }

    // Notify about restriction
    socketService.emitToRoom(comment.blogSlug, 'user-restricted', {
      username: comment.author,
      blogSlug: comment.blogSlug,
    });
  }

  await comment.save();

  // Broadcast report update
  socketService.emitToRoom(comment.blogSlug, 'comment-reported', {
    commentId,
    reports: comment.reports,
  });

  res.json({
    success: true,
    reports: comment.reports,
    message: comment.reports >= 3
      ? 'Comment reported. User has been restricted due to multiple reports.'
      : 'Comment reported successfully',
  });
}));

/**
 * @route   POST /api/comments/:commentId/pin
 * @desc    Pin or unpin a comment (blog author only)
 * @access  Private
 */
router.post('/:commentId/pin', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const username = req.user.username;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Get blog to check if user is the author
  const blog = await Blog.findOne({ slug: comment.blogSlug });
  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Check if user is the blog author
  if (blog.author !== username) {
    return res.status(403).json({
      success: false,
      error: 'Only the blog author can pin comments'
    });
  }

  // Check if trying to pin a reply (only parent comments can be pinned)
  if (comment.parentId) {
    return res.status(400).json({
      success: false,
      error: 'Only top-level comments can be pinned'
    });
  }

  // If unpinning, just update and return
  if (comment.isPinned) {
    comment.isPinned = false;
  } else {
    // Check current pinned count
    const currentPinnedCount = await Comment.countDocuments({
      blogSlug: comment.blogSlug,
      isPinned: true,
      parentId: null,
    });

    if (currentPinnedCount >= 2) {
      return res.status(400).json({
        success: false,
        error: 'You can only pin up to 2 comments'
      });
    }

    comment.isPinned = true;
  }

  comment.updatedAt = new Date();
  await comment.save();

  // Broadcast pin update in real-time
  socketService.emitToRoom(comment.blogSlug, 'comment-pin-updated', comment);

  res.json({
    success: true,
    isPinned: comment.isPinned,
    message: comment.isPinned ? 'Comment pinned' : 'Comment unpinned',
  });
}));

export default router;