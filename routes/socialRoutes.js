const express = require("express");
const SocialLinks = require("../models/SocialLinks");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Get social links
router.get("/social-links", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    let socialLinks = await SocialLinks.findOne({ userId });
    if (!socialLinks) {
      // Create default empty social links
      socialLinks = await SocialLinks.create({
        userId,
        links: {
          linkedin: "",
          github: "",
          leetcode: "",
          gfg: "",
        },
      });
    }
    res.json({
      success: true,
      socialLinks: socialLinks.links,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update social links
router.put("/social-links", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.username;
    const { links } = req.body;

    if (!links) {
      return res
        .status(400)
        .json({ success: false, error: "Links data is required" });
    }

    let socialLinks = await SocialLinks.findOne({ userId });
    if (!socialLinks) {
      socialLinks = new SocialLinks({ userId });
    }

    // Update only the provided links
    socialLinks.links = {
      ...socialLinks.links,
      ...links,
    };
    socialLinks.lastUpdated = new Date();
    await socialLinks.save();

    res.json({
      success: true,
      socialLinks: socialLinks.links,
      message: "Social links updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get social links for any user (public data)
router.get("/social-links/:username", authenticateToken, async (req, res) => {
  try {
    const username = req.params.username;
    let socialLinks = await SocialLinks.findOne({ userId: username });
    if (!socialLinks) {
      // Return default empty social links
      socialLinks = {
        links: {
          linkedin: "",
          github: "",
          leetcode: "",
          gfg: "",
        },
      };
    }
    res.json({
      success: true,
      socialLinks: socialLinks.links,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;