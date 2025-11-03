/**
 * Validation Middleware - Enhanced with mandatory email validation
 */

/**
 * Validate registration data with MANDATORY email
 */
export const validateRegistration = (req, res, next) => {
  const { username, password, email } = req.body;
  const errors = [];

  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (!password || password.length < 4) {
    errors.push('Password must be at least 4 characters long');
  }

  // NEW: Email is now mandatory
  if (!email || email.trim().length === 0) {
    errors.push('Email is required for registration');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(', ')
    });
  }

  // Sanitize inputs
  req.body.username = username.trim().toLowerCase();
  req.body.email = email.trim().toLowerCase();
  
  next();
};

/**
 * Validate email format
 */
export const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email || email.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate login credentials (username OR email)
 */
export const validateLogin = (req, res, next) => {
  const { identifier, password } = req.body;
  const errors = [];

  if (!identifier || identifier.trim().length === 0) {
    errors.push('Username or email is required');
  }

  if (!password || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(', ')
    });
  }

  req.body.identifier = identifier.trim();
  next();
};

// Existing validation functions remain unchanged...
export const validateBlog = (req, res, next) => {
  const { title, content } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Blog title is required');
  }

  if (!content || content.trim().length === 0) {
    errors.push('Blog content is required');
  }

  if (title && title.length > 200) {
    errors.push('Blog title must be less than 200 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(', ')
    });
  }

  next();
};

export const validateComment = (req, res, next) => {
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Comment content is required'
    });
  }

  if (content.length > 1000) {
    return res.status(400).json({
      success: false,
      error: 'Comment must be less than 1000 characters'
    });
  }

  req.body.content = content.trim();
  next();
};

export const validatePagination = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  
  req.query.page = page;
  req.query.limit = limit;
  req.query.skip = (page - 1) * limit;
  
  next();
};