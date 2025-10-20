const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChecklistData = require("../models/ChecklistData");
const PasswordReset = require("../models/PasswordReset");
const { authenticateToken } = require("../middleware/auth");
const { generateDefaultData } = require("../utils/helpers");

const router = express.Router();

// User registration
router.post("/register", async (req, res) => {
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

    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// User login
router.post("/login", async (req, res) => {
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
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
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
router.get("/verify-token", authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user.username });
});

// Forgot Password - Send Reset Code
router.post("/forgot-password", async (req, res) => {
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
router.post("/reset-password", async (req, res) => {
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

// Cleanup expired reset codes
router.post("/cleanup-reset-codes", async (req, res) => {
  try {
    const result = await PasswordReset.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;