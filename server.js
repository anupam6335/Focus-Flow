/**
 * FocusFlow Backend Server
 * Main entry point for the FocusFlow application backend
 * Modular, scalable, and production-ready architecture
 */

import express from "express";
import cors from "cors";
import path from "path";
import http from "http";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

// Configuration
import config from "./config/environment.js";
import { connectDatabase } from "./config/database.js";
import "./config/passport.js";

// Middleware
import { errorHandler, notFound } from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import checklistRoutes from "./routes/checklist.js";
import activityRoutes from "./routes/activity.js";
import blogRoutes from "./routes/blogs.js";
import commentRoutes from "./routes/comments.js";
import notificationRoutes from "./routes/notifications.js";
import socialRoutes from "./routes/social.js";
import dataRoutes from "./routes/data.js";
import adminNotificationRoutes from "./routes/adminNotifications.js";
import banManagementRoutes from "./routes/banManagement.js";

// Services
import { socketService } from "./services/socketService.js";

// Initialize Express app
const app = express();
const server = http.createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = config.PORT;

// Middleware Configuration
app.use(
  cors({
    origin: config.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.get("/auth", (req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Static file serving
app.use(express.static(path.join(__dirname, "public")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/data", checklistRoutes);
app.use("/api", checklistRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/admin", adminNotificationRoutes);
app.use("/api/admin", banManagementRoutes);
app.use("/api", banManagementRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FocusFlow API is running",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: "1.0.0",
  });
});

// Serve frontend routes (SPA support)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/auth", (req, res) => {
  try {
    // Look for ff_token cookie set by login (httpOnly)
    const token = req.cookies && req.cookies.ff_token;
    if (token) {
      // verify token validity
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        // token valid — redirect to home (already logged in)
        return res.redirect("/");
      } catch (err) {
        // invalid or expired token — fall through to show auth page
        // (optionally clear cookie)
        res.clearCookie && res.clearCookie("ff_token", { path: "/" });
      }
    }
  } catch (e) {
    // ignore and continue to serve auth page
    console.debug && console.debug("Auth route guard error", e);
  }

  // Default: not authenticated, show auth page
  res.sendFile(path.join(__dirname, "public", "auth.html"));
});

app.get("/blogs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blogs.html"));
});

app.get("/blogs/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blog-view.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get("/user-profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-profile.html"));
});

app.get("/user/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-profile.html"));
});

// Catch-all handler for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize services
const initializeServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize Socket.io
    socketService.initialize(server);

    // Start server
    server.listen(PORT, () => {
      console.log(`
🚀 FocusFlow Server Started Successfully!
📍 Port: ${PORT}
🌍 Environment: ${config.NODE_ENV}
📊 Database: ${config.MONGODB_URI.split("@")[1] || config.MONGODB_URI}
🔗 Frontend URL: ${config.FRONTEND_URL}
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
initializeServer();

export default app;
