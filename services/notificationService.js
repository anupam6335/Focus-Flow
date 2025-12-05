/**
 * Enhanced Notification Service
 * Complete push notification system for blogs with all existing functionality maintained
 */

import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { NOTIFICATION_TYPES } from "../utils/constants.js";
import { extractMentions } from "../utils/helpers.js";
import { socketService } from "./socketService.js";

/**
 * Create and deliver a notification with real-time push
 * ENHANCED: Added real-time Socket.io push for instant notifications
 */
export const createNotification = async (notificationData) => {
  try {
    const {
      type,
      recipient,
      sender,
      blogSlug,
      commentId,
      message,
      metadata = {},
    } = notificationData;

    // Generate precise URL based on notification type
    let url = "";
    switch (type) {
      case NOTIFICATION_TYPES.NEW_BLOG:
      case NOTIFICATION_TYPES.LIKE_ON_BLOG:
      case NOTIFICATION_TYPES.MENTION_IN_BLOG:
      case NOTIFICATION_TYPES.COMMENTS_DISABLED:
        url = `/blogs/${blogSlug}`;
        break;
      case NOTIFICATION_TYPES.COMMENT_ON_BLOG:
      case NOTIFICATION_TYPES.REPLY_TO_COMMENT:
      case NOTIFICATION_TYPES.LIKE_ON_COMMENT:
      case NOTIFICATION_TYPES.MENTION_IN_COMMENT:
        url = `/blogs/${blogSlug}?comment=${commentId}`;
        break;
      default:
        url = "/blogs";
    }

    // Create and save notification to database
    const notification = new Notification({
      type,
      recipient,
      sender,
      blogSlug,
      commentId,
      message,
      metadata,
      url,
      isRead: false,
    });

    await notification.save();

    // ENHANCED: Send real-time push notification via Socket.io
    try {
      const notificationPayload = {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        url: notification.url,
        sender: notification.sender,
        blogSlug: notification.blogSlug,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      };

      // Emit to specific user
      socketService.emitToUser(
        recipient,
        "new-notification",
        notificationPayload
      );

      // Also update notification count in real-time
      const unreadCount = await Notification.getUnreadCount(recipient);
      socketService.emitToUser(recipient, "notification-count-updated", {
        unreadCount,
      });
    } catch (socketError) {
      console.warn(
        "Socket notification failed, but database notification saved:",
        socketError.message
      );
      // Continue even if socket fails - database notification is primary
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Handle mentions in content and create notifications
 * EXISTING FUNCTIONALITY: Maintains original behavior
 */
export const handleMentionsInContent = async (
  content,
  sender,
  blogSlug,
  entityId,
  entityType
) => {
  try {
    const mentions = extractMentions(content);

    for (const mentionedUser of mentions) {
      // Check if user exists and it's not the sender
      const userExists = await User.findOne({ username: mentionedUser });
      if (userExists && mentionedUser !== sender) {
        const notificationType =
          entityType === "blog"
            ? NOTIFICATION_TYPES.MENTION_IN_BLOG
            : NOTIFICATION_TYPES.MENTION_IN_COMMENT;

        await createNotification({
          type: notificationType,
          recipient: mentionedUser,
          sender: sender,
          blogSlug: blogSlug,
          commentId: entityType === "comment" ? entityId : null,
          message: `${sender} mentioned you in a ${entityType}`,
          metadata: {
            entityType: entityType,
            contentPreview: content.substring(0, 100),
            entityId: entityId,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error handling mentions:", error);
  }
};

/**
 * Trigger real-time blog notifications to followers
 * ENHANCED: Complete follower notification system for new blogs
 */
export const triggerRealTimeBlogNotifications = async (
  blog,
  authorUsername
) => {
  try {
    // Find users who follow the author and have notification preferences enabled
    const followers = await User.find({
      following: authorUsername,
      "notificationPreferences.newBlogs": true,
    });

    console.log(
      `📢 Notifying ${followers.length} followers about new blog from ${authorUsername}`
    );

    // Create notification for each follower
    for (const follower of followers) {
      try {
        await createNotification({
          type: NOTIFICATION_TYPES.NEW_BLOG,
          recipient: follower.username,
          sender: authorUsername,
          blogSlug: blog.slug,
          message: `${authorUsername} published a new blog: "${blog.title}"`,
          metadata: {
            blogTitle: blog.title,
            blogExcerpt: blog.excerpt || blog.content.substring(0, 150),
            author: authorUsername,
          },
        });
      } catch (followerError) {
        console.warn(
          `Failed to notify follower ${follower.username}:`,
          followerError.message
        );
        // Continue with other followers even if one fails
      }
    }

    // Create notification data for real-time broadcasting
    const notificationData = {
      _id: blog._id,
      type: NOTIFICATION_TYPES.NEW_BLOG,
      title: "New blog published",
      message: `${authorUsername} published "${blog.title}"`,
      author: authorUsername,
      blogSlug: blog.slug,
      blogTitle: blog.title,
      excerpt: blog.excerpt || blog.content.substring(0, 150),
      timestamp: new Date(),
      isRead: false,
      realTime: true,
    };

    // Broadcast to all users in the author's blog-publish room
    socketService.emitToRoom(
      `blog-publish-${authorUsername}`,
      "new-blog-published",
      notificationData
    );

    return notificationData;
  } catch (error) {
    console.error("Error triggering real-time blog notifications:", error);
    throw error;
  }
};

/**
 * Handle comments disabled notification
 * EXISTING FUNCTIONALITY: Maintains original behavior
 */
export const handleCommentsDisabled = async (blogSlug, blogAuthor) => {
  try {
    await createNotification({
      type: NOTIFICATION_TYPES.COMMENTS_DISABLED,
      recipient: blogAuthor,
      sender: "system",
      blogSlug: blogSlug,
      message:
        "Comments on your blog have been disabled due to multiple reports",
      metadata: {
        reason: "Multiple user reports",
        action: "comments_disabled",
      },
    });
  } catch (error) {
    console.error("Error sending comments disabled notification:", error);
  }
};

/**
 * Send batch notifications to multiple users
 * NEW FEATURE: For efficient mass notifications
 */
export const sendBatchNotifications = async (recipients, notificationData) => {
  try {
    const notifications = [];
    const batchSize = 50; // Process in batches to avoid overload
    const batches = [];

    // Split recipients into batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      const batchPromises = batch.map((recipient) =>
        createNotification({
          ...notificationData,
          recipient,
        }).catch((error) => {
          console.warn(
            `Failed to send notification to ${recipient}:`,
            error.message
          );
          return null; // Continue even if some fail
        })
      );

      const batchResults = await Promise.all(batchPromises);
      notifications.push(...batchResults.filter((n) => n !== null));
    }

    return notifications;
  } catch (error) {
    console.error("Error sending batch notifications:", error);
    throw error;
  }
};

/**
 * Notify blog author about new comment
 * EXISTING FUNCTIONALITY: Maintains original behavior from comments.js
 */
export const notifyBlogAuthorAboutComment = async (
  blogSlug,
  commentAuthor,
  blogAuthor,
  commentContent,
  commentId
) => {
  try {
    if (blogAuthor !== commentAuthor) {
      await createNotification({
        type: NOTIFICATION_TYPES.COMMENT_ON_BLOG,
        recipient: blogAuthor,
        sender: commentAuthor,
        blogSlug: blogSlug,
        commentId: commentId,
        message: `${commentAuthor} commented on your blog`,
        metadata: {
          blogSlug: blogSlug,
          commentPreview: commentContent.substring(0, 100),
          commentAuthor: commentAuthor,
        },
      });
    }
  } catch (error) {
    console.error("Error notifying blog author about comment:", error);
  }
};

/**
 * Notify parent comment author about reply
 * EXISTING FUNCTIONALITY: Maintains original behavior from comments.js
 */
export const notifyParentCommentAuthorAboutReply = async (
  blogSlug,
  replyAuthor,
  parentCommentAuthor,
  replyContent,
  commentId,
  blogTitle
) => {
  try {
    if (parentCommentAuthor !== replyAuthor) {
      await createNotification({
        type: NOTIFICATION_TYPES.REPLY_TO_COMMENT,
        recipient: parentCommentAuthor,
        sender: replyAuthor,
        blogSlug: blogSlug,
        commentId: commentId,
        message: `${replyAuthor} replied to your comment on "${blogTitle}"`,
        metadata: {
          blogTitle: blogTitle,
          replyContent: replyContent.substring(0, 100),
        },
      });
    }
  } catch (error) {
    console.error("Error notifying parent comment author about reply:", error);
  }
};

/**
 * Notify comment author about like
 * EXISTING FUNCTIONALITY: Maintains original behavior from comments.js
 */
export const notifyCommentAuthorAboutLike = async (
  blogSlug,
  liker,
  commentAuthor,
  commentContent,
  commentId
) => {
  try {
    if (commentAuthor !== liker) {
      await createNotification({
        type: NOTIFICATION_TYPES.LIKE_ON_COMMENT,
        recipient: commentAuthor,
        sender: liker,
        blogSlug: blogSlug,
        commentId: commentId,
        message: `${liker} liked your comment`,
        metadata: {
          blogSlug: blogSlug,
          commentPreview: commentContent.substring(0, 50),
          liker: liker,
        },
      });
    }
  } catch (error) {
    console.error("Error notifying comment author about like:", error);
  }
};

/**
 * Notify blog author about like
 * EXISTING FUNCTIONALITY: Maintains original behavior from blogs.js
 */
export const notifyBlogAuthorAboutLike = async (
  blogSlug,
  liker,
  blogAuthor,
  blogTitle
) => {
  try {
    if (blogAuthor !== liker) {
      await createNotification({
        type: NOTIFICATION_TYPES.LIKE_ON_BLOG,
        recipient: blogAuthor,
        sender: liker,
        blogSlug: blogSlug,
        message: `${liker} liked your blog "${blogTitle}"`,
        metadata: {
          blogTitle: blogTitle,
        },
      });
    }
  } catch (error) {
    console.error("Error notifying blog author about like:", error);
  }
};

/**
 * Get notification statistics for dashboard
 * NEW FEATURE: Useful for admin panels or user insights
 */
export const getNotificationStats = async (username, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Notification.aggregate([
      {
        $match: {
          recipient: username,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: ["$isRead", 1, 0] },
          },
          lastNotification: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          type: "$_id",
          count: 1,
          readCount: 1,
          unreadCount: { $subtract: ["$count", "$readCount"] },
          readRate: { $divide: ["$readCount", "$count"] },
          lastNotification: 1,
        },
      },
    ]);

    // Get total counts
    const totalCount = await Notification.countDocuments({
      recipient: username,
      createdAt: { $gte: startDate },
    });

    const unreadCount = await Notification.countDocuments({
      recipient: username,
      isRead: false,
      createdAt: { $gte: startDate },
    });

    return {
      total: totalCount,
      unread: unreadCount,
      read: totalCount - unreadCount,
      byType: stats,
      period: `${days} days`,
    };
  } catch (error) {
    console.error("Error getting notification stats:", error);
    throw error;
  }
};

/**
 * Mark multiple notifications as read
 * NEW FEATURE: Bulk update for better performance
 */
export const markMultipleAsRead = async (username, notificationIds) => {
  try {
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipient: username,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    // Update real-time notification count
    if (result.modifiedCount > 0) {
      const unreadCount = await Notification.getUnreadCount(username);
      socketService.emitToUser(username, "notification-count-updated", {
        unreadCount,
      });
    }

    return result;
  } catch (error) {
    console.error("Error marking multiple notifications as read:", error);
    throw error;
  }
};

/**
 * Clean up old notifications
 * NEW FEATURE: Automated cleanup to prevent database bloat
 */
export const cleanupOldNotifications = async (daysOld = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true, // Only delete read notifications
    });

    console.log(
      `🧹 Cleaned up ${result.deletedCount} old notifications (older than ${daysOld} days)`
    );

    return result;
  } catch (error) {
    console.error("Error cleaning up old notifications:", error);
    throw error;
  }
};

/**
 * Check and send notifications (for existing auth routes)
 * This maintains compatibility with existing code
 */
export const checkAndSendNotifications = async (
  userId,
  notificationType,
  data
) => {
  try {
    // This is a legacy function - redirect to createNotification
    return await createNotification({
      type: notificationType,
      recipient: userId,
      sender: data.sender || "system",
      blogSlug: data.blogSlug || null,
      commentId: data.commentId || null,
      message: data.message || "New notification",
      metadata: data.metadata || {},
    });
  } catch (error) {
    console.error("Error in checkAndSendNotifications:", error);
    throw error;
  }
};

// Export all existing functions that were in the original file
export default {
  createNotification,
  handleMentionsInContent,
  triggerRealTimeBlogNotifications,
  handleCommentsDisabled,
  sendBatchNotifications,
  notifyBlogAuthorAboutComment,
  notifyParentCommentAuthorAboutReply,
  notifyCommentAuthorAboutLike,
  notifyBlogAuthorAboutLike,
  getNotificationStats,
  markMultipleAsRead,
  cleanupOldNotifications,
  checkAndSendNotifications,
};
