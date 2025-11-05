/**
 * Activity Tracker Model
 * Tracks user activity streaks, statistics, and progress
 */

import mongoose from 'mongoose';

const activityTrackerSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    unique: true,
    ref: 'User'
  },
  activityData: {
    currentStreak: { 
      type: Number, 
      default: 0,
      min: 0
    },
    totalSolved: { 
      type: Number, 
      default: 0,
      min: 0
    },
    averageDaily: { 
      type: Number, 
      default: 0,
      min: 0
    },
    maxStreak: { 
      type: Number, 
      default: 0,
      min: 0
    },
    heatmapData: { 
      type: Object, 
      default: {} 
    },
    activityHistory: { 
      type: Array, 
      default: [] 
    },
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true
});

// Index for user lookup
activityTrackerSchema.index({ userId: 1 });

// Method to update streak
activityTrackerSchema.methods.updateStreak = function(activityDate = new Date()) {
  const today = activityDate.toDateString();
  const yesterday = new Date(activityDate);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastActivity = this.activityData.activityHistory[this.activityData.activityHistory.length - 1];
  
  if (!lastActivity || lastActivity.date === yesterday.toDateString()) {
    // Continue streak
    this.activityData.currentStreak += 1;
  } else if (lastActivity.date !== today) {
    // Break streak
    this.activityData.currentStreak = 1;
  }
  
  // Update max streak
  if (this.activityData.currentStreak > this.activityData.maxStreak) {
    this.activityData.maxStreak = this.activityData.currentStreak;
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

export default mongoose.model('ActivityTracker', activityTrackerSchema);