# FocusFlow - Track Your Progress, Master Your Journey

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)](https://github.com/anupam6335/FocusFlow)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/anupam6335/FocusFlow/releases)
[![Live Demo](https://img.shields.io/badge/demo-live%20project-brightgreen)](https://anupam6335.github.io/Focus-Flow/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Daily Habit Builder](https://img.shields.io/badge/purpose-progress%20tracking%20%26%20habit%20building-orange)](https://github.com/anupam6335/FocusFlow)

A modern, cloud-synced progress tracking application designed to help you build consistent daily habits and master your skills through regular practice. **Accessible worldwide via live deployment!**

🌐 **Live Application: https://anupam6335.github.io/Focus-Flow/**
[<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/c4338931-5193-409f-8912-94e4a74d0b75" />](preview)


## ✨ Features

### 🎯 Core Progress Tracking
- **📅 Daily Progress Management** - Organize tasks and questions by day with completion status
- **✅ Smart Item Management** - Add, edit, delete items with direct external links
- **🏷️ Tag System** - Categorize days with customizable colored tags
- **🔗 Advanced Link Management** - Store and organize important references as clickable tags
- **🎨 Theme Support** - Dark/light mode for comfortable usage

### 🔐 Advanced Capabilities
- **☁️ Cloud Synchronization** - Automatic sync across devices with MongoDB backend
- **🔒 Secure Authentication** - JWT-based login/registration system
- **⚡ Intelligent Conflict Resolution** - Smart version control for data conflicts
- **📱 Offline Support** - Full functionality without internet connection
- **🔐 Password Recovery** - Secure reset password functionality

### 📊 Progress Analytics & Visualization
- **📈 Advanced Analytics Dashboard** - Track streaks, totals, averages, and records
- **🔥 GitHub-style Heatmap** - Visual consistency map with activity levels
- **🎯 Progress Momentum** - Watch your activity heatmap grow over time
- **💪 Habit Formation Tools** - Designed to build consistent practice routines

### 🚀 Daily Habit Building
- **📱 Always Accessible** - Works on all devices for practice anywhere, anytime
- **🎉 Achievement Celebrations** - Motivational rewards for milestones
- **📊 Visual Progress** - Comprehensive analytics to track your journey

## 🏗️ Architecture

### Frontend (GitHub Pages)
- **URL:** https://anupam6335.github.io/Focus-Flow/
- **Hosting:** GitHub Pages
- **Technology:** Vanilla JavaScript, HTML5, CSS3
- **Features:** Progressive Web App, Responsive Design

### Backend (Render)
- **URL:** https://daily-tracker-upst.onrender.com/
- **Hosting:** Render.com
- **Technology:** Node.js, Express.js, MongoDB
- **Features:** REST API, Authentication, Data Persistence

## 🚀 Quick Start

### 🌐 Use the Live Application
**No installation required!** Start tracking your progress immediately:

👉 **[https://anupam6335.github.io/Focus-Flow/](https://anupam6335.github.io/Focus-Flow/)**

### Quick Start Steps:
1. **Visit:** https://anupam6335.github.io/Focus-Flow/
2. **Create account** or login
3. **Start tracking** your daily progress
4. **Access from any device** - always in sync!

## 💻 Local Development

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance (local or Atlas)

### Frontend Development

1. **Clone the repository**
```bash
git clone https://github.com/anupam6335/Focus-Flow.git
cd Focus-Flow
```

2. **Serve the application**
```bash
# Using Python (if available)
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using Live Server extension in VS Code
```

3. **Access locally**
```
http://localhost:8000
```

### Backend Development

1. **Navigate to backend directory** (if separate)
2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/focusflow
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

4. **Start the backend server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. **Backend will run on**
```
http://localhost:3000
```

## 🔧 Configuration

### CORS Setup
The application is configured for cross-origin requests between GitHub Pages and Render:

```javascript
// Backend CORS configuration
app.use(cors({
    origin: [
        'https://anupam6335.github.io',
        'https://daily-tracker-upst.onrender.com',
        'http://localhost:8000',
        'http://localhost:3000'
    ],
    credentials: true
}));
```

### API Configuration
The frontend automatically connects to the backend API at:
```
https://daily-tracker-upst.onrender.com/api
```

## 📖 Usage Guide

### Getting Started

1. **Visit the application** at https://anupam6335.github.io/Focus-Flow/
2. **Create your account** (takes 30 seconds)
3. **Start with Day 1** - no setup required
4. **Add items** to track your daily progress
5. **Mark completions** - watch your streaks grow
6. **Practice consistently** - your progress syncs automatically

### Basic Operations

**Adding new items:**
- Click the "+ Add Question" button in any editable day
- Enter item text and optional links
- Press Enter to save

**Tracking progress:**
- Click checkboxes to mark items as completed
- Watch your status indicators update automatically
- Celebrate achievements with visual rewards

**Managing tags and links:**
- Add colored tags for categorization
- Store important links as clickable tags
- Organize your resources efficiently

## 🏗️ Project Structure

### Frontend (GitHub Pages)
```
Focus-Flow/
├── index.html              # Main application file
├── focus-flow.ico          # Application icon
├── assets/                 # Static assets (if any)
└── README.md              # Documentation
```

### Backend (Render)
```
FocusFlow-Backend/
├── server.js               # Express server with API routes
├── package.json            # Dependencies and scripts
├── .env                    # Environment configuration
└── models/                 # Database models
    ├── User.js
    ├── ChecklistData.js
    ├── ActivityTracker.js
    └── PasswordReset.js
```

## 🔄 Sync & Data Management

### Cross-Origin Data Flow
- **Frontend** (GitHub Pages) ↔ **Backend** (Render.com)
- **Secure API communication** via HTTPS
- **JWT authentication** for secure data access
- **Automatic synchronization** between sessions

### Data Security
- **Encrypted passwords** using bcryptjs
- **JWT tokens** for secure authentication
- **User isolation** - data separated by account
- **Secure API** with proper validation

## 🎯 Analytics & Progress Tracking

### Key Metrics
- **Current Streak**: Consecutive days with activity
- **Total Solved**: Cumulative items completed
- **Daily Average**: Average items per day
- **Max Streak**: Longest consecutive activity period

### Visualization Features
- **Heatmap Calendar**: GitHub-style activity visualization
- **Progress Indicators**: Visual status for each day
- **Achievement Celebrations**: Motivational rewards for milestones
- **Trend Analysis**: Long-term progress tracking

## 🚀 Deployment

### Frontend Deployment (GitHub Pages)
1. Push changes to the `main` branch
2. GitHub Pages automatically deploys from the root directory
3. Application available at: https://anupam6335.github.io/Focus-Flow/

### Backend Deployment (Render)
1. Connect GitHub repository to Render
2. Configure environment variables in Render dashboard
3. Automatic deployments on git push
4. API available at: https://daily-tracker-upst.onrender.com/

## 🐛 Troubleshooting

### Common Issues

**CORS Errors:**
- Ensure backend CORS is properly configured
- Check that frontend URL is in allowed origins
- Verify API endpoints are accessible

**Sync Issues:**
- Check internet connection
- Verify login status
- Use "Sync Now" button for manual sync

**Performance:**
- Clear browser cache if experiencing slowness
- Ensure JavaScript is enabled
- Use supported browsers (Chrome, Firefox, Safari, Edge)

### API Status
- Backend Health Check: https://daily-tracker-upst.onrender.com/
- API Base URL: https://daily-tracker-upst.onrender.com/api

## 🤝 Contributing

We welcome contributions! Please feel free to submit pull requests or open issues for bugs and feature requests.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Support

- **Frontend Issues**: https://github.com/anupam6335/Focus-Flow/issues
- **Backend Issues**: https://github.com/anupam6335/FocusFlow/issues
- **Live Application**: https://anupam6335.github.io/Focus-Flow/

## 🙏 Acknowledgments

Built with ❤️ to help individuals build **consistent habits** that transform skills through daily practice.

*Special thanks to the open-source community for inspiring the development approach and tools used in this project.*

---

<div align="center">

## 🎯 Ready to Start Your Journey?

### 🌐 **Access the Live App Now:**
# [https://anupam6335.github.io/Focus-Flow/](https://anupam6335.github.io/Focus-Flow/)

**No installation required - start building your productive habits today!**

*"We are what we repeatedly do. Excellence, then, is not an act, but a habit."* - Aristotle

</div>

---

**📅 Your Progress Awaits!** What will you accomplish today to move closer to your goals? 🚀
