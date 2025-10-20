const express = require("express");
const ChecklistData = require("../models/ChecklistData");
const { authenticateToken } = require("../middleware/auth");
const { generateDefaultData, ensureDifficultyField, areChangesCompatible, mergeDataIntelligently } = require("../utils/helpers");

const router = express.Router();

// Get user data (protected route) - UPDATED with version
router.get("/data", authenticateToken, async (req, res) => {
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
router.post("/data", authenticateToken, async (req, res) => {
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
        // Auto-merge strategy: Check if changes are compatible
        if (areChangesCompatible(currentData.data, data)) {
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
router.post("/force-sync", authenticateToken, async (req, res) => {
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

// Add progress statistics routes
router.get("/progress-stats", authenticateToken, async (req, res) => {
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
router.get("/progress-stats/:username", authenticateToken, async (req, res) => {
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

module.exports = router;