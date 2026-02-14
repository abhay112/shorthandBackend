import logger from '../utils/logger.js';

/**

 * Middleware to log HTTP requests in a structured format
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    logger.info(`${method} ${originalUrl} ${statusCode} ${duration}ms`, {
      method,
      url: originalUrl,
      statusCode,
      duration,
      requestId: req.id,
      user: req.user ? { id: req.user.id, role: req.user.role } : undefined
    });
  });

  next();
};

export default requestLogger;