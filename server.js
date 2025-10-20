const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const dataRoutes = require("./routes/dataRoutes");
const activityRoutes = require("./routes/activityRoutes");
const socialRoutes = require("./routes/socialRoutes");
const blogRoutes = require("./routes/blogRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// API Routes
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", dataRoutes);
app.use("/api", activityRoutes);
app.use("/api", socialRoutes);
app.use("/api", blogRoutes);

// ========== STATIC FILE ROUTES ==========
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "js")));
app.use(express.static(path.join(__dirname, "css")));
app.use(express.static(path.join(__dirname, "assets")));

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve blog pages
app.get("/blogs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blogs.html"));
});

// Route for the blog view
app.get("/blogs/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blog-view.html"));
});

// Serve profile pages
app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// Serve user profile pages
app.get("/user/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-profile.html"));
});

// Serve index.html for all other routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB connected ${process.env.MONGODB_URI}`);
});
