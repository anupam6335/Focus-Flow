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

const User = mongoose.model("User", userSchema);
const ChecklistData = mongoose.model("ChecklistData", checklistDataSchema);

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

// Save user data (protected route) - UPDATED with conflict resolution
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

    // Conflict resolution: Check if client has outdated data
    if (clientVersion && lastUpdated) {
      const clientLastUpdated = new Date(lastUpdated);
      const serverLastUpdated = new Date(currentData.lastUpdated);

      // If client data is older than server data, we have a conflict
      if (clientLastUpdated < serverLastUpdated) {
        // For now, we'll prioritize server data and return it to the client
        // In a more advanced implementation, you could merge changes
        return res.status(409).json({
          success: false,
          error: "CONFLICT: Your local data is outdated",
          serverData: currentData.data,
          serverVersion: currentData.version,
          serverLastUpdated: currentData.lastUpdated,
          message: "Please refresh to get the latest data",
        });
      }
    }

    // Update data if no conflict or client has newer data
    currentData.data = data;
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

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function generateDefaultData() {
  const TOTAL_DAYS = 100;
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
