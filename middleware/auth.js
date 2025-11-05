/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/environment.js';

/**
 * Verify JWT token and attach user to request
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // DEBUG: Log the decoded token
    console.log('Decoded token:', decoded);
    
    const user = await User.findOne({ username: decoded.username });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    // DEBUG: Log the found user
    console.log('Found user:', user.username);
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findByUsername(decoded.username);
    
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Invalid token, but we don't fail the request
    console.log('Optional auth: Invalid token, continuing without user');
  }
  
  next();
};

/**
 * Admin-only middleware (for future use)
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }
  next();
};