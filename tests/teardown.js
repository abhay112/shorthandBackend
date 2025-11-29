/**
 * Global test teardown
 */

import { closeTestDB } from './utils/testHelpers.js';
import mongoose from 'mongoose';

// Cleanup after all tests
afterAll(async () => {
  if (process.env.NODE_ENV === 'test' && mongoose.connection.readyState !== 0) {
    await closeTestDB();
  }
});

