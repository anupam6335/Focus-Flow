const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS and JSON first
app.use(cors());
app.use(express.json());

// API Routes - BEFORE static files
app.get("/api/data", async (req, res) => {
  try {
    const { userId = "default-user" } = req.query;
    let data = await ChecklistData.findOne({ userId });
    if (!data) {
      const defaultData = generateDefaultData();
      data = await ChecklistData.create({ userId, data: defaultData });
    }
    res.json({ success: true, data: data.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/data", async (req, res) => {
  try {
    const { userId = "default-user", data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: "Data is required" });
    }
    const updatedData = await ChecklistData.findOneAndUpdate(
      { userId },
      { data, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: updatedData.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Static files - AFTER API routes
app.use(express.static(path.join(__dirname)));

// Catch-all route for SPA - should be LAST
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Your schema and other code remains the same...
const checklistDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: "default-user" },
  data: { type: Array, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

const ChecklistData = mongoose.model("ChecklistData", checklistDataSchema);

function generateDefaultData() {
  const TOTAL_DAYS = 100;
  const DEFAULT_QUESTIONS = [
    { text: "Two Sum", link: "https://leetcode.com/problems/two-sum/" },
    {
      text: "Reverse a Linked List",
      link: "https://leetcode.com/problems/reverse-linked-list/",
    },
    {
      text: "Binary Search",
      link: "https://leetcode.com/problems/binary-search/",
    },
  ];

  const appData = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    appData.push({
      day: day,
      questions: DEFAULT_QUESTIONS.map((q) => ({
        text: q.text,
        link: q.link,
        completed: false,
      })),
      tags: [],
      links: "",
      linksArray: [],
    });
  }
  return appData;
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});