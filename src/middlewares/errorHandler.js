import logger from '../utils/logger.js';

export const handleError = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Prepare response
  const errorResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Log full error details with request/response context
  const errorLog = {
    error: {
      message: err.message,
      name: err.name,
      statusCode,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      route: req.route?.path || req.path,
      query: req.query,
      params: req.params,
      body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      headers: {
        'user-agent': req.get('user-agent'),
        'content-type': req.get('content-type'),
        'authorization': req.get('authorization') ? 'Bearer ***' : undefined,
      },
      ip: req.ip,
    },
    response: {
      statusCode,
      message,
    },
    user: {
      id: req.user?.id,
      role: req.user?.role,
      email: req.user?.email,
    },
    timestamp: new Date().toISOString(),
  };

  // Log as structured JSON for Loki
  logger.error(JSON.stringify(errorLog), { ...errorLog });

  res.status(statusCode).json(errorResponse);
};
