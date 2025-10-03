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

    const blogs = await Blog.find(query)
      .select(
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
    { text: "Two Sum", link: "https://leetcode.com/problems/two-sum/" },
    {
      text: "Reverse a Linked List",
      link: "https://leetcode.com/problems/reverse-linked-list/",
    },
    {
      text: "Binary Search",
      link: "https://leetcode.com/problems/binary-search/",
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
      })),
      tags: [],
      links: "",
      linksArray: [],
    });
  }
  return appData;
}

// ========== STATIC FILE ROUTES ==========

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve blog pages
app.get("/blogs", (req, res) => {
  res.sendFile(path.join(__dirname, "blogs.html"));
});

app.get("/blogs/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "blog-view.html"));
});

// Serve index.html for all other routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB connected ${process.env.MONGODB_URI}`);
});
