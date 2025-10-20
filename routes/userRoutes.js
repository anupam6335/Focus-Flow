const express = require("express");
const User = require("../models/User");
const ChecklistData = require("../models/ChecklistData");
const ActivityTracker = require("../models/ActivityTracker");
const Blog = require("../models/Blog");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Get comprehensive user info (non-sensitive data only)
router.get("/user-info", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;

    // Get user basic info
    const user = await User.findOne({ username: userId }).select(
      "-password -__v"
    );
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get checklist data (Consistency Map)
    const checklistData = await ChecklistData.findOne({ userId });

    // Calculate solved questions from Consistency Map
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
    const userBlogs = await Blog.find({ author: userId })
      .select("title slug isPublic tags likes views createdAt updatedAt")
      .sort({ createdAt: -1 });

    const blogStats = {
      total: userBlogs.length,
      public: userBlogs.filter((blog) => blog.isPublic).length,
      private: userBlogs.filter((blog) => !blog.isPublic).length,
      totalLikes: userBlogs.reduce((sum, blog) => sum + (blog.likes || 0), 0),
      totalViews: userBlogs.reduce((sum, blog) => sum + (blog.views || 0), 0),
      mostPopularBlog:
        userBlogs.length > 0
          ? userBlogs.reduce((prev, current) =>
              prev.likes + prev.views > current.likes + current.views
                ? prev
                : current
            )
          : null,
    };

    // Compile COMPLETE user info (excluding sensitive data)
    const userInfo = {
      // Basic Info
      username: user.username,
      accountCreated: user.createdAt,
      joinDate: user.createdAt,

      // Consistency Map Data
      consistency: {
        solvedQuestions,
        totalQuestions,
        completionRate:
          totalQuestions > 0
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
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all users
router.get("/users", authenticateToken, async (req, res) => {
  try {
    // Get all users (excluding passwords)
    const users = await User.find({}).select("-password -__v");

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const checklistData = await ChecklistData.findOne({
          userId: user.username,
        });
        const activityData = await ActivityTracker.findOne({
          userId: user.username,
        });
        const blogCount = await Blog.countDocuments({ author: user.username });

        return {
          username: user.username,
          accountCreated: user.createdAt,
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
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific user's public data
router.get("/user-info/:username", authenticateToken, async (req, res) => {
  try {
    const username = req.params.username;

    // Get user basic info
    const user = await User.findOne({ username }).select("-password -__v");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get checklist data (Consistency Map)
    const checklistData = await ChecklistData.findOne({ userId: username });

    // Calculate solved questions from Consistency Map
    let solvedQuestions = 0;
    let totalQuestions = 0;
    let consistencyData = [];
    let dailyQuestions = []; // This will store the actual questions data

    if (checklistData && checklistData.data) {
      // Enhanced consistency data with actual questions
      consistencyData = checklistData.data.map((day) => {
        const completedQuestions = day.questions.filter((q) => q.completed);
        const dayData = {
          day: day.day,
          date: day.date,
          completedQuestions: completedQuestions.length,
          totalQuestions: day.questions.length,
          tags: day.tags || [],
          linksCount: day.linksArray ? day.linksArray.length : 0,
          // Store the actual completed questions for this day
          questions: completedQuestions.map((q) => ({
            text: q.text,
            link: q.link,
            completed: true,
          })),
        };
        return dayData;
      });

      solvedQuestions = checklistData.data.flatMap((day) =>
        day.questions.filter((q) => q.completed)
      ).length;
      totalQuestions = checklistData.data.flatMap(
        (day) => day.questions
      ).length;

      // Store all daily questions data for the question history
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

    // Get user's blogs info (only public blogs for other users)
    const userBlogs = await Blog.find({ author: username, isPublic: true })
      .select("title slug isPublic tags likes views createdAt updatedAt")
      .sort({ createdAt: -1 });

    const blogStats = {
      total: userBlogs.length,
      public: userBlogs.filter((blog) => blog.isPublic).length,
      private: 0, // Don't show private blogs for other users
      totalLikes: userBlogs.reduce((sum, blog) => sum + (blog.likes || 0), 0),
      totalViews: userBlogs.reduce((sum, blog) => sum + (blog.views || 0), 0),
      mostPopularBlog:
        userBlogs.length > 0
          ? userBlogs.reduce((prev, current) =>
              prev.likes + prev.views > current.likes + current.views
                ? prev
                : current
            )
          : null,
    };

    // Compile user info (public data only for other users)
    const userInfo = {
      // Basic Info
      username: user.username,
      accountCreated: user.createdAt,
      joinDate: user.createdAt,

      // Consistency Map Data
      consistency: {
        solvedQuestions,
        totalQuestions,
        completionRate:
          totalQuestions > 0
            ? ((solvedQuestions / totalQuestions) * 100).toFixed(1)
            : 0,
        daysTracked: consistencyData.length,
        lastUpdated: checklistData ? checklistData.lastUpdated : null,
        version: checklistData ? checklistData.version : 1,
        dailyProgress: consistencyData,
      },

      // Enhanced: Include the actual questions data for question history
      questions: {
        dailyProgress: dailyQuestions,
        totalSolved: solvedQuestions,
        totalQuestions: totalQuestions,
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

      // Blog Platform Data (only public blogs)
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
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;