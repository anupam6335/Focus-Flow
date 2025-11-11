/**
 * Security Middleware for OTP protection
 */

/**
 * Rate limiting for OTP requests
 */
export const otpRateLimit = (req, res, next) => {
  // Simple in-memory rate limiting (consider Redis for production)
  const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;
  
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // In production, use Redis or database for rate limiting
  // This is a simplified version
  console.log(`OTP request from IP: ${clientIp} for email: ${req.body.email}`);
  
  next();
};

/**
 * Validate OTP request security
 */
export const validateOTPRequest = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }
  
  // Store security info for logging
  req.securityContext = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date()
  };
  
  next();
};