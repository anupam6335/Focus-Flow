// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/dsa-checklist",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Data schema
const checklistDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: "default-user" },
  data: { type: Array, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

const ChecklistData = mongoose.model("ChecklistData", checklistDataSchema);

// Routes
app.get("/api/data", async (req, res) => {
  try {
    const { userId = "default-user" } = req.query;
    let data = await ChecklistData.findOne({ userId });

    if (!data) {
      // Return default data structure if no data exists
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
      return res
        .status(400)
        .json({ success: false, error: "Data is required" });
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

// Generate default data structure
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database connected on ${process.env.MONGODB_URI}`);
});
