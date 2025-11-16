import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const httpRequestCounter = new client.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestCounter);

export const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer();
  const startTime = Date.now();

  res.on('finish', async () => {
    const route = resolveRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestCounter.labels(labels).inc();
    end(labels);

    // Log errors with context for Loki (4xx and 5xx)
    if (res.statusCode >= 400) {
      const { default: logger } = await import('../utils/logger.js');
      const errorLog = {
        type: 'http_error',
        statusCode: res.statusCode,
        method: req.method,
        route: route,
        url: req.originalUrl,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        params: Object.keys(req.params).length > 0 ? req.params : undefined,
        body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
        responseTime: Date.now() - startTime,
        user: {
          id: req.user?.id,
          role: req.user?.role,
        },
        timestamp: new Date().toISOString(),
      };
      
      if (res.statusCode >= 500) {
        logger.error(JSON.stringify(errorLog), { ...errorLog });
      } else {
        logger.warn(JSON.stringify(errorLog), { ...errorLog });
      }
    }
  });

  next();
};

export const getMetrics = async () => register.metrics();

export const getMetricsContentType = () => register.contentType;

function resolveRoute(req) {
  if (req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }

  if (req.baseUrl) {
    return req.baseUrl;
  }

  if (req.path) {
    return req.path;
  }

  if (req.originalUrl) {
    return req.originalUrl.split('?')[0];
  }

  return 'unknown_route';
}

