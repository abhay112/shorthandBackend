import express from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Basic health check endpoint
 * Returns 200 if the server is running
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

/**
 * Readiness probe
 * Checks if the application is ready to serve traffic
 * Verifies database connectivity
 */
router.get('/health/ready', async (_req, res) => {
  const checks = {
    database: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      // Try a simple operation
      await mongoose.connection.db.admin().ping();
      checks.database = true;
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
  }

  const isReady = checks.database;
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString()
  });
});

/**
 * Liveness probe
 * Checks if the application is alive (not crashed)
 */
router.get('/health/live', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  });
});

export default router;

