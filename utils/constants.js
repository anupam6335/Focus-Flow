/**
 * Application Constants
 * Centralized constants for consistent usage across the application
 */

// Notification Types
export const NOTIFICATION_TYPES = {
  NEW_BLOG: "new_blog",
  COMMENT_ON_BLOG: "comment_on_blog",
  REPLY_TO_COMMENT: "reply_to_comment",
  LIKE_ON_COMMENT: "like_on_comment",
  LIKE_ON_BLOG: "like_on_blog",
  MENTION_IN_BLOG: "mention_in_blog",
  MENTION_IN_COMMENT: "mention_in_comment",
  COMMENTS_DISABLED: "comments_disabled",
  USER_ACTIVITY: "user_activity",
};

// Socket Events
export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Blog events
  JOIN_BLOG: 'join-blog',
  LEAVE_BLOG: 'leave-blog',
  
  // User events
  USER_STATUS_CHANGED: 'user-status-changed',
  UPDATE_FOLLOWING: 'update-following',
  HEARTBEAT: 'heartbeat',
  FORCE_DISCONNECT: 'force-disconnect',
  
  // Notification events
  NEW_NOTIFICATION: 'new-notification',
  NOTIFICATION_COUNT_UPDATED: 'notification-count-updated',
  
  // Comment events
  NEW_COMMENT: 'new-comment',
  COMMENT_UPDATED: 'comment-updated',
  COMMENT_DELETED: 'comment-deleted',
  COMMENT_VOTE_UPDATED: 'comment-vote-updated',
  COMMENT_REPORTED: 'comment-reported',
  COMMENT_PIN_UPDATED: 'comment-pin-updated',
  USER_RESTRICTED: 'user-restricted',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
};

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes
  BLOG_LIST: 2 * 60 * 1000,    // 2 minutes
  USER_STATS: 10 * 60 * 1000,  // 10 minutes
};

// Socket configuration
export const SOCKET_CONFIG = {
  CORS_ORIGIN: process.env.FRONTEND_URL || "http://localhost:3000",
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  STALE_THRESHOLD: 30000,    // 30 seconds
  GRACE_PERIOD: 5000,        // 5 seconds for page refreshes
};

// Difficulty levels
export const DIFFICULTY_LEVELS = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

// Authentication
export const AUTH = {
  TOKEN_EXPIRY: '15d', 
  BCRYPT_ROUNDS: 10,
  RESET_CODE_LENGTH: 6,
  RESET_CODE_EXPIRY: 15 * 60 * 1000, // 15 minutes
};

// Validation limits
export const VALIDATION_LIMITS = {
  USERNAME: {
    MIN: 3,
    MAX: 30,
  },
  PASSWORD: {
    MIN: 4,
  },
  BLOG_TITLE: {
    MAX: 200,
  },
  COMMENT_CONTENT: {
    MAX: 1000,
  },
};


/**
 * Application Constants - Enhanced with OTP settings
 */

// Password Reset OTP
export const OTP_CONFIG = {
  LENGTH: 4,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
};


// TODOS
export const TODO_CONSTANTS = {
  MAX_TITLE_LENGTH: 200,
  MAX_NOTES_LENGTH: 2000,
  AUTO_GENERATE_LIMIT: 3,
  BULK_UPDATE_LIMIT: 100,
  PAGINATION_LIMIT: 50,
  STATUS: {
    PENDING: 'pending',
    DONE: 'done'
  }
};