/**
 * Checklist Validation Middleware
 */

/**
 * Validate question data for add/edit operations
 */
export const validateQuestionData = (req, res, next) => {
  const { questionText, difficulty, day } = req.body;
  const errors = [];

  if (questionText && questionText.trim().length === 0) {
    errors.push('Question text cannot be empty');
  }

  if (questionText && questionText.length > 500) {
    errors.push('Question text must be less than 500 characters');
  }

  if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    errors.push('Difficulty must be Easy, Medium, or Hard');
  }

  if (day && (isNaN(day) || day < 1)) {
    errors.push('Day must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(', ')
    });
  }

  next();
};

/**
 * Validate question ID parameter
 */
export const validateQuestionId = (req, res, next) => {
  const questionId = req.params.id;

  if (!questionId || questionId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Question ID is required'
    });
  }

  // Basic MongoDB ObjectId validation
  if (questionId.length !== 24) {
    return res.status(400).json({
      success: false,
      error: 'Invalid question ID format'
    });
  }

  next();
};