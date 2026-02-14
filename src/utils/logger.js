import winston from 'winston';
import path from 'path';
import fs from 'fs';

const appName = 'shorthand-backend';
const logDir = '/opt/apps/shorthand-backend/logs';

// Ensure logs directory exists (if permissions allow)
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  console.warn(`Could not create log directory ${logDir}, falling back to local logs directory`);
}

const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: appName },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'app.log'),
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;

