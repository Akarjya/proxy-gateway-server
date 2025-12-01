/**
 * Error Handling Middleware
 */

const logger = require('../utils/logger');

/**
 * Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you requested was not found.'
  });
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path 
  });

  res.status(500).render('error', {
    title: 'Server Error',
    message: 'An unexpected error occurred. Please try again later.'
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};

