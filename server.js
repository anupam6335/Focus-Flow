const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://focus-flow-lopn.onrender.com",
    methods: ["GET", "POST"],
  },
});

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
  email: { type: String, required: true, unique: true }, // NEW: Email field
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false }, // NEW: Email verification status
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

// Comment Schema
const commentSchema = new mongoose.Schema({
  blogSlug: { type: String, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // For nested replies
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  likedBy: [{ type: String }], // Users who liked
  dislikedBy: [{ type: String }], // Users who disliked
  reports: { type: Number, default: 0 },
  reportedBy: [{ type: String }], // Users who reported
  isEdited: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Blog stats schema for helpful/unhelpful tracking
const blogStatsSchema = new mongoose.Schema({
  blogSlug: { type: String, required: true, unique: true },
  totalLikes: { type: Number, default: 0 },
  totalDislikes: { type: Number, default: 0 },
  userVotes: {
    // Track individual user votes
    username: String,
    voteType: { type: String, enum: ["like", "dislike"], required: true },
  },
});

// User restrictions schema
const userRestrictionSchema = new mongoose.Schema({
  username: { type: String, required: true },
  blogSlug: { type: String, required: true },
  restrictedAt: { type: Date, default: Date.now },
  reason: { type: String, default: "Multiple reports" },
});

const Comment = mongoose.model("Comment", commentSchema);
const BlogStats = mongoose.model("BlogStats", blogStatsSchema);
const UserRestriction = mongoose.model(
  "UserRestriction",
  userRestrictionSchema
);

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

// Add email service configuration at the top (after other requires)
const nodemailer = require("nodemailer");

// Enhanced Email Configuration with Better Gmail Settings
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Additional settings for better reliability
  pool: true, // Use connection pooling
  maxConnections: 1,
  maxMessages: 10,
  rateDelta: 1000,
  rateLimit: 5,
});

// Enhanced email verification
emailTransporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email configuration error:", error.message);
  } else {
    console.log("✅ Email server is ready to send messages");
    console.log("📧 Using email:", process.env.EMAIL_USER);
  }
});

// Enhanced Socket.io connection handling with stable online status
const connectedUsers = new Map(); // Track connected users and their sockets

io.on("connection", async (socket) => {
  // Extract username from token
  const token = socket.handshake.auth.token;
  let username = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      username = decoded.username;

      if (username) {
        // Store user connection info
        connectedUsers.set(username, {
          socketId: socket.id,
          lastHeartbeat: new Date(),
          isOnline: true,
        });

        // Update user as online with timestamp
        await User.findOneAndUpdate(
          { username: username },
          {
            isOnline: true,
            lastActive: new Date(),
          }
        ).exec();

        // Broadcast online status to all clients
        socket.broadcast.emit("user-status-changed", {
          username: username,
          isOnline: true,
          lastActive: new Date(),
          type: "online",
        });
      }
    } catch (error) {
      console.log("Invalid token for socket connection");
    }
  }

  // Join blog room for real-time updates
  socket.on("join-blog", (blogSlug) => {
    socket.join(blogSlug);
  });

  // Leave blog room
  socket.on("leave-blog", (blogSlug) => {
    socket.leave(blogSlug);
  });

  // Enhanced Heartbeat with status maintenance
  socket.on("heartbeat", async () => {
    if (username) {
      const userInfo = connectedUsers.get(username);
      if (userInfo) {
        userInfo.lastHeartbeat = new Date();
        connectedUsers.set(username, userInfo);

        // Only update lastActive, maintain online status
        await User.findOneAndUpdate(
          { username: username },
          { lastActive: new Date() }
        ).exec();
      }
    }
  });

  // Handle graceful disconnect with delay
  socket.on("disconnect", async (reason) => {
    console.log("User disconnected:", socket.id, "Reason:", reason);

    // Update user as offline only after a delay for page refreshes/navigation
    if (username) {
      setTimeout(async () => {
        // Check if user reconnected in the meantime
        const currentUserInfo = connectedUsers.get(username);
        if (!currentUserInfo || currentUserInfo.socketId === socket.id) {
          // User didn't reconnect, mark as offline
          await User.findOneAndUpdate(
            { username: username },
            {
              isOnline: false,
              lastActive: new Date(),
            }
          ).exec();

          // Remove from connected users
          connectedUsers.delete(username);

          // Broadcast offline status to all clients
          socket.broadcast.emit("user-status-changed", {
            username: username,
            isOnline: false,
            lastActive: new Date(),
            type: "offline",
          });
        }
      }, 5000); // 5-second grace period for page refreshes
    }
  });

  // Force disconnect (for logout)
  socket.on("force-disconnect", async () => {
    if (username) {
      await User.findOneAndUpdate(
        { username: username },
        {
          isOnline: false,
          lastActive: new Date(),
        }
      ).exec();

      connectedUsers.delete(username);

      socket.broadcast.emit("user-status-changed", {
        username: username,
        isOnline: false,
        lastActive: new Date(),
        type: "offline",
      });
    }
  });
});

// Add periodic cleanup for stale connections
setInterval(() => {
  const now = new Date();
  const STALE_THRESHOLD = 30000; // 30 seconds

  connectedUsers.forEach(async (userInfo, username) => {
    if (now - userInfo.lastHeartbeat > STALE_THRESHOLD) {
      await User.findOneAndUpdate(
        { username: username },
        {
          isOnline: false,
          lastActive: new Date(),
        }
      ).exec();

      connectedUsers.delete(username);

      io.emit("user-status-changed", {
        username: username,
        isOnline: false,
        lastActive: new Date(),
        type: "timeout",
      });
    }
  });
}, 30000); // Check every 30 seconds
// ========== API ROUTES ==========

// User registration - UPDATED with email
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body; // NEW: Added email

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Username, email and password required",
      });
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          error: "Username already exists",
        });
      }
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          error: "Email already registered",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email, // NEW: Save email
      password: hashedPassword,
      createdAt: new Date(),
    });

    await user.save();

    // Create default data for new user
    const defaultData = generateDefaultData();
    await ChecklistData.create({
      userId: username,
      data: defaultData,
      version: 1,
    });

    // Send welcome email (optional)
    // Send enhanced welcome email (optional)
    try {
      await emailTransporter.sendMail({
        from: {
          name: "FocusFlow Team",
          address: process.env.EMAIL_USER,
        },
        to: email,
        subject: "🎉 Welcome to FocusFlow - Your Coding Journey Begins Here!",
        html: createWelcomeEmailTemplate(username),
      });
    } catch (emailError) {
      console.log("Welcome email failed to send:", emailError);
      // Don't fail registration if email fails
    }

    res.json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enhanced welcome email template
const createWelcomeEmailTemplate = (username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container { 
          background: white; 
          border-radius: 15px; 
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #58a6ff, #1f6feb);
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 { 
          margin: 0; 
          font-size: 2.5rem; 
          font-weight: 300;
        }
        .header p { 
          margin: 10px 0 0 0; 
          font-size: 1.2rem;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px; 
          background: #f8f9fa;
        }
        .welcome-message {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 25px;
          border-left: 4px solid #58a6ff;
        }
        .cta-section {
          text-align: center;
          margin: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #58a6ff, #1f6feb);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          font-size: 1.1rem;
          transition: transform 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 25px 0;
        }
        .feature {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e1e4e8;
        }
        .feature-icon {
          font-size: 2rem;
          margin-bottom: 10px;
        }
        .inspiration {
          background: linear-gradient(135deg, #fff3cd, #ffeaa7);
          padding: 25px;
          border-radius: 10px;
          margin: 25px 0;
          text-align: center;
          border-left: 4px solid #f0c33c;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          padding-top: 20px; 
          border-top: 1px solid #ddd; 
          font-size: 0.9rem; 
          color: #666; 
        }
        .heart { color: #e25555; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to FocusFlow!</h1>
          <p>Your coding journey begins here</p>
        </div>
        
        <div class="content">
          <div class="welcome-message">
            <h2>Hello <strong>${username}</strong>! 👋</h2>
            <p>We're absolutely thrilled to welcome you to the <strong>FocusFlow</strong> community! This is more than just an app – it's your personal companion on the incredible journey of mastering Data Structures and Algorithms.</p>
            
            <p>Remember, every expert was once a beginner. Your decision to start this journey today is the first step toward becoming the developer you aspire to be. 🚀</p>
          </div>

          <div class="inspiration">
            <h3>🌟 Words to Code By</h3>
            <p><em>"The beautiful thing about learning is that no one can take it away from you."</em></p>
            <p>Every problem you solve, every concept you master – it all adds up. You've got this! 💪</p>
          </div>

          <div class="features">
            <div class="feature">
              <div class="feature-icon">📈</div>
              <h4>Track Progress</h4>
              <p>Watch your skills grow day by day</p>
            </div>
            <div class="feature">
              <div class="feature-icon">🔥</div>
              <h4>Build Streaks</h4>
              <p>Stay consistent and motivated</p>
            </div>
            <div class="feature">
              <div class="feature-icon">📊</div>
              <h4>Visual Analytics</h4>
              <p>See your improvement in real-time</p>
            </div>
            <div class="feature">
              <div class="feature-icon">👥</div>
              <h4>Join Community</h4>
              <p>You're not alone in this journey</p>
            </div>
          </div>

          <div class="cta-section">
            <p>Ready to start your coding adventure?</p>
            <a href="https://focus-flow-lopn.onrender.com" class="cta-button">Start Your Journey Now</a>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p><strong>Your first mission:</strong> Complete Day 1 and set the tone for your success! 🎯</p>
          </div>
        </div>

        <div class="footer">
          <p>With love and support, <span class="heart">❤️</span></p>
          <p><strong>The FocusFlow Team</strong></p>
          <p>P.S. Remember, consistency beats intensity. One problem a day keeps Imposter Syndrome away! 😊</p>
          <p>&copy; 2024 FocusFlow. Empowering developers, one commit at a time.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

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

// Update the user-info endpoint to handle both authenticated and public access
app.get("/api/user-info/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    let isAuthenticated = false;
    let currentUser = null;

    // Verify token if provided, but don't require it
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findOne({ username: decoded.username });
        if (user) {
          isAuthenticated = true;
          currentUser = user;
        }
      } catch (error) {
        // Token is invalid, but we still allow public access
        console.log("Invalid token, proceeding with public access");
      }
    }

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
    let dailyQuestions = [];

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

    // Get user's blogs info (only public blogs for public access)
    const blogQuery = { author: username, isPublic: true };
    const userBlogs = await Blog.find(blogQuery)
      .select("title slug isPublic tags likes views createdAt updatedAt")
      .sort({ createdAt: -1 });

    const blogStats = {
      total: userBlogs.length,
      public: userBlogs.filter((blog) => blog.isPublic).length,
      private: 0, // Don't show private blogs for public access
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

    // Compile user info (public data only for non-authenticated users)
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

      // Add access level info
      accessLevel: isAuthenticated ? "authenticated" : "public",
    };

    res.json({
      success: true,
      user: userInfo,
      accessLevel: isAuthenticated ? "authenticated" : "public",
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

// Update progress stats to work without authentication
app.get("/api/progress-stats/:username", async (req, res) => {
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

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching progress stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
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

// Forgot Password - UPDATED to accept username OR email
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { userInput } = req.body; // Changed from username to userInput

    if (!userInput) {
      return res.status(400).json({
        success: false,
        error: "Username or email is required",
      });
    }

    // Check if user exists by username OR email
    const user = await User.findOne({
      $or: [{ username: userInput }, { email: userInput }],
    });

    if (!user) {
      // Return success even if user doesn't exist for security
      return res.json({
        success: true,
        message: "If the username/email exists, a reset code has been sent",
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing reset codes for this user
    await PasswordReset.deleteMany({ username: user.username });

    // Create new reset code
    await PasswordReset.create({
      username: user.username, // Always store by username
      resetCode,
      expiresAt,
    });

    // Create enhanced email content
    const mailOptions = {
      from: {
        name: "FocusFlow Security",
        address: process.env.EMAIL_USER,
      },
      to: user.email,
      subject: "🔐 FocusFlow Password Reset - Your Security Code Inside",
      html: createResetEmailTemplate(user.username, resetCode),
      text: `FocusFlow Password Reset\n\nHello ${user.username},\n\nWe received a password reset request for your FocusFlow account.\n\nYour reset code is: ${resetCode}\n\nThis code expires in 15 minutes for security reasons.\n\nIf you didn't request this reset, please ignore this email - your account remains secure.\n\nBest regards,\nThe FocusFlow Security Team`,
    };

    // Send email with detailed error handling
    try {
      const emailResponse = await emailTransporter.sendMail(mailOptions);

      // Success response
      // In the forgot password endpoint, update the success response:
      res.json({
        success: true,
        message: "A reset code has been sent to your email",
        emailSent: true,
        username: user.username, // ADD THIS LINE - return the actual username
        demoCode:
          process.env.NODE_ENV === "development" ? resetCode : undefined,
      });
    } catch (emailError) {
      console.error("❌ EMAIL SENDING FAILED:", emailError);

      // Still return success but indicate email failed
      res.json({
        success: true,
        message: "Reset code generated",
        emailSent: false,
        demoCode: resetCode, // Always return the code
        error: "Email delivery failed - using demo mode",
      });
    }
  } catch (error) {
    console.error("💥 FORGOT PASSWORD ERROR:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Enhanced password reset email template
const createResetEmailTemplate = (username, resetCode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background: #f5f5f5;
        }
        .container { 
          background: white; 
          border-radius: 12px; 
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .header { 
          background: linear-gradient(135deg, #58a6ff, #1f6feb);
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 { 
          margin: 0; 
          font-size: 2rem; 
          font-weight: 300;
        }
        .content { 
          padding: 35px 30px; 
        }
        .security-notice {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #f0c33c;
        }
        .code-container {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 25px;
          text-align: center;
          margin: 25px 0;
          border-radius: 10px;
          border: 2px dashed #58a6ff;
        }
        .reset-code {
          font-size: 2.5rem;
          font-weight: bold;
          letter-spacing: 8px;
          color: #1f6feb;
          font-family: 'Courier New', monospace;
          margin: 15px 0;
        }
        .instructions {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .steps {
          margin: 20px 0;
        }
        .step {
          display: flex;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        .step-number {
          background: #58a6ff;
          color: white;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .support-section {
          text-align: center;
          margin: 30px 0 20px 0;
          padding: 20px;
          background: #e7f3ff;
          border-radius: 8px;
        }
        .footer { 
          text-align: center; 
          margin-top: 25px; 
          padding-top: 20px; 
          border-top: 1px solid #e1e4e8; 
          font-size: 0.85rem; 
          color: #666; 
        }
        .urgency {
          color: #d73a49;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
          <p>FocusFlow Account Security</p>
        </div>
        
        <div class="content">
          <h2>Hello ${username},</h2>
          <p>We received a request to reset your FocusFlow account password. No worries – we're here to help you get back on track with your coding journey!</p>

          <div class="security-notice">
            <h3>🛡️ Security Notice</h3>
            <p>For your protection, please verify that you initiated this request. If you didn't request a password reset, you can safely ignore this email – your account remains secure.</p>
          </div>

          <div class="code-container">
            <h3 style="margin-top: 0; color: #1f6feb;">Your Reset Code</h3>
            <div class="reset-code">${resetCode}</div>
            <p style="margin: 10px 0 0 0; font-size: 0.9rem; color: #666;">
              Expires in <span class="urgency">15 minutes</span>
            </p>
          </div>

          <div class="instructions">
            <h3>📝 How to Reset Your Password</h3>
            <div class="steps">
              <div class="step">
                <div class="step-number">1</div>
                <div>Return to FocusFlow and navigate to the password reset page</div>
              </div>
              <div class="step">
                <div class="step-number">2</div>
                <div>Enter your username: <strong>${username}</strong></div>
              </div>
              <div class="step">
                <div class="step-number">3</div>
                <div>Enter the reset code above</div>
              </div>
              <div class="step">
                <div class="step-number">4</div>
                <div>Create your new password and you're all set!</div>
              </div>
            </div>
          </div>

          <div class="support-section">
            <h3>❓ Need Help?</h3>
            <p>If you're having trouble or have any questions, our support team is here to help. Just reply to this email and we'll assist you promptly.</p>
          </div>

          <p style="text-align: center; margin: 25px 0;">
            <strong>We're excited to have you continue your coding journey with us! 🚀</strong>
          </p>
        </div>

        <div class="footer">
          <p><strong>Best regards,</strong></p>
          <p><strong>The FocusFlow Security Team</strong></p>
          <p>&copy; 2024 FocusFlow. Keeping your coding journey secure and uninterrupted.</p>
          <p style="font-size: 0.8rem; margin-top: 10px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Reset Password with Code - FIXED VERSION
app.post("/api/reset-password", async (req, res) => {
  try {
    const { username, resetCode, newPassword } = req.body;

    if (!username || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Username, reset code, and new password are required",
      });
    }

    // Find valid reset code
    const resetRecord = await PasswordReset.findOne({
      username: username,
      resetCode: resetCode.toString().trim(), // Ensure string comparison
      expiresAt: { $gt: new Date() },
      used: false,
    });

    if (!resetRecord) {
      // Check what exactly is wrong
      const expiredRecord = await PasswordReset.findOne({
        username: username,
        resetCode: resetCode.toString().trim(),
      });

      if (expiredRecord) {
        if (expiredRecord.used) {
          return res.status(400).json({
            success: false,
            error: "Reset code has already been used",
          });
        } else if (expiredRecord.expiresAt <= new Date()) {
          return res.status(400).json({
            success: false,
            error: "Reset code has expired",
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: "Invalid reset code",
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: "User not found",
      });
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
    console.error("💥 RESET PASSWORD ERROR:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset password",
    });
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

// Update social links to work without authentication
app.get("/api/social-links/:username", async (req, res) => {
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
// Track blog views - UPDATED for public access
app.post("/api/blogs/:slug/view", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Increment view count for all users
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

// Get popular blogs (works without authentication)
app.get("/api/blogs/popular", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Only show public blogs for unauthenticated users
    const query = { isPublic: true };

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
// Get all public blogs (works without authentication)
app.get("/api/blogs/all", async (req, res) => {
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
        "title slug author isPublic tags createdAt updatedAt content likes likedBy views"
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

// ========== COMMENT API ROUTES ==========

// Edit comment route
app.put(
  "/api/comments/:commentId/edit",
  authenticateToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const username = req.user.username;

      const comment = await Comment.findById(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Check if user is the author
      if (comment.author !== username) {
        return res.status(403).json({
          success: false,
          error: "You can only edit your own comments",
        });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Comment content is required",
        });
      }

      comment.content = content.trim();
      comment.isEdited = true;
      comment.updatedAt = new Date();

      await comment.save();

      // Broadcast update to all users in real-time
      io.to(comment.blogSlug).emit("comment-updated", comment);

      res.json({
        success: true,
        comment,
        message: "Comment updated successfully",
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Enhanced get comments with proper nested replies loading
app.get("/api/blogs/:slug/comments", async (req, res) => {
  try {
    const { slug } = req.params;
    const { sort = "newest" } = req.query;

    let sortCriteria = {};
    switch (sort) {
      case "newest":
        sortCriteria = { createdAt: -1 };
        break;
      case "oldest":
        sortCriteria = { createdAt: 1 };
        break;
      case "popular":
        sortCriteria = { likes: -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    // Get all comments for this blog (both parent and nested)
    const allComments = await Comment.find({
      blogSlug: slug,
      isDeleted: false,
    });

    // Build comment tree structure
    const buildCommentTree = (parentId = null) => {
      return allComments
        .filter((comment) => {
          if (parentId === null) {
            return comment.parentId === null;
          }
          return (
            comment.parentId &&
            comment.parentId.toString() === parentId.toString()
          );
        })
        .map((comment) => ({
          ...comment.toObject(),
          replies: buildCommentTree(comment._id),
        }))
        .sort((a, b) => {
          // For top-level comments, apply sorting
          if (parentId === null) {
            switch (sort) {
              case "newest":
                return new Date(b.createdAt) - new Date(a.createdAt);
              case "oldest":
                return new Date(a.createdAt) - new Date(b.createdAt);
              case "popular":
                return b.likes - b.dislikes - (a.likes - a.dislikes);
              default:
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
          }
          // For replies, always sort by oldest first
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
    };

    const comments = buildCommentTree();

    // Separate pinned comments (only top-level can be pinned)
    const pinnedComments = comments.filter((comment) => comment.isPinned);
    const normalComments = comments.filter((comment) => !comment.isPinned);

    // Apply sorting to normal comments only
    let sortedNormalComments = [...normalComments];
    if (sort === "popular") {
      sortedNormalComments.sort(
        (a, b) => b.likes - b.dislikes - (a.likes - a.dislikes)
      );
    }

    res.json({
      success: true,
      comments: [...pinnedComments, ...sortedNormalComments],
      pinnedCount: pinnedComments.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new comment
app.post("/api/blogs/:slug/comments", authenticateToken, async (req, res) => {
  try {
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
        error:
          "You are restricted from commenting on this blog due to multiple reports",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Comment content is required",
      });
    }

    const comment = new Comment({
      blogSlug: slug,
      author: username,
      content: content.trim(),
      parentId: parentId || null,
    });

    await comment.save();

    // Populate the new comment with replies array for consistency
    const commentWithReplies = {
      ...comment.toObject(),
      replies: [],
    };

    // Broadcast new comment to all users in the blog room
    io.to(slug).emit("new-comment", commentWithReplies);

    res.status(201).json({
      success: true,
      comment: commentWithReplies,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update comment
app.put("/api/comments/:commentId", authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const username = req.user.username;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      });
    }

    // Check if user is the author
    if (comment.author !== username) {
      return res.status(403).json({
        success: false,
        error: "You can only edit your own comments",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Comment content is required",
      });
    }

    comment.content = content.trim();
    comment.isEdited = true;
    comment.updatedAt = new Date();

    await comment.save();

    // Broadcast update to all users
    io.to(comment.blogSlug).emit("comment-updated", comment);

    res.json({
      success: true,
      comment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete comment (soft delete)
app.delete("/api/comments/:commentId", authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const username = req.user.username;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      });
    }

    // Check if user is the author
    if (comment.author !== username) {
      return res.status(403).json({
        success: false,
        error: "You can only delete your own comments",
      });
    }

    comment.isDeleted = true;
    comment.updatedAt = new Date();

    await comment.save();

    // Broadcast deletion to all users
    io.to(comment.blogSlug).emit("comment-deleted", commentId);

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Like/Dislike comment
app.post(
  "/api/comments/:commentId/vote",
  authenticateToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const { voteType } = req.body; // 'like' or 'dislike'
      const username = req.user.username;

      const comment = await Comment.findById(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      const hasLiked = comment.likedBy.includes(username);
      const hasDisliked = comment.dislikedBy.includes(username);

      // Remove existing votes
      if (hasLiked) {
        comment.likes = Math.max(0, comment.likes - 1);
        comment.likedBy = comment.likedBy.filter((user) => user !== username);
      }

      if (hasDisliked) {
        comment.dislikes = Math.max(0, comment.dislikes - 1);
        comment.dislikedBy = comment.dislikedBy.filter(
          (user) => user !== username
        );
      }

      // Add new vote
      if (voteType === "like" && !hasLiked) {
        comment.likes += 1;
        comment.likedBy.push(username);
      } else if (voteType === "dislike" && !hasDisliked) {
        comment.dislikes += 1;
        comment.dislikedBy.push(username);
      }

      await comment.save();

      // Broadcast vote update
      io.to(comment.blogSlug).emit("comment-vote-updated", {
        commentId,
        likes: comment.likes,
        dislikes: comment.dislikes,
      });

      res.json({
        success: true,
        likes: comment.likes,
        dislikes: comment.dislikes,
        userVote: voteType,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Report comment
app.post(
  "/api/comments/:commentId/report",
  authenticateToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const username = req.user.username;

      const comment = await Comment.findById(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Check if user already reported
      if (comment.reportedBy.includes(username)) {
        return res.status(400).json({
          success: false,
          error: "You have already reported this comment",
        });
      }

      comment.reports += 1;
      comment.reportedBy.push(username);

      // If multiple reports (3 or more), restrict the comment author
      if (comment.reports >= 3) {
        const restriction = new UserRestriction({
          username: comment.author,
          blogSlug: comment.blogSlug,
          reason: "Multiple reports on comments",
        });
        await restriction.save();

        // Notify about restriction
        io.to(comment.blogSlug).emit("user-restricted", {
          username: comment.author,
          blogSlug: comment.blogSlug,
        });
      }

      await comment.save();

      // Broadcast report update
      io.to(comment.blogSlug).emit("comment-reported", {
        commentId,
        reports: comment.reports,
      });

      res.json({
        success: true,
        reports: comment.reports,
        message:
          comment.reports >= 3
            ? "Comment reported. User has been restricted due to multiple reports."
            : "Comment reported successfully",
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Pin/Unpin comment (blog author only) - with 2 comment limit
app.post(
  "/api/comments/:commentId/pin",
  authenticateToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const username = req.user.username;

      const comment = await Comment.findById(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Get blog to check if user is the author
      const blog = await Blog.findOne({ slug: comment.blogSlug });

      if (!blog) {
        return res.status(404).json({
          success: false,
          error: "Blog not found",
        });
      }

      // Check if user is the blog author
      if (blog.author !== username) {
        return res.status(403).json({
          success: false,
          error: "Only the blog author can pin comments",
        });
      }

      // Check if trying to pin a reply (only parent comments can be pinned)
      if (comment.parentId) {
        return res.status(400).json({
          success: false,
          error: "Only top-level comments can be pinned",
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
            error: "You can only pin up to 2 comments",
          });
        }

        comment.isPinned = true;
      }

      comment.updatedAt = new Date();
      await comment.save();

      // Broadcast pin update in real-time
      io.to(comment.blogSlug).emit("comment-pin-updated", comment);

      res.json({
        success: true,
        isPinned: comment.isPinned,
        message: comment.isPinned ? "Comment pinned" : "Comment unpinned",
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get blog stats (likes/dislikes for helpful/unhelpful label)
app.get("/api/blogs/:slug/stats", async (req, res) => {
  try {
    const { slug } = req.params;

    // Calculate total likes and dislikes from comments
    const stats = await Comment.aggregate([
      { $match: { blogSlug: slug, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: "$likes" },
          totalDislikes: { $sum: "$dislikes" },
        },
      },
    ]);

    const result = stats[0] || { totalLikes: 0, totalDislikes: 0 };

    res.json({
      success: true,
      stats: {
        totalLikes: result.totalLikes,
        totalDislikes: result.totalDislikes,
        isHelpful: result.totalLikes > result.totalDislikes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if user is restricted from commenting
app.get(
  "/api/blogs/:slug/restriction-check",
  authenticateToken,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const username = req.user.username;

      const restriction = await UserRestriction.findOne({
        username,
        blogSlug: slug,
      });

      res.json({
        success: true,
        isRestricted: !!restriction,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get user status (online/offline and last active)
app.get("/api/user-status/:username", authenticateToken, async (req, res) => {
  try {
    const username = req.params.username;

    const user = await User.findOne({ username }).select(
      "isOnline lastActive username"
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      status: {
        isOnline: user.isOnline,
        lastActive: user.lastActive,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get multiple users status (for community directory)
app.post("/api/users-status", authenticateToken, async (req, res) => {
  try {
    const { usernames } = req.body;

    if (!usernames || !Array.isArray(usernames)) {
      return res
        .status(400)
        .json({ success: false, error: "Usernames array is required" });
    }

    const users = await User.find({
      username: { $in: usernames },
    }).select("isOnline lastActive username");

    const statusMap = {};
    users.forEach((user) => {
      statusMap[user.username] = {
        isOnline: user.isOnline,
        lastActive: user.lastActive,
      };
    });

    res.json({
      success: true,
      status: statusMap,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this endpoint to check user data
app.get("/api/debug-user/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        hasEmail: !!user.email,
      },
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

// Serve user-profile with and without .html extension
app.get("/user-profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-profile.html"));
});

app.get("/user-profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-profile.html"));
});

// Serve user profile pages (for future implementation)
app.get("/user/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-profile.html"));
});

// Serve index.html for all other routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB connected ${process.env.MONGODB_URI}`);
  console.log(`🌐 Access your app at: http://localhost:${PORT}`);
});
