import logger from '../utils/logger.js';

/**
 * Global error handler middleware
 */
export const errorMiddleware = (error, req, res, next) => {
  let { statusCode = 500, message } = error;

  // Handle known Mongoose/JWT errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map((val) => val.message).join(', ');
  }
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }
  if (error.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
  }
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log once, centrally
  logger.error('Error occurred:', {
    message: error.message,
    statusCode,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    userRole: req.user?.role,
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};
