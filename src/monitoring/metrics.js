import client from 'prom-client';

const register = new client.Registry();

register.setDefaultLabels({
  app: 'shorthand-backend',
  env: process.env.NODE_ENV || 'production'
});

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

  res.on('finish', () => {
    const route = resolveRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestCounter.labels(labels).inc();
    end(labels);
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


