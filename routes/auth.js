/**
 * Authentication Routes - Mandatory email with username/email login support
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import ChecklistData from '../models/ChecklistData.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateRegistration, validateEmail } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import config from '../config/environment.js';
import { AUTH } from '../utils/constants.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with MANDATORY email
 * @access  Public
 */
router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;

  // Validate that email is provided for local auth
  if (!email || email.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Email is required for registration'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }

  // Check if user already exists by username
  const existingUserByUsername = await User.findOne({ username });
  if (existingUserByUsername) {
    return res.status(400).json({
      success: false,
      error: 'Username already exists'
    });
  }

  // Check if email already exists for local auth users
  const existingUserByEmail = await User.findOne({ 
    email: email.toLowerCase(), 
    authProvider: 'local' 
  });
  if (existingUserByEmail) {
    return res.status(400).json({
      success: false,
      error: 'Email already registered'
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS);

  // Create user with email (NO VERIFICATION)
  const user = new User({
    username: username.toLowerCase(),
    password: hashedPassword,
    email: email.toLowerCase(),
    authProvider: 'local',
    isAdmin: false,
    // No email verification fields
  });

  await user.save();

  // Create default data for new user
  await ChecklistData.getUserData(username);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: {
      username: user.username,
      email: user.email,
      authProvider: user.authProvider
    }
  });
}));


/**
 * @route   POST /api/auth/login
 * @desc    Login user with username OR email and password
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { identifier, username, password } = req.body; // Support both identifier and username

  // Support both 'identifier' and 'username' fields for backward compatibility
  const loginIdentifier = identifier || username;
  
  // Validate input
  if (!loginIdentifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username/email and password are required'
    });
  }

  if (loginIdentifier.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Username/email cannot be empty'
    });
  }

  // Find user by username OR email
  const user = await User.findForLogin(loginIdentifier.trim());

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'Invalid username/email or password'
    });
  }

  // Handle different authentication providers
  if (user.authProvider === 'local') {
    // For local auth, verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username/email or password'
      });
    }
  } else {
    // For OAuth users, they should use their OAuth provider
    return res.status(400).json({
      success: false,
      error: `Please use ${user.authProvider} authentication to login`,
      authProvider: user.authProvider
    });
  }

  // Generate token
  const token = jwt.sign({ username: user.username }, config.JWT_SECRET, {
    expiresIn: AUTH.TOKEN_EXPIRY,
  });

  // Update last active timestamp
  await user.updateLastActive();

  // Set cookie so browser will include it on subsequent API calls.
  // Match same options used for OAuth callbacks.
  res.cookie('ff_token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    token,
    message: 'Login successful',
    user: {
      username: user.username,
      email: user.email,
      authProvider: user.authProvider
    }
  });
}));

/**
 * @route   POST /api/auth/validate-credentials
 * @desc    Validate if username/email and password are correct (for frontend pre-validation)
 * @access  Public
 */
router.post('/validate-credentials', asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username/email and password are required'
    });
  }

  const user = await User.findForLogin(identifier.trim());

  if (!user) {
    return res.json({
      success: true,
      valid: false,
      message: 'Invalid username/email or password'
    });
  }

  if (user.authProvider !== 'local') {
    return res.json({
      success: true,
      valid: false,
      message: `Please use ${user.authProvider} authentication`,
      authProvider: user.authProvider
    });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  
  res.json({
    success: true,
    valid: validPassword,
    message: validPassword ? 'Credentials are valid' : 'Invalid password'
  });
}));

// PASSWORD RESET ROUTES (remain the same but enhanced)

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset OTP to email (OTP shown directly to user)
 * @access  Public
 */
router.post('/forgot-password', validateEmail, asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user by email (only local auth users)
  const user = await User.findOne({ 
    email: email.toLowerCase(), 
    authProvider: 'local' 
  });

  // Return success even if user doesn't exist for security
  if (!user) {
    return res.json({
      success: true,
      message: 'If the email is registered, a reset OTP has been sent',
      otp: null // Don't return OTP for non-existent emails
    });
  }

  // Generate and save OTP
  const resetRecord = await PasswordReset.createOTP(email.toLowerCase());
  
  // FIX: Always return OTP for development/testing
  // In production, you might implement secure email delivery
  const shouldReturnOTP = config.NODE_ENV !== 'production'; // Return OTP in all non-production environments
  
  res.json({
    success: true,
    message: 'If the email is registered, a reset OTP has been sent',
    otp: shouldReturnOTP ? resetRecord.otp : null,
    expiresIn: '10 minutes',
    // Security note for frontend: OTP should be displayed securely to the user
    securityNote: 'This OTP is sensitive. Please ensure it is not visible to others.'
  });
}));

/**
 * @route   POST /api/auth/verify-reset-otp
 * @desc    Verify password reset OTP (secure - only for the requesting user)
 * @access  Public
 */
router.post('/verify-reset-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Email and OTP are required'
    });
  }

  // Validate OTP
  const resetRecord = await PasswordReset.validateOTP(email.toLowerCase(), otp);

  if (!resetRecord) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired OTP'
    });
  }

  // Check if too many attempts
  if (resetRecord.attempts > 5) {
    return res.status(400).json({
      success: false,
      error: 'Too many OTP attempts. Please request a new OTP.'
    });
  }

  res.json({
    success: true,
    message: 'OTP verified successfully',
    canReset: true,
    // Return minimal info for security
    userInfo: {
      email: email.toLowerCase(),
      // Don't return username or other sensitive info
    }
  });
}));


/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with verified OTP
 * @access  Public
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Email, OTP, and new password are required'
    });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 4 characters long'
    });
  }

  // Verify OTP one more time
  const resetRecord = await PasswordReset.validateOTP(email.toLowerCase(), otp);
  if (!resetRecord) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired OTP'
    });
  }

  // Find user
  const user = await User.findOne({ 
    email: email.toLowerCase(), 
    authProvider: 'local' 
  });
  
  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'User not found'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, AUTH.BCRYPT_ROUNDS);
  user.password = hashedPassword;
  await user.save();

  // Mark OTP as used
  await PasswordReset.markAsUsed(email.toLowerCase(), otp);

  // Delete all OTPs for this email
  await PasswordReset.deleteMany({ email: email.toLowerCase() });

  res.json({
    success: true,
    message: 'Password reset successfully',
    // Don't return sensitive user information
  });
}));


/**
 * @route   GET /api/auth/secure-otp-check
 * @desc    Admin-only route to check OTP status (for security monitoring)
 * @access  Private (Admin only)
 */
router.get('/secure-otp-check', authenticateToken, asyncHandler(async (req, res) => {
  // Check if user is admin
  const user = await User.findOne({ username: req.user.username });
  if (!user || !user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  // Get active OTPs for this email (admin only)
  const activeOTPs = await PasswordReset.find({
    email: email.toLowerCase(),
    expiresAt: { $gt: new Date() },
    used: false
  }).select('otp expiresAt attempts createdAt').lean();

  res.json({
    success: true,
    activeOTPs: activeOTPs.map(otp => ({
      // Don't return full OTP even to admin for security
      otp: `****`, // Masked for security
      expiresAt: otp.expiresAt,
      attempts: otp.attempts,
      createdAt: otp.createdAt
    })),
    totalActive: activeOTPs.length
  });
}));

/**
 * @route   POST /api/auth/check-email
 * @desc    Check if email is available for registration
 * @access  Public
 */
router.post('/check-email', validateEmail, asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existingUser = await User.findOne({ 
    email: email.toLowerCase(), 
    authProvider: 'local' 
  });

  res.json({
    success: true,
    available: !existingUser,
    message: existingUser ? 'Email already registered' : 'Email available'
  });
}));

/**
 * @route   PUT /api/auth/update-email
 * @desc    Update user email (for existing users)
 * @access  Private
 */
router.put('/update-email', authenticateToken, validateEmail, asyncHandler(async (req, res) => {
  const { newEmail } = req.body;
  const username = req.user.username;

  // Check if email is already used by another local auth user
  const existingUser = await User.findOne({ 
    email: newEmail.toLowerCase(), 
    authProvider: 'local',
    username: { $ne: username } // Exclude current user
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Email already registered with another account'
    });
  }

  // Update user email
  await User.findOneAndUpdate(
    { username },
    { 
      email: newEmail.toLowerCase(),
      isEmailVerified: false // Reset verification status
    }
  );

  res.json({
    success: true,
    message: 'Email updated successfully'
  });
}));


/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify JWT token
 * @access  Private
 */
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user.username
  });
});

/**
 * @route   PUT /api/auth/update-username
 * @desc    Update username
 * @access  Private
 */
router.put('/update-username', authenticateToken, asyncHandler(async (req, res) => {
  const { newUsername } = req.body;
  const currentUsername = req.user.username;

  if (!newUsername || newUsername.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Username is required'
    });
  }

  const trimmedUsername = newUsername.trim().toLowerCase();

  // Check username length
  if (trimmedUsername.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Username must be at least 3 characters long'
    });
  }

  // Check if username is the same
  if (trimmedUsername === currentUsername) {
    return res.status(400).json({
      success: false,
      error: 'New username is the same as current username'
    });
  }

  // Check if username already exists
  const existingUser = await User.findOne({ username: trimmedUsername });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Username already taken'
    });
  }

  // Update username across all collections
  await Promise.all([
    User.findOneAndUpdate(
      { username: currentUsername },
      { username: trimmedUsername }
    ),
    ChecklistData.findOneAndUpdate(
      { userId: currentUsername },
      { userId: trimmedUsername }
    ),
  ]);

  // Generate new token with updated username
  const newToken = jwt.sign({ username: trimmedUsername }, config.JWT_SECRET, {
    expiresIn: AUTH.TOKEN_EXPIRY,
  });

  res.json({
    success: true,
    message: 'Username updated successfully',
    newUsername: trimmedUsername,
    newToken: newToken,
  });
}));

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check username availability
 * @access  Public
 */
router.get('/check-username/:username', asyncHandler(async (req, res) => {
  const username = req.params.username.trim().toLowerCase();

  if (!username || username.length < 3) {
    return res.json({
      success: true,
      available: false,
      message: 'Username must be at least 3 characters long'
    });
  }

  const existingUser = await User.findOne({ username });

  res.json({
    success: true,
    available: !existingUser,
    message: existingUser ? 'Username already taken' : 'Username available'
  });
}));

// OAuth Routes - UNCHANGED
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/auth?auth_error=google',
  session: false,
}), (req, res) => {
  const token = jwt.sign({ username: req.user.username }, config.JWT_SECRET, {
    expiresIn: AUTH.TOKEN_EXPIRY,
  });

  // Set token as cookie and redirect to home
  res.cookie('ff_token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.redirect('/');
});

router.get('/github', passport.authenticate('github', {
  scope: ['user:email'],
}));

router.get('/github/callback', passport.authenticate('github', {
  failureRedirect: '/auth?auth_error=github',
  session: false,
}), (req, res) => {
  const token = jwt.sign({ username: req.user.username }, config.JWT_SECRET, {
    expiresIn: AUTH.TOKEN_EXPIRY,
  });

  // Set token as cookie and redirect to home
  res.cookie('ff_token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.redirect('/');
});

router.post('/logout', (req, res) => {
  // Clear the JWT cookie
  res.clearCookie('ff_token', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/', // must match how you set it
  });

  // Send a single response
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   GET /api/auth/environment
 * @desc    Check current environment (for debugging)
 * @access  Public
 */
router.get('/environment', (req, res) => {
  res.json({
    success: true,
    environment: config.NODE_ENV,
    baseUrl: config.BASE_URL,
    otpEnabled: config.NODE_ENV !== 'production'
  });
});

/**
 * @route   POST /api/auth/get-auth-provider
 * @desc    Return the auth provider for a given email (google | github | local | null)
 * @access  Public
 */
router.post('/get-auth-provider', validateEmail, asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const v = email.trim().toLowerCase();
  const user = await User.findOne({ email: v }).select('authProvider');

  if (!user) {
    return res.json({
      success: true,
      exists: false,
      authProvider: null,
      message: 'No user found with this email'
    });
  }

  const provider = user.authProvider || 'local';
  return res.json({
    success: true,
    exists: true,
    authProvider: provider,
    message: `User uses ${provider} authentication`
  });
}));


export default router;