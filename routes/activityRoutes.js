const express = require("express");
const ActivityTracker = require("../models/ActivityTracker");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Get activity tracker data
router.get("/activity-tracker", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    let activityData = await ActivityTracker.findOne({ userId });
    if (!activityData) {
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

// Save activity tracker data
router.post("/activity-tracker", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    const { activityData } = req.body;

    if (!activityData) {
      return res
        .status(400)
        .json({ success: false, error: "Activity data is required" });
    }

    let tracker = await ActivityTracker.findOne({ userId });
    if (!tracker) {
      tracker = new ActivityTracker({ userId });
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

module.exports = router;
