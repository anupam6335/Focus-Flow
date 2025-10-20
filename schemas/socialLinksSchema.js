const mongoose = require("mongoose");

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

module.exports = socialLinksSchema;