import morgan from 'morgan';
import logger from '../utils/logger.js';

// Create a custom token for user ID
morgan.token('userId', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

morgan.token('userRole', (req) => {
  return req.user ? req.user.role : 'guest';
});

// Define custom format
const customFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - User: :userId Role: :userRole';

// Create morgan middleware
const requestLogger = morgan(customFormat, {
  stream: {
    write: (message) => {
      logger.http(message.trim());
    }
  }
});

export default requestLogger;