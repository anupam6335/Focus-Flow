/**
 * Authentication Middleware
 * JWT token verification and user authentication
 *
 * Now supports tokens sent either:
 *  - in the Authorization header (Bearer ...)
 *  - OR as a cookie named `ff_token` (httpOnly cookie)
 *
 * Make sure you have cookie-parser registered in server.js:
 *   import cookieParser from 'cookie-parser';
 *   app.use(cookieParser());
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/environment.js';

const sendUnauthorized = (res, message = 'Access token required') =>
  res.status(401).json({ success: false, error: message });

const sendForbidden = (res, message = 'Invalid or expired token') =>
  res.status(403).json({ success: false, error: message });

/**
 * Extract token from Authorization header or cookie.
 * Preference: Authorization header -> cookie fallback.
 */
function extractToken(req) {
  // 1. Authorization header (Bearer ...)
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (authHeader) {
    const parts = String(authHeader).split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
    // also accept raw token in header if supplied (less common)
    if (parts.length === 1) return parts[0];
  }

  // 2. cookie fallback (cookie-parser must be used in server)
  if (req.cookies && req.cookies.ff_token) {
    return req.cookies.ff_token;
  }

  // 3. query string fallback (not recommended, but helpful for testing) - optional
  if (req.query && req.query.ff_token) {
    return req.query.ff_token;
  }

  return null;
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticateToken = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return sendUnauthorized(res, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // find user by username in token payload
    const username = decoded && decoded.username;
    if (!username) return sendForbidden(res, 'Invalid token payload');

    const user = await User.findOne({ username });
    if (!user) {
      return sendUnauthorized(res, 'Invalid token');
    }

    // attach minimal user info to req (avoid polluting with full mongoose doc if not needed)
    req.user = user;
    return next();
  } catch (error) {
    console.error('Token verification error:', error && error.message ? error.message : error);
    return sendForbidden(res, 'Invalid or expired token');
  }
};

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid
 */
export const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next(); // Continue without user
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const username = decoded && decoded.username;
    if (!username) return next();

    // Use the same find as authenticateToken
    const user = await User.findOne({ username });
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Invalid token, but we don't fail the request
    if (process.env.NODE_ENV !== 'production') {
      console.log('Optional auth: Invalid token, continuing without user ->', error && error.message);
    }
  }

  return next();
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
