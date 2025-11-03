/**
 * Notification Service
 * Handles creation and delivery of user notifications
 */

import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { NOTIFICATION_TYPES } from '../utils/constants.js';
import { extractMentions } from '../utils/helpers.js';

/**
 * Create and deliver a notification
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
    let url = '';
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
        url = '/blogs';
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
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Handle mentions in content and create notifications
 */
export const handleMentionsInContent = async (content, sender, blogSlug, entityId, entityType) => {
  try {
    const mentions = extractMentions(content);

    for (const mentionedUser of mentions) {
      // Check if user exists and it's not the sender
      const userExists = await User.findOne({ username: mentionedUser });
      if (userExists && mentionedUser !== sender) {
        const notificationType = entityType === 'blog' 
          ? NOTIFICATION_TYPES.MENTION_IN_BLOG 
          : NOTIFICATION_TYPES.MENTION_IN_COMMENT;

        await createNotification({
          type: notificationType,
          recipient: mentionedUser,
          sender: sender,
          blogSlug: blogSlug,
          commentId: entityType === 'comment' ? entityId : null,
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
    console.error('Error handling mentions:', error);
  }
};

/**
 * Trigger real-time blog notifications to followers
 */
export const triggerRealTimeBlogNotifications = async (blog, authorUsername) => {
  try {
    // Find users who follow the author and have notification preferences enabled
    const followers = await User.find({
      following: authorUsername,
      "notificationPreferences.newBlogs": true,
    });

    // Create notification data
    const notificationData = {
      _id: blog._id,
      type: NOTIFICATION_TYPES.NEW_BLOG,
      title: "New blog published",
      message: `${authorUsername} published "${blog.title}"`,
      author: authorUsername,
      blogSlug: blog.slug,
      timestamp: new Date(),
      isRead: false,
      realTime: true,
    };

    return notificationData;
  } catch (error) {
    console.error('Error triggering real-time blog notifications:', error);
    throw error;
  }
};

/**
 * Handle comments disabled notification
 */
export const handleCommentsDisabled = async (blogSlug, blogAuthor) => {
  try {
    await createNotification({
      type: NOTIFICATION_TYPES.COMMENTS_DISABLED,
      recipient: blogAuthor,
      sender: "system",
      blogSlug: blogSlug,
      message: "Comments on your blog have been disabled due to multiple reports",
      metadata: {
        reason: "Multiple user reports",
        action: "comments_disabled",
      },
    });
  } catch (error) {
    console.error('Error sending comments disabled notification:', error);
  }
};