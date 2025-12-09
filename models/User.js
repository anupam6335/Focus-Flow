/**
 * User Model - Email mandatory for local authentication
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true, // Password is mandatory for local auth
      validate: {
        validator: function (v) {
          // Password validation only for local authentication
          return this.authProvider !== "local" || (v && v.length >= 4);
        },
        message:
          "Password is required and must be at least 4 characters for local authentication",
      },
    },
    // UPDATED: Email is now mandatory for local auth users
    email: {
      type: String,
      required: function () {
        return this.authProvider === "local"; // Required only for local auth
      },
      unique: true,
      sparse: true, // Allows multiple nulls for OAuth users
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.authProvider !== "local") return true; // Not required for OAuth
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message:
          "Please provide a valid email address for local authentication",
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    providerId: {
      type: String,
      sparse: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    following: [
      {
        type: String,
        ref: "User",
      },
    ],
    notificationPreferences: {
      newBlogs: { type: Boolean, default: true },
      activity: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: false },
    },
    readNotifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    lastNotificationCheck: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for OAuth providers
userSchema.index(
  { authProvider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerId: { $exists: true } },
  }
);

// Index for email (unique but sparse for OAuth users)
userSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { email: { $exists: true } },
  }
);

// Existing indexes...
userSchema.index({ username: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ isAdmin: 1 });


// NEW: Compound index for username/email login lookup
userSchema.index({
  authProvider: 1,
  $or: [{ username: 1 }, { email: 1 }],
});

// Method to update last active timestamp
userSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};

// Static method to find by username with common projections
userSchema.statics.findByUsername = function (
  username,
  includeSensitive = false
) {
  const projection = includeSensitive ? {} : { password: 0, __v: 0 };
  return this.findOne({ username }).select(projection);
};

// Static method to find by email
userSchema.statics.findByEmail = function (email, includeSensitive = false) {
  const projection = includeSensitive ? {} : { password: 0, __v: 0 };
  return this.findOne({ email, authProvider: "local" }).select(projection);
};

// NEW: Static method to find user by username OR email for login
userSchema.statics.findByUsernameOrEmail = function (
  identifier,
  includeSensitive = false
) {
  const projection = includeSensitive ? {} : { password: 0, __v: 0 };

  // Check if identifier looks like an email
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

  if (isEmail) {
    return this.findOne({
      email: identifier.toLowerCase(),
      authProvider: "local",
    }).select(projection);
  } else {
    return this.findOne({
      username: identifier.toLowerCase(),
    }).select(projection);
  }
};

// NEW: Static method specifically for login (includes password)
userSchema.statics.findForLogin = function (identifier) {
  // Check if identifier looks like an email
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

  if (isEmail) {
    return this.findOne({
      email: identifier.toLowerCase(),
      authProvider: "local",
    });
  } else {
    return this.findOne({
      username: identifier.toLowerCase(),
    });
  }
};

export default mongoose.model("User", userSchema);
