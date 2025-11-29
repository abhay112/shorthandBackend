/**
 * Global test setup
 */

import { beforeAll, beforeEach, afterAll } from '@jest/globals';
import { setupTestDB, cleanTestDB, closeTestDB } from './utils/testHelpers.js';
import mongoose from 'mongoose';

// Setup before all tests
beforeAll(async () => {
  // Only connect if not already connected
  if (process.env.NODE_ENV === 'test') {
    await setupTestDB();
  }
});

// Clean database before each test
beforeEach(async () => {
  if (process.env.NODE_ENV === 'test') {
    await cleanTestDB();
  }
});

// Cleanup after all tests - close MongoDB connection
afterAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    if (mongoose.connection.readyState !== 0) {
      await closeTestDB();
    }
    // Force close any remaining connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}, 30000); // 30 second timeout

