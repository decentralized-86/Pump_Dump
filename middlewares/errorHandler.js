const logger = require('../services/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.tgId
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate Entry Error',
      field: Object.keys(err.keyValue)[0]
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Authentication Error',
      error: err.message
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error'
      : err.message
  });
};

module.exports = errorHandler; 