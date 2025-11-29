import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import commonRoutes from './routes/index.js';
import requestLogger from './middlewares/requestLogger.js';
import { handleError } from './middlewares/errorHandler.js';
import logger from './utils/logger.js';
import { specs, swaggerUi } from './config/swagger.js';
import dotenv from 'dotenv';
dotenv.config(); 

import { dbConnection, PORT } from './config/index.js'; 
import {
  getMetrics,
  getMetricsContentType,
  metricsMiddleware,
} from './monitoring/metrics.js';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5714',
      'http://192.168.0.115:5714',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie and session middleware
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Request logging middleware
app.use(requestLogger);
app.use(metricsMiddleware);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shorthand Typing Test API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', async (_req, res, next) => {
  try {
    res.set('Content-Type', getMetricsContentType());
    res.set('Cache-Control', 'no-cache');
    res.send(await getMetrics());
  } catch (error) {
    next(error);
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Shorthand Typing Test API Documentation'
}));

// API routes
app.use('/api/v1', commonRoutes);

// Global error handling middleware (must be last)
app.use(handleError);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

logger.warn('Database URL:', dbConnection.url);

// Connect to MongoDB first, then start server
mongoose
  .connect(dbConnection.url, dbConnection.options)
  .then(() => {
    logger.warn('✅ MongoDB connected successfully');
    // Start server only after MongoDB connection
    app.listen(PORT, () => {
      logger.warn(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  })
  .catch(err => {
    logger.error('❌ MongoDB connection error:', err);
    logger.warn('⚠️  Starting server anyway for metrics collection, but database operations will fail');
    // Start server even if MongoDB fails (for metrics collection)
    app.listen(PORT, () => {
      logger.warn(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode (without DB)`);
    });
  });

