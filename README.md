# DSA Daily Checklist 🚀

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)](https://github.com/yourusername/dsa-daily-checklist)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/yourusername/dsa-daily-checklist/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Daily Habit Builder](https://img.shields.io/badge/purpose-daily%20habit%20improvement-orange)](https://github.com/yourusername/dsa-daily-checklist)

A modern, cloud-synced progress tracker for mastering Data Structures and Algorithms. **Built to help you build consistent daily coding habits** and level up your skills through regular practice.

<img width="1624" height="719" alt="image" src="https://github.com/user-attachments/assets/473454ad-bd45-4d34-b763-d587965836e0" />

PROD URL : https://daily-tracker-upst.onrender.com/

## ✨ Features

### 🎯 Core Functionality
- **📅 Daily Progress Tracking** - Organize DSA questions by day with completion status
- **✅ Smart Question Management** - Add, edit, delete questions with direct LeetCode links
- **🏷️ Tag System** - Categorize days with customizable colored tags
- **🔗 Link Management** - Store important references as clickable tags
- **📊 Progress Visualization** - GitHub-style activity calendar with heatmap

### 🔐 Advanced Features
- **☁️ Cloud Synchronization** - Automatic sync across devices with MongoDB
- **🔒 Secure Authentication** - JWT-based login/registration system
- **⚡ Conflict Resolution** - Smart version control for data conflicts
- **📱 Offline Support** - Full functionality without internet connection
- **🎨 Theme Toggle** - Dark/light mode for comfortable coding sessions

### 🌟 Daily Habit Building
- **📈 Streak Tracking** - Visual calendar motivates daily consistency
- **🎯 Progress Momentum** - Watch your activity heatmap grow over time
- **💪 Habit Formation** - Designed to build coding practice into your daily routine
- **📱 Always Accessible** - Works on all devices for practice anywhere, anytime

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3 with CSS Custom Properties
- Vanilla JavaScript (ES6+)
- Responsive Design (Mobile First)

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose ODM
- JWT Authentication
- bcryptjs Password Hashing

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance (local or Atlas)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/dsa-daily-checklist.git
cd dsa-daily-checklist
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Create .env file
cp .env.example .env

# Edit .env with your configuration
MONGODB_URI=mongodb://localhost:27017/dsa-checklist
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

4. **Start the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. **Access the application**
```
http://localhost:3000
```

## 📖 Usage Guide

### Building Daily Coding Habits

**Start Small, Stay Consistent:**
- Aim for **just 1 question per day** to build momentum
- Use the activity tracker to **maintain your streak**
- **Don't break the chain** - the visual calendar motivates consistency

### Getting Started

1. **Create an account** to track your habit journey
2. **Start with Day 1** - no need to overwhelm yourself
3. **Focus on consistency** over quantity
4. **Celebrate small wins** - each completed question builds your habit

### Basic Operations

**Adding a new day:**
```javascript
// Click the "+ Add New Day" button when you're ready to progress
// Perfect for building one day at a time
```

**Managing questions:**
```javascript
- Click checkbox to mark completion (habit achieved!)
- Start with 1-2 questions daily to build consistency
- Gradually increase as the habit becomes automatic
```

**Status indicators:**
- 😊 = Daily habit completed!
- 😞 = Time to get today's practice in
- 😐 = New day, new opportunity to build your habit

### Advanced Features

**Tagging for habit categories:**
```javascript
// Tag days by focus area to track skill development
- "Arrays", "Graphs", "Dynamic Programming"
- See which areas you practice most consistently
```

**Resource tracking:**
```javascript
// Save helpful resources encountered during practice
- Great for building a personal knowledge base
- Track learning materials alongside practice
```

## 🏗️ Project Structure

```
dsa-daily-checklist/
├── index.html              # Main application file
├── server.js               # Express server with API routes
├── package.json            # Dependencies and scripts
├── .env                    # Environment configuration
└── README.md              # This file
```

## 🌟 Habit Building Strategy

### The 1% Better Every Day Approach

This tool is designed around the principle of **consistent small improvements**:

```javascript
// Instead of:
practiceMarathon(); // Occasional intense sessions

// Use this for:
dailyConsistentPractice(); // Small, regular sessions that compound
```

### Benefits of Daily Practice

- **🔥 Compound Growth**: Small daily efforts lead to massive long-term results
- **🚀 Reduced Procrastination**: "Just one question" mindset lowers barriers
- **📈 Skill Automation**: Coding thinking becomes second nature
- **💪 Built Discipline**: Develops the muscle of consistent practice

## 📊 Activity Tracker - Your Habit Scorecard

The activity calendar is your **daily habit motivator**:

```
September 2025 - Your Coding Habit Tracker
Mo Tu We Th Fr Sa Su
────────────────────
 1  2  3  4  5  6  7
 8  9 10 11 12 13 14
15 16 17 18 19 20 21
22 23 24 ██ █▓ ▓▓ ▓▓  ← Your growing habit streak!
29 30
```

- █ = Habit maintained (1 question)
- ▓ = Excellent day (2+ questions)  
- **Don't break the chain!** - Visual motivation to keep your streak alive

## 🚀 Deployment

### For Personal Habit Tracking
```bash
# Local deployment for daily use
npm start
```

### For Team/Group Habit Building
```bash
# Deploy to share with study groups
npm run build
```

## 🌱 Starting Your Habit Journey

### Week 1: Foundation Building
- **Goal**: Practice 15 minutes daily
- **Focus**: Consistency over complexity
- **Target**: 1 simple question per day

### Week 2-4: Habit Formation  
- **Goal**: Establish routine
- **Focus**: Same time each day
- **Target**: 1-2 questions daily

### Month 2+: Skill Acceleration
- **Goal**: Progressive difficulty
- **Focus**: Building on established habit
- **Target**: 2-3 questions with increasing complexity

## 🐛 Troubleshooting

### Common Habit Challenges

**"I don't have time today"**
```javascript
// Solution: The 5-minute rule
commitToJustFiveMinutes(); // Often leads to full session
```

**"The problem is too hard"**
```javascript
// Solution: Scale down
chooseEasierQuestion(); // Maintain the habit, adjust difficulty
```

**"I forgot to practice"**
```javascript
// Solution: Use app reminders
setDailyNotification(); // Leverage the tracking system
```

## 🤝 Join the Habit Community

Share your progress and motivate others:

1. **Track your streak** in the activity calendar
2. **Celebrate milestones** (7 days, 30 days, 100 days)
3. **Share your heatmap** with coding communities
4. **Inspire others** with your consistency journey

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ to help developers build **consistent coding habits** that transform skills through daily practice.

*Special thanks to James Clear's "Atomic Habits" for inspiring the habit-building approach integrated into this tool.*

---

**Your Coding Habit Starts Today!** 🌟

*"We are what we repeatedly do. Excellence, then, is not an act, but a habit."* - Aristotle
*"Don't break the chain of daily practice."* - Jerry Seinfeld's Productivity Secret


---

**📅 Tomorrow's Question Awaits!** What will you solve today to build your coding habit? 🚀
