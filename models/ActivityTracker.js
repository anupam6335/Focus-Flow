const mongoose = require("mongoose");
const activityTrackerSchema = require("../schemas/activityTrackerSchema");
module.exports = mongoose.model("ActivityTracker", activityTrackerSchema);