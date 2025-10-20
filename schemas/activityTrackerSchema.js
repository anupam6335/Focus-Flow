const mongoose = require("mongoose");

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

module.exports = activityTrackerSchema;