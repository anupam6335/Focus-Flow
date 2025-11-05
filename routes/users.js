/**
 * User Routes
 * Handles user profiles, social features, and user management
 */

import express from 'express';
import User from '../models/User.js';
import ChecklistData from '../models/ChecklistData.js';
import ActivityTracker from '../models/ActivityTracker.js';
import Blog from '../models/Blog.js';
import SocialLinks from '../models/SocialLinks.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();


/**
 * @route   GET /api/users/user-info
 * @desc    Get comprehensive user info for authenticated user (includes email & isAdmin)
 * @access  Private
 */
router.get('/user-info', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;

  // Get user basic info with email and admin status
  const user = await User.findOne({ username: userId }).select('-password -__v');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Get checklist data
  const checklistData = await ChecklistData.findOne({ userId });

  // Calculate solved questions
  let solvedQuestions = 0;
  let totalQuestions = 0;
  let consistencyData = [];

  if (checklistData && checklistData.data) {
    consistencyData = checklistData.data.map((day) => ({
      day: day.day,
      date: day.date,
      completedQuestions: day.questions.filter((q) => q.completed).length,
      totalQuestions: day.questions.length,
      tags: day.tags || [],
      linksCount: day.linksArray ? day.linksArray.length : 0,
    }));

    solvedQuestions = checklistData.data.flatMap((day) =>
      day.questions.filter((q) => q.completed)
    ).length;

    totalQuestions = checklistData.data.flatMap(
      (day) => day.questions
    ).length;
  }

  // Get activity tracker stats
  const activityData = await ActivityTracker.findOne({ userId });

  // Get user's blogs info
  const userBlogs = await Blog.findByAuthor(userId, userId, 1, 5);

  // Get social links
  const socialLinks = await SocialLinks.findOne({ userId });

  const blogStats = {
    total: userBlogs.length,
    public: userBlogs.filter((blog) => blog.isPublic).length,
    private: userBlogs.filter((blog) => !blog.isPublic).length,
    totalLikes: userBlogs.reduce((sum, blog) => sum + (blog.likes || 0), 0),
    totalViews: userBlogs.reduce((sum, blog) => sum + (blog.views || 0), 0),
    mostPopularBlog: userBlogs.length > 0
      ? userBlogs.reduce((prev, current) =>
          prev.likes + prev.views > current.likes + current.views
            ? prev
            : current
        )
      : null,
  };

  // Compile complete user info
  const userInfo = {
    // Basic Info
    username: user.username,
    email: user.email, // NEW: Include email
    isAdmin: user.isAdmin || false, // NEW: Include admin status
    authProvider: user.authProvider,
    accountCreated: user.createdAt,
    joinDate: user.createdAt,
    lastActive: user.lastActive,
    isOnline: user.isOnline,

    // Consistency Map Data
    consistency: {
      solvedQuestions,
      totalQuestions,
      completionRate: totalQuestions > 0
        ? ((solvedQuestions / totalQuestions) * 100).toFixed(1)
        : 0,
      daysTracked: consistencyData.length,
      lastUpdated: checklistData ? checklistData.lastUpdated : null,
      version: checklistData ? checklistData.version : 1,
      dailyProgress: consistencyData,
    },

    // Activity Tracker Data
    activity: activityData
      ? {
          currentStreak: activityData.activityData.currentStreak || 0,
          totalSolved: activityData.activityData.totalSolved || 0,
          averageDaily: activityData.activityData.averageDaily || 0,
          maxStreak: activityData.activityData.maxStreak || 0,
          heatmapData: activityData.activityData.heatmapData || {},
          activityHistory: activityData.activityData.activityHistory || [],
          lastUpdated: activityData.lastUpdated,
        }
      : {
          currentStreak: 0,
          totalSolved: 0,
          averageDaily: 0,
          maxStreak: 0,
          heatmapData: {},
          activityHistory: [],
          lastUpdated: null,
        },

    // Blog Platform Data
    blogs: {
      stats: blogStats,
      recentBlogs: userBlogs.slice(0, 5).map((blog) => ({
        title: blog.title,
        slug: blog.slug,
        isPublic: blog.isPublic,
        tags: blog.tags,
        likes: blog.likes,
        views: blog.views,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
      })),
    },

    // Social Links Data - NEW: Include social links
    socialLinks: socialLinks ? socialLinks.links : {
      linkedin: '',
      github: '',
      leetcode: '',
      gfg: '',
    },

    // Follow data
    social: {
      followingCount: user.following ? user.following.length : 0,
    },

    // Overall Statistics
    statistics: {
      totalProblemsSolved: solvedQuestions,
      totalBlogsPublished: blogStats.total,
      totalBlogLikes: blogStats.totalLikes,
      totalBlogViews: blogStats.totalViews,
      currentStreak: activityData
        ? activityData.activityData.currentStreak
        : 0,
      maxStreak: activityData ? activityData.activityData.maxStreak : 0,
    },
  };

  res.json({
    success: true,
    user: userInfo,
  });
}));

/**
 * @route   GET /api/users/user-info/:username
 * @desc    Get public user info (works with or without authentication)
 * @access  Public
 */
router.get('/user-info/:username', optionalAuth, asyncHandler(async (req, res) => {
  const username = req.params.username;
  const isAuthenticated = !!req.user;
  const currentUser = req.user?.username;

  // Get user basic info (exclude sensitive fields for public access)
  const user = await User.findOne({ username }).select('-password -__v -email -readNotifications -notificationPreferences');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Get checklist data
  const checklistData = await ChecklistData.findOne({ userId: username });

  // Calculate solved questions and prepare data
  let solvedQuestions = 0;
  let totalQuestions = 0;
  let consistencyData = [];
  let dailyQuestions = [];

  if (checklistData && checklistData.data) {
    consistencyData = checklistData.data.map((day) => {
      const completedQuestions = day.questions.filter((q) => q.completed);
      return {
        day: day.day,
        date: day.date,
        completedQuestions: completedQuestions.length,
        totalQuestions: day.questions.length,
        tags: day.tags || [],
        linksCount: day.linksArray ? day.linksArray.length : 0,
        questions: completedQuestions.map((q) => ({
          text: q.text,
          link: q.link,
          completed: true,
        })),
      };
    });

    solvedQuestions = checklistData.data.flatMap((day) =>
      day.questions.filter((q) => q.completed)
    ).length;

    totalQuestions = checklistData.data.flatMap(
      (day) => day.questions
    ).length;

    dailyQuestions = checklistData.data.map((day) => ({
      day: day.day,
      date: day.date,
      completedQuestions: day.questions.filter((q) => q.completed).length,
      totalQuestions: day.questions.length,
      questions: day.questions
        .filter((q) => q.completed)
        .map((q) => ({
          text: q.text,
          link: q.link,
          completed: true,
        })),
    }));
  }

  // Get activity tracker stats
  const activityData = await ActivityTracker.findOne({ userId: username });

  // Get user's blogs info (only public blogs for public access)
  const blogQuery = { author: username, isPublic: true };
  const userBlogs = await Blog.find(blogQuery)
    .select('title slug isPublic tags likes views createdAt updatedAt')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get social links for public profile
  const socialLinks = await SocialLinks.findOne({ userId: username });

  const blogStats = {
    total: userBlogs.length,
    public: userBlogs.filter((blog) => blog.isPublic).length,
    private: 0, // Don't show private blogs for public access
    totalLikes: userBlogs.reduce((sum, blog) => sum + (blog.likes || 0), 0),
    totalViews: userBlogs.reduce((sum, blog) => sum + (blog.views || 0), 0),
    mostPopularBlog: userBlogs.length > 0
      ? userBlogs.reduce((prev, current) =>
          prev.likes + prev.views > current.likes + current.views
            ? prev
            : current
        )
      : null,
  };

  // Compile user info (public data only for non-authenticated users)
  const userInfo = {
    username: user.username,
    authProvider: user.authProvider,
    accountCreated: user.createdAt,
    joinDate: user.createdAt,
    lastActive: user.lastActive,
    isOnline: user.isOnline,

    // Only show email to authenticated users (for their own profile or if allowed)
    email: (isAuthenticated && (currentUser === username || user.isEmailPublic)) ? user.email : undefined,

    consistency: {
      solvedQuestions,
      totalQuestions,
      completionRate: totalQuestions > 0
        ? ((solvedQuestions / totalQuestions) * 100).toFixed(1)
        : 0,
      daysTracked: consistencyData.length,
      lastUpdated: checklistData ? checklistData.lastUpdated : null,
      version: checklistData ? checklistData.version : 1,
      dailyProgress: consistencyData,
    },

    questions: {
      dailyProgress: dailyQuestions,
      totalSolved: solvedQuestions,
      totalQuestions: totalQuestions,
    },

    activity: activityData
      ? {
          currentStreak: activityData.activityData.currentStreak || 0,
          totalSolved: activityData.activityData.totalSolved || 0,
          averageDaily: activityData.activityData.averageDaily || 0,
          maxStreak: activityData.activityData.maxStreak || 0,
          heatmapData: activityData.activityData.heatmapData || {},
          activityHistory: activityData.activityData.activityHistory || [],
          lastUpdated: activityData.lastUpdated,
        }
      : {
          currentStreak: 0,
          totalSolved: 0,
          averageDaily: 0,
          maxStreak: 0,
          heatmapData: {},
          activityHistory: [],
          lastUpdated: null,
        },

    blogs: {
      stats: blogStats,
      recentBlogs: userBlogs.map((blog) => ({
        title: blog.title,
        slug: blog.slug,
        isPublic: blog.isPublic,
        tags: blog.tags,
        likes: blog.likes,
        views: blog.views,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
      })),
    },

    // Social Links for public profile
    socialLinks: socialLinks ? socialLinks.links : {
      linkedin: '',
      github: '',
      leetcode: '',
      gfg: '',
    },

    statistics: {
      totalProblemsSolved: solvedQuestions,
      totalBlogsPublished: blogStats.total,
      totalBlogLikes: blogStats.totalLikes,
      totalBlogViews: blogStats.totalViews,
      currentStreak: activityData
        ? activityData.activityData.currentStreak
        : 0,
      maxStreak: activityData ? activityData.activityData.maxStreak : 0,
    },

    accessLevel: isAuthenticated ? 'authenticated' : 'public',
    social: {
      followingCount: user.following ? user.following.length : 0,
    },
  };

  res.json({
    success: true,
    user: userInfo,
    accessLevel: isAuthenticated ? 'authenticated' : 'public',
  });
}));

/**
 * @route   GET /api/users
 * @desc    Get all users with basic stats (includes email & isAdmin for admins)
 * @access  Private
 */
router.get('/users', authenticateToken, asyncHandler(async (req, res) => {
  const currentUser = await User.findOne({ username: req.user.username });
  const isAdmin = currentUser && currentUser.isAdmin;

  // For admins, include email and admin status; for regular users, exclude sensitive data
  const projection = isAdmin 
    ? '-password -__v' 
    : '-password -__v -email -readNotifications -notificationPreferences';

  const users = await User.find({}).select(projection);
  
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const checklistData = await ChecklistData.findOne({
        userId: user.username,
      });
      const activityData = await ActivityTracker.findOne({
        userId: user.username,
      });
      const blogCount = await Blog.countDocuments({ author: user.username });
      const socialLinks = await SocialLinks.findOne({ userId: user.username });

      const userData = {
        username: user.username,
        authProvider: user.authProvider,
        accountCreated: user.createdAt,
        lastActive: user.lastActive,
        isOnline: user.isOnline,
        totalSolved: checklistData
          ? checklistData.data.flatMap((day) =>
              day.questions.filter((q) => q.completed)
            ).length
          : 0,
        totalBlogs: blogCount,
        currentStreak: activityData
          ? activityData.activityData.currentStreak
          : 0,
        maxStreak: activityData ? activityData.activityData.maxStreak : 0,
        followingCount: user.following ? user.following.length : 0,
        socialLinks: socialLinks ? socialLinks.links : null,
      };

      // Only include email and isAdmin for admins
      if (isAdmin) {
        userData.email = user.email;
        userData.isAdmin = user.isAdmin;
      }

      return userData;
    })
  );

  res.json({
    success: true,
    users: usersWithStats,
    // Include admin status in response for frontend to adjust UI
    isAdmin: isAdmin || false,
  });
}));

/**
 * @route   GET /api/users/profile/:username
 * @desc    Get minimal public profile for user cards/search results
 * @access  Public
 */
router.get('/profile/:username', asyncHandler(async (req, res) => {
  const username = req.params.username;

  const user = await User.findOne({ username })
    .select('username authProvider createdAt lastActive isOnline isAdmin')
    .lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Get basic stats
  const [checklistData, blogCount, socialLinks] = await Promise.all([
    ChecklistData.findOne({ userId: username }),
    Blog.countDocuments({ author: username, isPublic: true }),
    SocialLinks.findOne({ userId: username })
  ]);

  const solvedQuestions = checklistData
    ? checklistData.data.flatMap((day) =>
        day.questions.filter((q) => q.completed)
      ).length
    : 0;

  const profile = {
    username: user.username,
    authProvider: user.authProvider,
    accountCreated: user.createdAt,
    lastActive: user.lastActive,
    isOnline: user.isOnline,
    stats: {
      solvedQuestions,
      blogCount,
      followingCount: user.following ? user.following.length : 0,
    },
    socialLinks: socialLinks ? socialLinks.links : null
  };

  res.json({
    success: true,
    profile
  });
}));


/**
 * @route   GET /api/users/debug-current-user
 * @desc    Debug route to check who the current authenticated user is
 * @access  Private
 */
router.get('/debug-current-user', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    debug: {
      tokenUser: req.user.username, // This should be testuser3
      tokenUserId: req.user._id,
      authProvider: req.user.authProvider,
      email: req.user.email,
      isAdmin: req.user.isAdmin
    },
    message: 'If tokenUser is not testuser3, there is an authentication issue'
  });
}));

export default router;