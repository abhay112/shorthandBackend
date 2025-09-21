// src/middlewares/errorHandler.js
import logger from '../utils/logger.js';

/**
 * Global error handler middleware
 */
export const handleError = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log full error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    userRole: req.user?.role
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
