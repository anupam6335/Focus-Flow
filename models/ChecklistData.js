/**
 * Checklist Data Model
 * Stores user's daily progress and question tracking data
 */

import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    auto: true
  },
  text: { type: String, required: true },
  link: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  }
});

const daySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  date: { type: String, required: true },
  questions: [questionSchema],
  tags: { type: Array, default: [] },
  links: { type: String, default: '' },
  linksArray: { type: Array, default: [] }
});

const checklistDataSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    unique: true,
    ref: 'User'
  },
  data: { 
    type: [daySchema], 
    required: true,
    validate: {
      validator: function(data) {
        return Array.isArray(data) && data.length > 0;
      },
      message: 'Data must be a non-empty array'
    }
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  version: { 
    type: Number, 
    default: 1,
    min: 1
  },
}, {
  timestamps: true
});

// Compound index
checklistDataSchema.index({ userId: 1 });

// Method to calculate total solved questions
checklistDataSchema.methods.getSolvedCount = function() {
  return this.data.reduce((total, day) => {
    return total + day.questions.filter(q => q.completed).length;
  }, 0);
};

// Method to calculate total questions
checklistDataSchema.methods.getTotalCount = function() {
  return this.data.reduce((total, day) => total + day.questions.length, 0);
};

// Static method to get or create user data
checklistDataSchema.statics.getUserData = async function(userId) {
  let data = await this.findOne({ userId });
  
  if (!data) {
    const defaultData = generateDefaultData();
    data = await this.create({
      userId,
      data: defaultData,
      version: 1
    });
  }
  
  return data;
};

// Helper function (moved from server.js)
const generateDefaultData = () => {
  const TOTAL_DAYS = 1;
  const DEFAULT_QUESTIONS = [
    {
      text: "Two Sum",
      link: "https://leetcode.com/problems/two-sum/",
      difficulty: "Easy",
    },
    {
      text: "Reverse a Linked List",
      link: "https://leetcode.com/problems/reverse-linked-list/",
      difficulty: "Medium",
    },
    {
      text: "Binary Search",
      link: "https://leetcode.com/problems/binary-search/",
      difficulty: "Medium",
    },
  ];

  return Array.from({ length: TOTAL_DAYS }, (_, index) => ({
    day: index + 1,
    date: new Date().toISOString().split('T')[0],
    questions: DEFAULT_QUESTIONS.map(q => ({
      text: q.text,
      link: q.link,
      completed: false,
      difficulty: q.difficulty,
    })),
    tags: [],
    links: "",
    linksArray: [],
  }));
};

export default mongoose.model('ChecklistData', checklistDataSchema);