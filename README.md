# DSA Daily Checklist 🚀

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)](https://github.com/anupam6335/Daily-Tracker)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/anupam6335/Daily-Tracker/releases)
[![Live Demo](https://img.shields.io/badge/demo-live%20project-brightgreen)](https://daily-tracker-upst.onrender.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Daily Habit Builder](https://img.shields.io/badge/purpose-daily%20habit%20improvement-orange)](https://github.com/anupam6335/Daily-Tracker)

A modern, cloud-synced progress tracker for mastering Data Structures and Algorithms. **Built to help you build consistent daily coding habits** and level up your skills through regular practice. **Accessible worldwide via live deployment!**

🌐 **Live Demo: https://daily-tracker-upst.onrender.com/**

<img width="1403" height="821" alt="image" src="https://github.com/user-attachments/assets/6c3233da-65ae-43ab-905a-bedabb696162" />


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

## 🚀 Instant Access

### 🌐 Use the Live Application Now!
**No installation required!** Start building your coding habit immediately:

👉 **[https://daily-tracker-upst.onrender.com/](https://daily-tracker-upst.onrender.com/)**

### Quick Start with Live Demo:
1. **Visit:** https://daily-tracker-upst.onrender.com/
2. **Create account** or login
3. **Start tracking** your daily DSA practice
4. **Access from any device** - always in sync!

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

## 💻 Local Development

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance (local or Atlas)

### Local Installation (Optional)

1. **Clone the repository**
```bash
git clone https://github.com/anupam6335/Daily-Tracker.git
cd Daily-Tracker
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Create .env file
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

5. **Access locally**
```
http://localhost:3000
```

## 📖 Usage Guide

### Building Daily Coding Habits

**Start Small, Stay Consistent:**
- Aim for **just 1 question per day** to build momentum
- Use the activity tracker to **maintain your streak**
- **Don't break the chain** - the visual calendar motivates consistency

### Getting Started with Live Demo

1. **Visit https://daily-tracker-upst.onrender.com/**
2. **Create your account** (takes 30 seconds)
3. **Start with Day 1** - no setup required
4. **Practice daily** - your progress syncs automatically

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

## 🏗️ Project Structure

```
Daily-Tracker/
├── index.html              # Main application file
├── server.js               # Express server with API routes
├── package.json            # Dependencies and scripts
├── .env                    # Environment configuration
└── README.md              # This file
```

## 🌐 Deployment Information

### Live Production Environment
- **URL:** https://daily-tracker-upst.onrender.com/
- **Platform:** Render.com
- **Database:** MongoDB Atlas (cloud)
- **Status:** 24/7 available worldwide
- **SSL:** HTTPS secured

### Features Available in Live Version:
- ✅ **Global accessibility** - access from anywhere
- ✅ **Auto-scaling** - handles multiple users
- ✅ **Automatic deployments** - always up-to-date
- ✅ **Production-ready** - optimized for performance

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

## 🚀 Quick Links

- **🌐 Live Application:** https://daily-tracker-upst.onrender.com/
- **📚 Source Code:** https://github.com/anupam6335/Daily-Tracker
- **🐛 Report Issues:** https://github.com/anupam6335/Daily-Tracker/issues
- **💡 Feature Requests:** https://github.com/anupam6335/Daily-Tracker/issues

## 🐛 Troubleshooting

### Live Demo Issues

**If the live demo is slow to load:**
- Render.com free tier may have cold starts
- Wait 30-60 seconds for the first load
- Subsequent loads will be faster

**Browser compatibility:**
- Works on Chrome, Firefox, Safari, Edge
- Mobile browsers fully supported
- Requires JavaScript enabled

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

<div align="center">

## 🎯 Ready to Start Your Habit?

### 🌐 **Access the Live App Now:**
# [https://daily-tracker-upst.onrender.com/](https://daily-tracker-upst.onrender.com/)

**No installation required - start building your coding habit in 60 seconds!**

*"We are what we repeatedly do. Excellence, then, is not an act, but a habit."* - Aristotle

</div>

---

**📅 Tomorrow's Question Awaits!** What will you solve today to build your coding habit? 🚀

---
