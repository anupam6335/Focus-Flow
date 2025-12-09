/**
 * Admin Authentication Middleware
 * Verifies if user has admin privileges
 */

import User from '../models/User.js';

/**
 * Verify if user is admin
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error verifying admin privileges'
    });
  }
};

/**
 * Optional admin check - doesn't fail but adds isAdmin to request
 */
export const optionalAdmin = async (req, res, next) => {
  try {
    if (req.user) {
      const user = await User.findOne({ username: req.user.username });
      req.isAdmin = user && user.isAdmin;
    } else {
      req.isAdmin = false;
    }
    
    next();
  } catch (error) {
    req.isAdmin = false;
    next();
  }
};