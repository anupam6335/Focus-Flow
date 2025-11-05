/**
 * Social Routes
 * Handles social features like following, social links, and user status
 */

import express from 'express';
import User from '../models/User.js';
import SocialLinks from '../models/SocialLinks.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @route   GET /api/social/links
 * @desc    Get social links for authenticated user
 * @access  Private
 */
router.get('/links', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  let socialLinks = await SocialLinks.findOne({ userId });

  if (!socialLinks) {
    // Create default empty social links
    socialLinks = await SocialLinks.create({
      userId,
      links: {
        linkedin: '',
        github: '',
        leetcode: '',
        gfg: '',
      },
    });
  }

  res.json({
    success: true,
    socialLinks: socialLinks.links,
  });
}));

/**
 * @route   PUT /api/social/links
 * @desc    Update social links
 * @access  Private
 */
router.put('/links', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { links } = req.body;

  if (!links) {
    return res.status(400).json({
      success: false,
      error: 'Links data is required'
    });
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
    message: 'Social links updated successfully',
  });
}));

/**
 * @route   GET /api/social/links/:username
 * @desc    Get social links for any user (public)
 * @access  Public
 */
router.get('/links/:username', asyncHandler(async (req, res) => {
  const username = req.params.username;

  let socialLinks = await SocialLinks.findOne({ userId: username });

  if (!socialLinks) {
    // Return default empty social links
    socialLinks = {
      links: {
        linkedin: '',
        github: '',
        leetcode: '',
        gfg: '',
      },
    };
  }

  res.json({
    success: true,
    socialLinks: socialLinks.links,
  });
}));

/**
 * @route   POST /api/social/follow/:username
 * @desc    Follow a user
 * @access  Private
 */
router.post('/follow/:username', authenticateToken, asyncHandler(async (req, res) => {
  const currentUser = req.user.username;
  const targetUsername = req.params.username;

  if (currentUser === targetUsername) {
    return res.status(400).json({
      success: false,
      error: 'Cannot follow yourself'
    });
  }

  // Check if target user exists
  const targetUser = await User.findOne({ username: targetUsername });
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Add to following list if not already following
  await User.findOneAndUpdate(
    { username: currentUser },
    { $addToSet: { following: targetUsername } }
  );

  res.json({
    success: true,
    message: `You are now following ${targetUsername}`,
    action: 'followed',
  });
}));

/**
 * @route   POST /api/social/unfollow/:username
 * @desc    Unfollow a user
 * @access  Private
 */
router.post('/unfollow/:username', authenticateToken, asyncHandler(async (req, res) => {
  const currentUser = req.user.username;
  const targetUsername = req.params.username;

  // Remove from following list
  await User.findOneAndUpdate(
    { username: currentUser },
    { $pull: { following: targetUsername } }
  );

  res.json({
    success: true,
    message: `You have unfollowed ${targetUsername}`,
    action: 'unfollowed',
  });
}));

/**
 * @route   GET /api/social/is-following/:username
 * @desc    Check if current user is following a specific user
 * @access  Private
 */
router.get('/is-following/:username', authenticateToken, asyncHandler(async (req, res) => {
  const currentUser = req.user.username;
  const targetUsername = req.params.username;

  const user = await User.findOne({ username: currentUser });
  const isFollowing = user.following.includes(targetUsername);

  res.json({
    success: true,
    isFollowing,
  });
}));

/**
 * @route   GET /api/social/followers/:username
 * @desc    Get followers list for a user
 * @access  Public
 */
router.get('/followers/:username', asyncHandler(async (req, res) => {
  const username = req.params.username;

  // Find all users who are following this user
  const followers = await User.find(
    { following: username },
    'username createdAt lastActive isOnline'
  );

  res.json({
    success: true,
    followers: followers.map((user) => ({
      username: user.username,
      accountCreated: user.createdAt,
      lastActive: user.lastActive,
      isOnline: user.isOnline,
    })),
  });
}));

/**
 * @route   GET /api/social/following/:username
 * @desc    Get following list for a user
 * @access  Public
 */
router.get('/following/:username', asyncHandler(async (req, res) => {
  const username = req.params.username;

  const user = await User.findOne({ username }, 'following');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Since we're storing usernames directly, we need to fetch user details
  const followingUsers = await User.find(
    { username: { $in: user.following } },
    'username createdAt lastActive isOnline'
  );

  res.json({
    success: true,
    following: followingUsers.map((user) => ({
      username: user.username,
      accountCreated: user.createdAt,
      lastActive: user.lastActive,
      isOnline: user.isOnline,
    })),
  });
}));

/**
 * @route   GET /api/social/mutual-connections/:username
 * @desc    Get mutual connections between current user and target user
 * @access  Private
 */
router.get('/mutual-connections/:username', authenticateToken, asyncHandler(async (req, res) => {
  const currentUser = req.user.username;
  const targetUsername = req.params.username;

  // Get current user's following list
  const currentUserData = await User.findOne({ username: currentUser });
  if (!currentUserData) {
    return res.status(404).json({
      success: false,
      error: 'Current user not found'
    });
  }

  // Get target user's followers list
  const targetUserFollowers = await User.find({
    following: targetUsername,
  }).select('username isOnline lastActive createdAt');

  // Find mutual connections
  const mutualConnections = targetUserFollowers.filter(
    (follower) =>
      currentUserData.following &&
      currentUserData.following.includes(follower.username)
  );

  // Format the response
  const formattedConnections = mutualConnections.map((user) => ({
    username: user.username,
    isOnline: user.isOnline || false,
    lastActive: user.lastActive || user.createdAt,
    accountCreated: user.createdAt,
  }));

  res.json({
    success: true,
    mutualConnections: formattedConnections,
    count: formattedConnections.length,
  });
}));

/**
 * @route   GET /api/social/user-status/:username
 * @desc    Get user status (online/offline and last active)
 * @access  Private
 */
router.get('/user-status/:username', authenticateToken, asyncHandler(async (req, res) => {
  const username = req.params.username;

  const user = await User.findOne({ username }).select(
    'isOnline lastActive username'
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.json({
    success: true,
    status: {
      isOnline: user.isOnline,
      lastActive: user.lastActive,
      username: user.username,
    },
  });
}));

/**
 * @route   POST /api/social/users-status
 * @desc    Get multiple users status
 * @access  Private
 */
router.post('/users-status', authenticateToken, asyncHandler(async (req, res) => {
  const { usernames } = req.body;

  if (!usernames || !Array.isArray(usernames)) {
    return res.status(400).json({
      success: false,
      error: 'Usernames array is required'
    });
  }

  const users = await User.find({
    username: { $in: usernames },
  }).select('isOnline lastActive username');

  const statusMap = {};
  users.forEach((user) => {
    statusMap[user.username] = {
      isOnline: user.isOnline,
      lastActive: user.lastActive,
    };
  });

  res.json({
    success: true,
    status: statusMap,
  });
}));

export default router;