/**
 * Global test setup
 */

import { beforeAll, beforeEach } from '@jest/globals';
import { setupTestDB, cleanTestDB } from './utils/testHelpers.js';

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

