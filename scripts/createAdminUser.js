/**
 * Script to create an admin user
 * Run: node scripts/createAdminUser.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ChecklistData from "../models/ChecklistData.js";
import config from "../config/environment.js";

const createAdminUser = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Connected to database");

    const adminUsername = "admin";
    const adminEmail = "admin@focusflow.com";
    const adminPassword = "admin123";

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ username: adminUsername }, { email: adminEmail }],
    });

    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.username);
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminUser = new User({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      authProvider: "local",
      isAdmin: true,
      isEmailVerified: true,
    });

    await adminUser.save();

    // Create default data for admin
    await ChecklistData.getUserData(adminUsername);

    console.log("✅ Admin user created successfully!");
    console.log("Username:", adminUsername);
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);
    console.log("Please change the password after first login.");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
};

createAdminUser();
