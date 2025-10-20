const express = require("express");
const jwt = require("jsonwebtoken");
const Blog = require("../models/Blog");
const { authenticateToken } = require("../middleware/auth");
const { generateSlug } = require("../utils/helpers");

const router = express.Router();

// Track blog views
router.post("/blogs/:slug/view", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }
    // Increment view count
    blog.views = (blog.views || 0) + 1;
    await blog.save();
    res.json({
      success: true,
      views: blog.views,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get popular blogs based on popularity score (likes + views)
router.get("/blogs/popular", authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    let query = { isPublic: true };
    
    // If user is authenticated, also show their private blogs
    if (req.user) {
      query = {
        $or: [
          { isPublic: true },
          { author: req.user.username, isPublic: false },
        ],
      };
    }

    const blogs = await Blog.find(query).select(
      "title slug author isPublic tags likes likedBy views createdAt updatedAt content"
    );

    // Calculate popularity score and sort
    const blogsWithPopularity = blogs
      .map((blog) => ({
        ...blog.toObject(),
        popularityScore: (blog.likes || 0) + (blog.views || 0),
      }))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      blogs: blogsWithPopularity,
    });
  } catch (error) {
    console.error("Error in popular blogs route:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all public blogs (for "All Blogs" tab) - Public access
router.get("/blogs/all", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Only show public blogs for "All Blogs"
    const query = { isPublic: true };
    
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title slug author isPublic tags createdAt updatedAt content likes likedBy views"
      );

    const total = await Blog.countDocuments(query);
    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's blogs (for "My Blogs" tab) - Show all user's blogs
router.get("/blogs/my", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Show all blogs by the current user (both public and private)
    const query = { author: req.user.username };
    
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title slug author isPublic tags createdAt updatedAt content likes likedBy views"
      );

    const total = await Blog.countDocuments(query);
    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Main blogs route with flexible querying
router.get("/blogs", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, author } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { isPublic: true };
    
    // If user is authenticated, also show their private blogs
    if (req.user) {
      query = {
        $or: [
          { isPublic: true },
          { author: req.user.username, isPublic: false },
        ],
      };
    }
    
    // Filter by author if specified
    if (author) {
      query.author = author;
      // If viewing own blogs, show private ones too
      if (req.user && author === req.user.username) {
        query = { author: author };
      } else {
        // If viewing other user's blogs, only show public ones
        query = { author: author, isPublic: true };
      }
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title slug author isPublic tags createdAt updatedAt content likes likedBy views"
      );

    const total = await Blog.countDocuments(query);
    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single blog by slug - Fixed private blog access
router.get("/blogs/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Check if user can access private blog
    if (!blog.isPublic) {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.username !== blog.author) {
            return res
              .status(403)
              .json({ success: false, error: "Access denied" });
          }
        } catch (error) {
          return res
            .status(403)
            .json({ success: false, error: "Access denied" });
        }
      } else {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    }

    res.json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new blog (protected)
router.post("/blogs", authenticateToken, async (req, res) => {
  try {
    const { title, content, isPublic = true, tags = [] } = req.body;
    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, error: "Title and content are required" });
    }

    // Generate slug from title
    const slug = generateSlug(title);

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res
        .status(400)
        .json({ success: false, error: "Blog with this title already exists" });
    }

    const blog = new Blog({
      title,
      slug,
      content,
      author: req.user.username,
      isPublic,
      tags,
    });
    await blog.save();

    res.status(201).json({
      success: true,
      blog: {
        ...blog.toObject(),
        id: blog._id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update blog (protected - author only)
router.put("/blogs/:slug", authenticateToken, async (req, res) => {
  try {
    const { title, content, isPublic, tags } = req.body;
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Check if user is the author
    if (blog.author !== req.user.username) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    let newSlug = blog.slug;
    if (title && title !== blog.title) {
      newSlug = generateSlug(title);
      // Check if new slug already exists
      const existingBlog = await Blog.findOne({ slug: newSlug });
      if (existingBlog && existingBlog._id.toString() !== blog._id.toString()) {
        return res.status(400).json({
          success: false,
          error: "Blog with this title already exists",
        });
      }
    }

    blog.title = title || blog.title;
    blog.slug = newSlug;
    blog.content = content || blog.content;
    blog.isPublic = isPublic !== undefined ? isPublic : blog.isPublic;
    blog.tags = tags || blog.tags;
    blog.updatedAt = new Date();
    await blog.save();

    res.json({
      success: true,
      blog: {
        ...blog.toObject(),
        id: blog._id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete blog (protected - author only)
router.delete("/blogs/:slug", authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    // Check if user is the author
    if (blog.author !== req.user.username) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    await Blog.deleteOne({ slug: req.params.slug });
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's blogs (protected) - Alternative endpoint
router.get("/my-blogs", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const blogs = await Blog.find({ author: req.user.username })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("title slug author isPublic tags createdAt updatedAt likes views");
    const total = await Blog.countDocuments({ author: req.user.username });
    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update like route with self-like restriction
router.post("/blogs/:slug/like", authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    const username = req.user.username;

    // Prevent self-like
    if (blog.author === username) {
      return res.status(400).json({
        success: false,
        error: "Cannot like your own blog",
      });
    }

    const hasLiked = blog.likedBy.includes(username);
    if (hasLiked) {
      // Unlike the blog
      blog.likes = Math.max(0, blog.likes - 1);
      blog.likedBy = blog.likedBy.filter((user) => user !== username);
    } else {
      // Like the blog
      blog.likes += 1;
      blog.likedBy.push(username);
    }

    await blog.save();
    res.json({
      success: true,
      likes: blog.likes,
      hasLiked: !hasLiked, // Return the new state
      message: hasLiked ? "Blog unliked" : "Blog liked",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;