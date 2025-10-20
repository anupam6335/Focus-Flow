const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const checklistDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  data: { type: Array, required: true },
  lastUpdated: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }, // Add version for conflict resolution
});

// const questionSchema = new mongoose.Schema({
//   text: { type: String, required: true },
//   link: { type: String, default: "" },
//   completed: { type: Boolean, default: false },
//   difficulty: {
//     type: String,
//     enum: ["Easy", "Medium", "Hard"],
//     default: "Medium",
//   },
// });

// Add activity tracker schema
const activityTrackerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  activityData: {
    currentStreak: { type: Number, default: 0 },
    totalSolved: { type: Number, default: 0 },
    averageDaily: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    heatmapData: { type: Object, default: {} },
    activityHistory: { type: Array, default: [] },
  },
  lastUpdated: { type: Date, default: Date.now },
});

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema({
  username: { type: String, required: true },
  resetCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  isPublic: { type: Boolean, default: true },
  tags: [{ type: String }],
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }], // Array of usernames who liked the blog
  views: { type: Number, default: 0 }, // Add views count
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const ChecklistData = mongoose.model("ChecklistData", checklistDataSchema);
const ActivityTracker = mongoose.model(
  "ActivityTracker",
  activityTrackerSchema
);

// Social Links Schema
const socialLinksSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  links: {
    linkedin: { type: String, default: "" },
    github: { type: String, default: "" },
    leetcode: { type: String, default: "" },
    gfg: { type: String, default: "" },
  },
  lastUpdated: { type: Date, default: Date.now },
});

const SocialLinks = mongoose.model("SocialLinks", socialLinksSchema);
const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
const Blog = mongoose.model("Blog", blogSchema);

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: "Invalid token" });
  }
};

// ========== API ROUTES ==========

// User registration
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Username and password required" });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Username must be at least 3 characters long",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 4 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      password: hashedPassword,
      createdAt: new Date(), // Explicitly set creation timestamp
    });

    await user.save();

    // Create default data for new user
    const defaultData = generateDefaultData();
    await ChecklistData.create({
      userId: username,
      data: defaultData,
      version: 1,
    });

    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// User login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Username and password required" });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid username or password" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid username or password" });
    }

    // Generate token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "230d",
    });

    res.json({
      success: true,
      token,
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify token
app.get("/api/verify-token", authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user.username });
});

// Get comprehensive user info (non-sensitive data only)
// Get comprehensive user info (non-sensitive data only)
app.get("/api/user-info", authenticateToken, async (req, res) => {
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

// Add to server.js - New endpoint to get all users
app.get("/api/users", authenticateToken, async (req, res) => {
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
app.get("/api/user-info/:username", authenticateToken, async (req, res) => {
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

// Add to server.js - New endpoint for progress statistics
app.get("/api/progress-stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;

    // Get checklist data
    const checklistData = await ChecklistData.findOne({ userId });

    if (!checklistData || !checklistData.data) {
      return res.json({
        success: true,
        stats: {
          total: 0,
          easy: 0,
          medium: 0,
          hard: 0,
        },
      });
    }

    // Calculate solved counts by difficulty
    const stats = {
      total: 0,
      easy: 0,
      medium: 0,
      hard: 0,
    };

    checklistData.data.forEach((day) => {
      if (day.questions && Array.isArray(day.questions)) {
        day.questions.forEach((question) => {
          if (question.completed) {
            stats.total++;
            const difficulty = (question.difficulty || "medium").toLowerCase();
            if (stats[difficulty] !== undefined) {
              stats[difficulty]++;
            } else {
              stats.medium++; // Default to medium if invalid difficulty
            }
          }
        });
      }
    });

    // console.log(`Progress stats for ${userId}:`, stats);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching progress stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get progress stats for any user
app.get(
  "/api/progress-stats/:username",
  authenticateToken,
  async (req, res) => {
    try {
      const username = req.params.username;

      // Get checklist data
      const checklistData = await ChecklistData.findOne({ userId: username });

      if (!checklistData || !checklistData.data) {
        return res.json({
          success: true,
          stats: {
            total: 0,
            easy: 0,
            medium: 0,
            hard: 0,
          },
        });
      }

      // Calculate solved counts by difficulty
      const stats = {
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
      };

      checklistData.data.forEach((day) => {
        if (day.questions && Array.isArray(day.questions)) {
          day.questions.forEach((question) => {
            if (question.completed) {
              stats.total++;
              const difficulty = (
                question.difficulty || "medium"
              ).toLowerCase();
              if (stats[difficulty] !== undefined) {
                stats[difficulty]++;
              } else {
                stats.medium++; // Default to medium if invalid difficulty
              }
            }
          });
        }
      });

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Error fetching progress stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
// Get user data (protected route) - UPDATED with version
app.get("/api/data", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    let data = await ChecklistData.findOne({ userId });

    if (!data) {
      const defaultData = generateDefaultData();
      data = await ChecklistData.create({
        userId,
        data: defaultData,
        version: 1,
      });
    } else {
      // Ensure backward compatibility for existing data
      data.data = ensureDifficultyField(data.data);
    }

    res.json({
      success: true,
      data: data.data,
      version: data.version,
      lastUpdated: data.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save user data (protected route) - UPDATED with intelligent conflict resolution
app.post("/api/data", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    const { data, clientVersion, lastUpdated } = req.body;

    if (!data) {
      return res
        .status(400)
        .json({ success: false, error: "Data is required" });
    }

    // Get current data from database
    const currentData = await ChecklistData.findOne({ userId });

    if (!currentData) {
      // Create new record if it doesn't exist
      const newData = await ChecklistData.create({
        userId,
        data,
        version: 1,
        lastUpdated: new Date(),
      });
      return res.json({
        success: true,
        data: newData.data,
        version: newData.version,
        lastUpdated: newData.lastUpdated,
      });
    }

    // INTELLIGENT CONFLICT RESOLUTION - FIXED
    if (clientVersion && lastUpdated) {
      const clientLastUpdated = new Date(lastUpdated);
      const serverLastUpdated = new Date(currentData.lastUpdated);

      // Only treat as conflict if server data is significantly newer (more than 2 seconds)
      // This prevents false conflicts during rapid sequential updates
      const timeDiff =
        serverLastUpdated.getTime() - clientLastUpdated.getTime();

      if (timeDiff > 2000 && clientVersion < currentData.version) {
        // 2-second grace period
        // console.log(
        //   `🔄 Conflict detected for user ${userId}. Time difference: ${timeDiff}ms`
        // );

        // Auto-merge strategy: Check if changes are compatible
        if (areChangesCompatible(currentData.data, data)) {
          // console.log("✅ Changes are compatible, auto-merging...");
          // Merge changes intelligently
          const mergedData = mergeDataIntelligently(currentData.data, data);
          currentData.data = mergedData;
        } else {
          // Return conflict only for incompatible changes
          return res.status(409).json({
            success: false,
            error: "CONFLICT: Significant changes detected",
            serverData: currentData.data,
            serverVersion: currentData.version,
            serverLastUpdated: currentData.lastUpdated,
            requiresUserResolution: true,
            message: "Significant changes detected. Please review and resolve.",
          });
        }
      } else if (timeDiff > 0) {
        // Small time difference, prefer client data (likely rapid sequential updates)
        // console.log("🔄 Minor time difference, accepting client changes");
        currentData.data = data;
      } else {
        // Client has newer or equal data, accept it
        currentData.data = data;
      }
    } else {
      // No version info, accept client data
      currentData.data = data;
    }

    // Update version and timestamp
    currentData.version = (currentData.version || 1) + 1;
    currentData.lastUpdated = new Date();

    await currentData.save();

    res.json({
      success: true,
      data: currentData.data,
      version: currentData.version,
      lastUpdated: currentData.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force sync endpoint - gets latest data from server without conflict checks
app.post("/api/force-sync", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    const data = await ChecklistData.findOne({ userId });

    if (!data) {
      return res.status(404).json({ success: false, error: "Data not found" });
    }

    res.json({
      success: true,
      data: data.data,
      version: data.version,
      lastUpdated: data.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get activity tracker data
app.get("/api/activity-tracker", authenticateToken, async (req, res) => {
  try {
    // console.log("📥 Received activity tracker data GET request");
    // console.log("📥 User:", req.user.username);

    const userId = req.user.username;
    let activityData = await ActivityTracker.findOne({ userId });

    if (!activityData) {
      // console.log("🆕 Creating new activity tracker for user:", userId);
      // Create default activity data
      activityData = await ActivityTracker.create({
        userId,
        activityData: {
          currentStreak: 0,
          totalSolved: 0,
          averageDaily: 0,
          maxStreak: 0,
          heatmapData: {},
          activityHistory: [],
        },
      });
    } else {
      // console.log("📋 Found existing activity tracker for user:", userId);
    }

    res.json({
      success: true,
      activityData: activityData.activityData,
    });
  } catch (error) {
    console.error("❌ Error getting activity tracker data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save activity tracker data - WITH DEBUGGING
app.post("/api/activity-tracker", authenticateToken, async (req, res) => {
  try {
    // console.log("📥 Received activity tracker data save request");
    // console.log("📥 User:", req.user.username);
    // console.log("📥 Data received:", req.body.activityData);

    const userId = req.user.username;
    const { activityData } = req.body;

    if (!activityData) {
      // console.log("❌ No activity data provided");
      return res
        .status(400)
        .json({ success: false, error: "Activity data is required" });
    }

    let tracker = await ActivityTracker.findOne({ userId });

    if (!tracker) {
      // console.log("🆕 Creating new activity tracker for user:", userId);
      tracker = new ActivityTracker({ userId });
    } else {
      // console.log("📝 Updating existing activity tracker for user:", userId);
    }

    tracker.activityData = activityData;
    tracker.lastUpdated = new Date();

    await tracker.save();

    res.json({
      success: true,
      message: "Activity data saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving activity tracker data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forgot Password - Send Reset Code
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res
        .status(400)
        .json({ success: false, error: "Username is required" });
    }

    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      // Return success even if user doesn't exist for security
      return res.json({
        success: true,
        message: "If the username exists, a reset code has been sent",
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing reset codes for this user
    await PasswordReset.deleteMany({ username });

    // Create new reset code
    await PasswordReset.create({
      username,
      resetCode,
      expiresAt,
    });

    // console.log(`Password reset code for ${username}: ${resetCode}`);

    res.json({
      success: true,
      message: "If the username exists, a reset code has been sent",
      demoCode: resetCode, // Remove this in production
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to process request" });
  }
});

// Reset Password with Code
app.post("/api/reset-password", async (req, res) => {
  try {
    const { username, resetCode, newPassword } = req.body;

    if (!username || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Username, reset code, and new password are required",
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 4 characters long",
      });
    }

    // Find valid reset code
    const resetRecord = await PasswordReset.findOne({
      username,
      resetCode,
      expiresAt: { $gt: new Date() },
      used: false,
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset code",
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, error: "User not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Mark reset code as used
    resetRecord.used = true;
    await resetRecord.save();

    // Delete all reset codes for this user
    await PasswordReset.deleteMany({ username });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

// Cleanup expired reset codes (optional - can be run as cron job)
app.post("/api/cleanup-reset-codes", async (req, res) => {
  try {
    const result = await PasswordReset.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get social links
app.get("/api/social-links", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    let socialLinks = await SocialLinks.findOne({ userId });

    if (!socialLinks) {
      // Create default empty social links
      socialLinks = await SocialLinks.create({
        userId,
        links: {
          linkedin: "",
          github: "",
          leetcode: "",
          gfg: "",
        },
      });
    }

    res.json({
      success: true,
      socialLinks: socialLinks.links,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update social links
app.put("/api/social-links", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    const { links } = req.body;

    if (!links) {
      return res
        .status(400)
        .json({ success: false, error: "Links data is required" });
    }

    let socialLinks = await SocialLinks.findOne({ userId });

    if (!socialLinks) {
      socialLinks = new SocialLinks({ userId });
    }

    // Update only the provided links
    socialLinks.links = {
      ...socialLinks.links,
      ...links,
    };
    socialLinks.lastUpdated = new Date();

    await socialLinks.save();

    res.json({
      success: true,
      socialLinks: socialLinks.links,
      message: "Social links updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get social links for any user (public data)
app.get("/api/social-links/:username", authenticateToken, async (req, res) => {
  try {
    const username = req.params.username;

    let socialLinks = await SocialLinks.findOne({ userId: username });

    if (!socialLinks) {
      // Return default empty social links
      socialLinks = {
        links: {
          linkedin: "",
          github: "",
          leetcode: "",
          gfg: "",
        },
      };
    }

    res.json({
      success: true,
      socialLinks: socialLinks.links,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== BLOG API ROUTES ==========
// Get all public blogs (for "All Blogs" tab)
// Track blog views - ADD THIS ROUTE
app.post("/api/blogs/:slug/view", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Increment view count
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.json({
      success: true,
      views: blog.views,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get popular blogs based on popularity score (likes + views) - MOVED HERE
app.get("/api/blogs/popular", authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    let query = { isPublic: true };

    // If user is authenticated, also show their private blogs
    if (req.user) {
      query = {
        $or: [
          { isPublic: true },
          { author: req.user.username, isPublic: false },
        ],
      };
    }

    const blogs = await Blog.find(query).select(
      "title slug author isPublic tags likes likedBy views createdAt updatedAt content"
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
  } catch (error) {
    console.error("Error in popular blogs route:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all public blogs (for "All Blogs" tab) - UPDATED to include views
app.get("/api/blogs/all", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Only show public blogs for "All Blogs"
    const query = { isPublic: true };

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title slug author isPublic tags createdAt updatedAt content likes likedBy views" // ADD views here
      );

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's blogs (for "My Blogs" tab) - UPDATED to include views
app.get("/api/blogs/my", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Show all blogs by the current user (both public and private)
    const query = { author: req.user.username };

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title slug author isPublic tags createdAt updatedAt content likes likedBy views" // ADD views here
      );

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Keep the existing /api/blogs route for backward compatibility - UPDATED to include views
app.get("/api/blogs", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, author } = req.query;
    const skip = (page - 1) * limit;

    let query = { isPublic: true };

    // If user is authenticated, also show their private blogs
    if (req.user) {
      query = {
        $or: [
          { isPublic: true },
          { author: req.user.username, isPublic: false },
        ],
      };
    }

    // Filter by author if specified
    if (author) {
      query.author = author;
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title slug author isPublic tags createdAt updatedAt content likes likedBy views" // ADD views here
      );

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single blog by slug - UPDATED to include views
app.get("/api/blogs/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Check if user can access private blog
    if (!blog.isPublic) {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded.username !== blog.author) {
            return res
              .status(403)
              .json({ success: false, error: "Access denied" });
          }
        } catch (error) {
          return res
            .status(403)
            .json({ success: false, error: "Access denied" });
        }
      } else {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    }

    res.json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Create new blog (protected)
app.post("/api/blogs", authenticateToken, async (req, res) => {
  try {
    const { title, content, isPublic = true, tags = [] } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, error: "Title and content are required" });
    }

    // Generate slug from title
    const slug = generateSlug(title);

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res
        .status(400)
        .json({ success: false, error: "Blog with this title already exists" });
    }

    const blog = new Blog({
      title,
      slug,
      content,
      author: req.user.username,
      isPublic,
      tags,
    });

    await blog.save();

    res.status(201).json({
      success: true,
      blog: {
        ...blog.toObject(),
        id: blog._id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update blog (protected - author only)
app.put("/api/blogs/:slug", authenticateToken, async (req, res) => {
  try {
    const { title, content, isPublic, tags } = req.body;
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Check if user is the author
    if (blog.author !== req.user.username) {
      return res.status(403).json({ success: false, error: "Access denied" });
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
    blog.updatedAt = new Date();

    await blog.save();

    res.json({
      success: true,
      blog: {
        ...blog.toObject(),
        id: blog._id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete blog (protected - author only)
app.delete("/api/blogs/:slug", authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Check if user is the author
    if (blog.author !== req.user.username) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    await Blog.deleteOne({ slug: req.params.slug });

    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's blogs (protected)
app.get("/api/my-blogs", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ author: req.user.username })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("title slug author isPublic tags createdAt updatedAt");

    const total = await Blog.countDocuments({ author: req.user.username });

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update like route with self-like restriction
app.post("/api/blogs/:slug/like", authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    const username = req.user.username;

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
    }

    await blog.save();

    res.json({
      success: true,
      likes: blog.likes,
      hasLiked: !hasLiked, // Return the new state
      message: hasLiked ? "Blog unliked" : "Blog liked",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper function to check if changes are compatible for auto-merge
function areChangesCompatible(serverData, clientData) {
  try {
    if (!Array.isArray(serverData) || !Array.isArray(clientData)) {
      return false;
    }
    if (Math.abs(serverData.length - clientData.length) > 3) {
      return false;
    }
    let compatibleChanges = true;
    const minLength = Math.min(serverData.length, clientData.length);
    for (let i = 0; i < minLength; i++) {
      const serverDay = serverData[i];
      const clientDay = clientData[i];
      if (serverDay.day !== clientDay.day) {
        compatibleChanges = false;
        break;
      }
      if (
        serverDay.questions.length !== clientDay.questions.length &&
        Math.abs(serverDay.questions.length - clientDay.questions.length) > 2
      ) {
        compatibleChanges = false;
        break;
      }
    }
    return compatibleChanges;
  } catch (error) {
    // console.log("Error checking compatibility:", error);
    return false;
  }
}

// Intelligent merge function
function mergeDataIntelligently(serverData, clientData) {
  try {
    const mergedData = JSON.parse(JSON.stringify(serverData));
    clientData.forEach((clientDay, index) => {
      if (index < mergedData.length) {
        const serverDay = mergedData[index];
        clientDay.questions.forEach((clientQuestion, qIndex) => {
          if (qIndex < serverDay.questions.length) {
            serverDay.questions[qIndex].completed = clientQuestion.completed;
          }
        });
        const mergedTags = [...serverDay.tags];
        clientDay.tags.forEach((clientTag) => {
          if (!mergedTags.some((tag) => tag.text === clientTag.text)) {
            mergedTags.push(clientTag);
          }
        });
        serverDay.tags = mergedTags;
        const mergedLinks = [...serverDay.linksArray];
        clientDay.linksArray.forEach((clientLink) => {
          if (!mergedLinks.some((link) => link.url === clientLink.url)) {
            mergedLinks.push(clientLink);
          }
        });
        serverDay.linksArray = mergedLinks;
      } else {
        mergedData.push(clientDay);
      }
    });
    return mergedData;
  } catch (error) {
    // console.log("Error during merge, using server data:", error);
    return serverData;
  }
}

function generateDefaultData() {
  const TOTAL_DAYS = 1;
  const DEFAULT_QUESTIONS = [
    {
      text: "Two Sum",
      link: "https://leetcode.com/problems/two-sum/",
      difficulty: "Easy",
    },
    {
      text: "Reverse a Linked List",
      link: "https://leetcode.com/problems/reverse-linked-list/",
      difficulty: "Medium",
    },
    {
      text: "Binary Search",
      link: "https://leetcode.com/problems/binary-search/",
      difficulty: "Medium",
    },
  ];

  const appData = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    appData.push({
      day: day,
      questions: DEFAULT_QUESTIONS.map((q) => ({
        text: q.text,
        link: q.link,
        completed: false,
        difficulty: q.difficulty, // Include difficulty in default data
      })),
      tags: [],
      links: "",
      linksArray: [],
    });
  }
  return appData;
}

// Backward compatibility: Ensure existing questions without difficulty get default value
function ensureDifficultyField(data) {
  if (!Array.isArray(data)) return data;

  return data.map((day) => ({
    ...day,
    questions: day.questions.map((question) => ({
      ...question,
      difficulty: question.difficulty || "Medium", // Default for existing questions
    })),
  }));
}

// ========== STATIC FILE ROUTES ==========
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "js")));
app.use(express.static(path.join(__dirname, "css")));
app.use(express.static(path.join(__dirname, "assets")));

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve blog pages
app.get("/blogs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blogs.html"));
});

// Route for the blog view
app.get("/blogs/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blog-view.html"));
});

// Serve profile pages
app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// Serve user profile pages (for future implementation)
app.get("/user/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-profile.html"));
});

// Serve index.html for all other routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB connected ${process.env.MONGODB_URI}`);
});
