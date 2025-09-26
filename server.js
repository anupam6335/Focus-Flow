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

const User = mongoose.model("User", userSchema);
const ChecklistData = mongoose.model("ChecklistData", checklistDataSchema);
const ActivityTracker = mongoose.model(
  "ActivityTracker",
  activityTrackerSchema
);

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

// Routes

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
        console.log(
          `🔄 Conflict detected for user ${userId}. Time difference: ${timeDiff}ms`
        );

        // Auto-merge strategy: Check if changes are compatible
        if (areChangesCompatible(currentData.data, data)) {
          console.log("✅ Changes are compatible, auto-merging...");
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
        console.log("🔄 Minor time difference, accepting client changes");
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

// Helper function to check if changes are compatible for auto-merge
function areChangesCompatible(serverData, clientData) {
  try {
    // If data structures are fundamentally different, require manual resolution
    if (!Array.isArray(serverData) || !Array.isArray(clientData)) {
      return false;
    }

    // If lengths are very different, likely incompatible
    if (Math.abs(serverData.length - clientData.length) > 3) {
      return false;
    }

    // Check if changes are mostly additive (new days/questions)
    let compatibleChanges = true;
    const minLength = Math.min(serverData.length, clientData.length);

    for (let i = 0; i < minLength; i++) {
      const serverDay = serverData[i];
      const clientDay = clientData[i];

      // If day numbers don't match, incompatible
      if (serverDay.day !== clientDay.day) {
        compatibleChanges = false;
        break;
      }

      // Check for major structural changes
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
    console.log("Error checking compatibility:", error);
    return false;
  }
}

// Intelligent merge function
function mergeDataIntelligently(serverData, clientData) {
  try {
    const mergedData = JSON.parse(JSON.stringify(serverData)); // Start with server data

    // Merge client changes intelligently
    clientData.forEach((clientDay, index) => {
      if (index < mergedData.length) {
        // Merge existing day
        const serverDay = mergedData[index];

        // Prefer client's question completions
        clientDay.questions.forEach((clientQuestion, qIndex) => {
          if (qIndex < serverDay.questions.length) {
            // Keep client's completion status
            serverDay.questions[qIndex].completed = clientQuestion.completed;
          }
        });

        // Merge tags (unique values)
        const mergedTags = [...serverDay.tags];
        clientDay.tags.forEach((clientTag) => {
          if (!mergedTags.some((tag) => tag.text === clientTag.text)) {
            mergedTags.push(clientTag);
          }
        });
        serverDay.tags = mergedTags;

        // Merge links (unique values)
        const mergedLinks = [...serverDay.linksArray];
        clientDay.linksArray.forEach((clientLink) => {
          if (!mergedLinks.some((link) => link.url === clientLink.url)) {
            mergedLinks.push(clientLink);
          }
        });
        serverDay.linksArray = mergedLinks;
      } else {
        // Add new days from client
        mergedData.push(clientDay);
      }
    });

    return mergedData;
  } catch (error) {
    console.log("Error during merge, using server data:", error);
    return serverData; // Fallback to server data
  }
}

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
    console.log("📥 Received activity tracker data GET request");
    console.log("📥 User:", req.user.username);

    const userId = req.user.username;
    let activityData = await ActivityTracker.findOne({ userId });

    if (!activityData) {
      console.log("🆕 Creating new activity tracker for user:", userId);
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
      console.log("📋 Found existing activity tracker for user:", userId);
    }

    console.log("✅ Returning activity tracker data for user:", userId);
    console.log("✅ Data:", activityData.activityData);

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
    console.log("📥 Received activity tracker data save request");
    console.log("📥 User:", req.user.username);
    console.log("📥 Data received:", req.body.activityData);

    const userId = req.user.username;
    const { activityData } = req.body;

    if (!activityData) {
      console.log("❌ No activity data provided");
      return res
        .status(400)
        .json({ success: false, error: "Activity data is required" });
    }

    let tracker = await ActivityTracker.findOne({ userId });

    if (!tracker) {
      console.log("🆕 Creating new activity tracker for user:", userId);
      tracker = new ActivityTracker({ userId });
    } else {
      console.log("📝 Updating existing activity tracker for user:", userId);
    }

    tracker.activityData = activityData;
    tracker.lastUpdated = new Date();

    await tracker.save();

    console.log(
      "✅ Activity tracker data saved successfully for user:",
      userId
    );
    console.log("✅ Saved data:", tracker.activityData);

    res.json({
      success: true,
      message: "Activity data saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving activity tracker data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB connected ${process.env.MONGODB_URI}`);
});
