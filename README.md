# 🌿 FocusFlow - Track Your Progress, Master Your Journey

[![Version](https://img.shields.io/badge/version-2.2.0-blue)](https://github.com/anupam6335/FocusFlow)
[![Live Demo](https://img.shields.io/badge/demo-live%20project-success)](https://focus-flow-lopn.onrender.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0-brightgreen)](package.json)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-green)](https://mongodb.com)

## 🎯 The Story Behind FocusFlow

> "I almost lost everything. After months of solving complex Data Structures and Algorithms problems, my hard drive crashed. Weeks of carefully crafted solutions, optimization notes, and 'aha!' moments—gone in an instant. The worst part? I couldn't even remember the elegant solution to a problem I'd solved just two weeks prior during a crucial technical interview."

**This was my reality.** Like thousands of developers, I was solving DSA problems across multiple platforms—LeetCode, HackerRank, CodeForces—but my progress was scattered, my insights were fleeting, and my learning was disorganized.

### The Breaking Point
- **Lost Local Notes**: Hard drive failure wiped out months of progress
- **Interview Amnesia**: Forgetting optimal solutions to previously solved problems
- **Invisible Progress**: No way to visualize consistency or track improvement over time
- **Isolated Learning**: Solving in silos without community wisdom or shared insights

### The Solution Born from Frustration
FocusFlow emerged from this pain. It's not just another progress tracker—it's the system I wish I had when I was preparing for technical interviews and building my problem-solving skills. A unified platform that combines **progress tracking**, **visual analytics**, and **community learning** into one cohesive experience.

## ✨ What is FocusFlow?

FocusFlow is a comprehensive web application designed specifically for developers tracking their Data Structures and Algorithms journey. It transforms scattered coding practice into organized, measurable progress with built-in community features for shared learning.

---

## 🚀 Live Application

### 🌐 **Single Unified URL:**
# [https://focus-flow-lopn.onrender.com/](https://focus-flow-lopn.onrender.com/)

**One URL, Three Powerful Interfaces:**
- **📊 Progress Tracker**: `https://focus-flow-lopn.onrender.com/`
- **📝 Blog Platform**: `https://focus-flow-lopn.onrender.com/blogs.html`
- **🔍 Blog Reader**: `https://focus-flow-lopn.onrender.com/blogs/your-blog-slug`

---

## 🎯 Core Features

### 📊 Intelligent Progress Tracking
- **Daily DSA Problem Management** with completion tracking
- **GitHub-style Heatmap** for visual consistency tracking
- **Streak Analytics** (current streak, max streak, daily averages)
- **Smart Tagging System** for problem categorization
- **Link Management** with URL-to-tag conversion
- **Achievement Celebrations** for milestone recognition

### 📝 Integrated Blogging Platform
- **Markdown-Powered Editor** with live preview
- **Public/Private Blog Control** for sharing or personal notes
- **Real-time View Tracking** and engagement analytics
- **Like System** with community interaction
- **Popularity-Based Ranking** (views + likes)
- **Tag-Based Categorization** for discoverability

### 🔐 Enterprise-Grade Infrastructure
- **JWT Authentication** with 230-day sessions
- **Real-time Multi-device Sync** with conflict resolution
- **Offline-First Architecture** with local storage caching
- **Password Recovery System** with OTP verification
- **Secure API Architecture** with proper validation

---

## 🏗️ System Architecture & Workflow

### High-Level System Architecture

```mermaid
graph TB
    %% ========== USERS ==========
    User[👤 User]:::user
    
    %% ========== FRONTEND COMPONENTS ==========
    subgraph Frontend[🌐 Frontend - Single Page Application]
        A[index.html<br/>Progress Tracker]:::frontend
        B[blogs.html<br/>Blog Platform]:::frontend
        C[blog-view.html<br/>Blog Reader]:::frontend
        D[Local Storage<br/>Offline Cache]:::storage
    end
    
    %% ========== BACKEND API ==========
    subgraph Backend[⚙️ Backend API - Render]
        E[server.js<br/>Express Server]:::backend
        F[JWT Authentication<br/>Security Layer]:::security
        G[API Routes<br/>RESTful Endpoints]:::api
        H[Real-time Sync Engine]:::sync
    end
    
    %% ========== DATABASE COLLECTIONS ==========
    subgraph Database[🗄️ MongoDB Atlas]
        I[👥 Users Collection]:::dbUsers
        J[📝 Blogs Collection]:::dbBlogs
        K[📊 Progress Data]:::dbProgress
        L[📈 Activity Analytics]:::dbAnalytics
    end
    
    %% ========== DATA FLOW ==========
    User --> A
    User --> B
    User --> C
    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    E --> I
    E --> J
    E --> K
    E --> L
    
    %% ========== STYLING ==========
    classDef user fill:#4CAF50,color:white,stroke:#388E3C,stroke-width:2px
    classDef frontend fill:#2196F3,color:white,stroke:#1976D2,stroke-width:2px
    classDef backend fill:#9C27B0,color:white,stroke:#7B1FA2,stroke-width:2px
    classDef security fill:#F44336,color:white,stroke:#D32F2F,stroke-width:2px
    classDef api fill:#FF9800,color:white,stroke:#F57C00,stroke-width:2px
    classDef sync fill:#009688,color:white,stroke:#00796B,stroke-width:2px
    classDef storage fill:#795548,color:white,stroke:#5D4037,stroke-width:2px
    classDef dbUsers fill:#607D8B,color:white,stroke:#455A64,stroke-width:2px
    classDef dbBlogs fill:#E91E63,color:white,stroke:#C2185B,stroke-width:2px
    classDef dbProgress fill:#3F51B5,color:white,stroke:#303F9F,stroke-width:2px
    classDef dbAnalytics fill:#00BCD4,color:white,stroke:#0097A7,stroke-width:2px
```

### User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as MongoDB
    participant LS as Local Storage
    
    Note over U,LS: Registration Flow
    U->>F: Fill registration form
    F->>B: POST /api/register
    B->>DB: Check username uniqueness
    B->>B: Hash password (bcrypt)
    B->>DB: Create user record
    B->>DB: Create default progress data
    B->>F: Registration success
    
    Note over U,LS: Login Flow
    U->>F: Enter credentials
    F->>B: POST /api/login
    B->>DB: Find user by username
    B->>B: Verify password (bcrypt.compare)
    B->>B: Generate JWT token (230 days)
    B->>F: Return JWT token + user data
    F->>LS: Store token & user info
    F->>F: Update UI to logged-in state
    
    Note over U,LS: Auto-Login Flow
    F->>LS: Check for existing token
    F->>B: GET /api/verify-token
    B->>B: Verify JWT signature
    B->>F: Token valid response
    F->>F: Auto-login user
    
    Note over U,LS: Password Reset Flow
    U->>F: Request password reset
    F->>B: POST /api/forgot-password
    B->>DB: Generate & store OTP code
    B->>F: Return OTP (demo purposes)
    U->>F: Enter OTP + new password
    F->>B: POST /api/reset-password
    B->>DB: Validate OTP & expiry
    B->>B: Hash new password
    B->>DB: Update user password
    B->>F: Password reset success
```

### DSA Problem Tracking Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant LS as Local Storage
    participant B as Backend
    participant DB as MongoDB
    
    Note over U,DB: Add New Problem
    U->>F: Click "Add Question"
    F->>F: Create new question entry
    F->>LS: Save to localStorage immediately
    F->>F: Update UI instantly
    F->>B: POST /api/data (debounced)
    B->>DB: Save with version control
    B->>F: Return updated data
    
    Note over U,DB: Toggle Completion
    U->>F: Click checkbox
    F->>F: Toggle completion state
    F->>F: Trigger celebration if 5+ solved
    F->>LS: Save to localStorage
    F->>B: POST /api/data (background sync)
    B->>DB: Update completion status
    B->>B: Recalculate analytics
    B->>DB: Update activity tracker
    
    Note over U,DB: Edit Problem Details
    U->>F: Click question text/link
    F->>F: Open edit modal
    U->>F: Update text/URL
    F->>F: Validate input
    F->>LS: Save changes locally
    F->>B: POST /api/data
    B->>DB: Update problem details
    
    Note over U,DB: Add Tags/Links
    U->>F: Enter tag/link + press Enter
    F->>F: Create colored tag/link element
    F->>LS: Save to localStorage
    F->>B: POST /api/data
    B->>DB: Update tags/links array
```

### Blog Post Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as MongoDB
    
    Note over U,DB: Blog Creation
    U->>F: Click "Create Blog"
    F->>F: Open blog creation modal
    U->>F: Enter title, content, tags
    U->>F: Set public/private visibility
    U->>F: Click "Create Blog"
    F->>B: POST /api/blogs
    B->>B: Generate slug from title
    B->>DB: Check slug uniqueness
    B->>DB: Create blog document
    B->>F: Return created blog
    F->>F: Show success message
    F->>F: Redirect to blog view
    
    Note over U,DB: Blog Editing
    U->>F: Click "Edit Blog" (author only)
    F->>B: GET /api/blogs/:slug
    B->>DB: Fetch blog data
    B->>F: Return blog content
    F->>F: Populate edit modal
    U->>F: Make changes
    U->>F: Click "Update Blog"
    F->>B: PUT /api/blogs/:slug
    B->>DB: Update blog document
    B->>F: Return updated blog
    F->>F: Show update success
    
    Note over U,DB: Blog Viewing
    U->>F: Visit blog URL
    F->>B: GET /api/blogs/:slug
    B->>DB: Fetch blog + increment views
    B->>F: Return blog data
    F->>F: Render markdown content
    F->>F: Update view count display
    
    Note over U,DB: Blog Engagement
    U->>F: Click "Like" button
    F->>B: POST /api/blogs/:slug/like
    B->>B: Check not self-liking
    B->>DB: Toggle like status
    B->>F: Return updated like count
    F->>F: Update like UI
```

### Blog Discovery Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as MongoDB
    
    Note over U,DB: Browse All Blogs
    U->>F: Visit /blogs.html
    F->>B: GET /api/blogs/all
    B->>DB: Query public blogs
    B->>F: Return paginated results
    F->>F: Render blog grid
    F->>F: Apply responsive layout
    
    Note over U,DB: Filter My Blogs
    U->>F: Click "My Blogs" tab
    F->>B: GET /api/blogs/my
    B->>DB: Query user's blogs
    B->>F: Return user's blogs
    F->>F: Show edit/delete controls
    
    Note over U,DB: Discover Popular Blogs
    U->>F: Click "Popular" tab
    F->>B: GET /api/blogs/popular
    B->>DB: Query by popularity score
    B->>F: Return ranked blogs
    F->>F: Render with popularity indicators
    
    Note over U,DB: Search & Navigation
    U->>F: Scroll/paginate
    F->>B: Request next page
    B->>DB: Paginated query
    B->>F: Return additional blogs
    F->>F: Append to grid
```

---

## 🛠️ Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Progressive Web App with offline capabilities |
| **Backend** | Node.js, Express.js | RESTful API server with middleware |
| **Database** | MongoDB with Mongoose ODM | Document-based data storage |
| **Authentication** | JWT, bcryptjs | Secure user authentication & authorization |
| **Markdown** | Marked.js, DOMPurify | Safe markdown rendering & sanitization |
| **Deployment** | Render | Full-stack hosting platform |
| **Styling** | CSS Grid, Flexbox, CSS Variables | Responsive design with theme support |

---

## 📁 Project Folder Structure

```
FocusFlow/
├── 🎯 Core Application Files
│   ├── index.html              # Main progress tracker dashboard
│   ├── blogs.html              # Blog creation & management platform
│   ├── blog-view.html          # Individual blog post reader
│   └── responsive.css          # Mobile-first responsive styles
├── ⚙️ Server & Configuration
│   ├── server.js               # Monolithic Express server (Models + Routes + Auth)
│   ├── package.json            # Dependencies and npm scripts
│   └── .env                    # Environment variables (template)
└── 📄 Documentation
    ├── LICENSE                 # MIT License
    └── README.md               # This comprehensive documentation
```

### File Purpose Breakdown

**`index.html`** - Main Application Dashboard
- Progress tracking table with daily DSA problem management
- Real-time analytics dashboard with heatmap visualization
- User authentication interface
- Sync status indicators and controls

**`blogs.html`** - Blog Management Platform
- Three-tab interface (All Blogs, My Blogs, Popular)
- Blog creation modal with markdown editor
- Responsive blog card grid layout
- Like and engagement system

**`blog-view.html`** - Blog Reader
- Full markdown rendering with syntax highlighting
- View tracking and engagement features
- Draggable mini-map navigation
- Author controls for blog management

**`server.js`** - Monolithic Backend Server
- Express.js server with CORS and middleware
- MongoDB models and connection handling
- JWT authentication system
- 25+ API endpoints for all functionality
- Real-time sync with conflict resolution

**`responsive.css`** - Styling System
- Mobile-first responsive design
- CodeLeaf theme system (dark/light mode)
- Fluid typography and spacing
- Component-specific styles

---

## 🔧 Installation & Local Development

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- Git for version control

### Step-by-Step Setup

1. **Clone the Repository**
```bash
git clone https://github.com/anupam6335/FocusFlow.git
cd FocusFlow
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/focusflow
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

4. **Start Development Server**
```bash
npm run dev
```

5. **Access Application**
- Open browser to: `http://localhost:3000`
- Backend API: `http://localhost:3000/api`

### Database Setup Options

**Option A: MongoDB Atlas (Recommended)**
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string from "Connect" button
4. Replace in `.env` file

**Option B: Local MongoDB**
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/focusflow`

---

## 🚀 Production Deployment (Render)

### Backend Deployment on Render

1. **Create Render Account**
   - Visit [render.com](https://render.com)
   - Sign up with GitHub account

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure service:
     - **Name**: `focusflow-backend`
     - **Environment**: `Node`
     - **Region**: Choose closest to your users
     - **Branch**: `main`
     - **Root Directory**: `.` (root)
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

3. **Environment Variables**
   Add the following in Render dashboard:
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your-production-jwt-secret
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Your backend will be available at: `https://focusflow-backend.onrender.com`

### Frontend Deployment

Since this is a monolithic application with static file serving, the entire application is deployed as a single service on Render.

### Custom Domain (Optional)

1. **In Render Dashboard**
   - Go to your service settings
   - Click "Add Custom Domain"
   - Follow DNS configuration instructions

2. **DNS Configuration**
   - Add CNAME record pointing to your Render service URL
   - Wait for SSL certificate provisioning

---

## 🔌 API Reference

### Authentication Endpoints

#### `POST /api/register`
Create a new user account.

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

#### `POST /api/login`
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "message": "Login successful"
}
```

#### `POST /api/forgot-password`
Initiate password reset process.

**Request Body:**
```json
{
  "username": "your_username"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the username exists, a reset code has been sent",
  "demoCode": "123456"
}
```

#### `POST /api/reset-password`
Complete password reset with OTP.

**Request Body:**
```json
{
  "username": "your_username",
  "resetCode": "123456",
  "newPassword": "new_secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Progress Data Endpoints

#### `GET /api/data`
Retrieve user's progress data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "version": 1,
  "lastUpdated": "2025-01-20T10:30:00.000Z"
}
```

#### `POST /api/data`
Save user's progress data with conflict resolution.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": [...],
  "clientVersion": 1,
  "lastUpdated": "2025-01-20T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "version": 2,
  "lastUpdated": "2025-01-20T10:35:00.000Z"
}
```

#### `POST /api/force-sync`
Force synchronization from server data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "version": 2,
  "lastUpdated": "2025-01-20T10:35:00.000Z"
}
```

### Blog Endpoints

#### `GET /api/blogs/all`
Get paginated public blogs.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "blogs": [...],
  "totalPages": 5,
  "currentPage": 1,
  "total": 42
}
```

#### `GET /api/blogs/my`
Get user's blogs (public and private).

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "blogs": [...],
  "totalPages": 3,
  "currentPage": 1,
  "total": 25
}
```

#### `GET /api/blogs/popular`
Get blogs ranked by popularity.

**Query Parameters:**
- `limit` - Maximum items to return (default: 10)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "blogs": [...]
}
```

#### `POST /api/blogs`
Create a new blog.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Blog Title",
  "content": "Markdown content here...",
  "isPublic": true,
  "tags": ["coding", "algorithms"]
}
```

**Response:**
```json
{
  "success": true,
  "blog": {
    "title": "Blog Title",
    "slug": "blog-title",
    "content": "Markdown content here...",
    "author": "username",
    "isPublic": true,
    "tags": ["coding", "algorithms"],
    "likes": 0,
    "views": 0,
    "createdAt": "2025-01-20T10:30:00.000Z"
  }
}
```

#### `GET /api/blogs/:slug`
Get a specific blog by slug.

**Response:**
```json
{
  "success": true,
  "blog": {
    "title": "Blog Title",
    "slug": "blog-title",
    "content": "Full markdown content...",
    "author": "username",
    "isPublic": true,
    "tags": ["coding", "algorithms"],
    "likes": 5,
    "views": 42,
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  }
}
```

#### `PUT /api/blogs/:slug`
Update a blog (author only).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "isPublic": false,
  "tags": ["updated", "tags"]
}
```

**Response:**
```json
{
  "success": true,
  "blog": {
    "title": "Updated Title",
    "slug": "updated-title",
    "content": "Updated content...",
    "author": "username",
    "isPublic": false,
    "tags": ["updated", "tags"],
    "updatedAt": "2025-01-20T11:30:00.000Z"
  }
}
```

#### `DELETE /api/blogs/:slug`
Delete a blog (author only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Blog deleted successfully"
}
```

#### `POST /api/blogs/:slug/like`
Like or unlike a blog.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "likes": 6,
  "hasLiked": true,
  "message": "Blog liked"
}
```

#### `POST /api/blogs/:slug/view`
Increment blog view count.

**Response:**
```json
{
  "success": true,
  "views": 43
}
```

### Activity Tracker Endpoints

#### `GET /api/activity-tracker`
Get user's activity analytics.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "activityData": {
    "currentStreak": 7,
    "totalSolved": 45,
    "averageDaily": 3.2,
    "maxStreak": 15,
    "heatmapData": {...},
    "activityHistory": [...]
  }
}
```

#### `POST /api/activity-tracker`
Save activity tracker data.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "activityData": {
    "currentStreak": 7,
    "totalSolved": 45,
    "averageDaily": 3.2,
    "maxStreak": 15,
    "heatmapData": {...},
    "activityHistory": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Activity data saved successfully"
}
```

---

## 💾 Core Concepts & Data Models

### User Model
```javascript
{
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt hashed
  createdAt: { type: Date, default: Date.now }
}
```

### Progress Data Model
```javascript
{
  userId: { type: String, required: true },
  data: [{
    day: Number,
    questions: [{
      text: String,
      link: String,
      completed: Boolean
    }],
    tags: [{
      text: String,
      color: String
    }],
    links: String, // Legacy field
    linksArray: [{  // Modern field
      url: String,
      text: String
    }]
  }],
  lastUpdated: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
}
```

### Blog Model
```javascript
{
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  isPublic: { type: Boolean, default: true },
  tags: [{ type: String }],
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }], // Array of usernames
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### Activity Tracker Model
```javascript
{
  userId: { type: String, required: true },
  activityData: {
    currentStreak: { type: Number, default: 0 },
    totalSolved: { type: Number, default: 0 },
    averageDaily: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    heatmapData: { type: Object, default: {} },
    activityHistory: { type: Array, default: [] }
  },
  lastUpdated: { type: Date, default: Date.now }
}
```

### Password Reset Model
```javascript
{
  username: { type: String, required: true },
  resetCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Areas Needing Improvement
- **Code Structure**: Refactor monolithic `server.js` into modular architecture
- **Testing**: Add unit tests, integration tests, and end-to-end tests
- **Performance**: Optimize database queries and frontend rendering
- **Accessibility**: Improve screen reader support and keyboard navigation
- **Documentation**: Enhance API documentation and user guides

### Development Process
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style Guidelines
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- **MongoDB Atlas** for providing free database hosting
- **Render** for free tier hosting services
- **Marked.js** team for excellent markdown parsing
- The developer community for inspiration and feedback

---

## 🆘 Support & Community

- **🚀 Live Application**: [https://focus-flow-lopn.onrender.com/](https://focus-flow-lopn.onrender.com/)
- **🐛 Bug Reports**: Create GitHub Issues
- **💡 Feature Requests**: Use GitHub Discussions
- **❓ Questions**: Check this documentation first

---

<div align="center">

## 🚀 Ready to Transform Your DSA Journey?

### 🌐 **Start Tracking Today:**
# [https://focus-flow-lopn.onrender.com/](https://focus-flow-lopn.onrender.com/)

**Stop losing your progress. Start building your legacy.**

*"The expert in anything was once a beginner."* - Helen Hayes

⭐ **Star this repo if FocusFlow helps your coding journey!**

</div>

---

**Your future technical interviews will thank you for the consistent practice. What problem will you solve today?** 🚀
