const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema({
  username: { type: String, required: true },
  resetCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = passwordResetSchema;