/**
 * Test utilities and helpers
 */

import mongoose from 'mongoose';
import { jest } from '@jest/globals';

/**
 * Setup test database connection
 */
export const setupTestDB = async () => {
  const mongoUri = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/test_shorthand';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
};

/**
 * Clean test database
 */
export const cleanTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Close test database connection
 */
export const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

/**
 * Create a test user object
 */
export const createTestUser = (overrides = {}) => ({
  id: new mongoose.Types.ObjectId().toString(),
  email: 'test@example.com',
  name: 'Test User',
  role: 'student',
  firebaseUid: 'test-firebase-uid',
  ...overrides,
});

/**
 * Create a test student object
 */
export const createTestStudent = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  firebaseUid: 'test-firebase-uid',
  name: 'Test Student',
  email: 'student@test.com',
  role: 'student',
  isApproved: true,
  isBlocked: false,
  isOnlineMode: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a test batch object
 */
export const createTestBatch = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Batch',
  description: 'Test batch description',
  createdBy: new mongoose.Types.ObjectId(),
  isActive: true,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  maxStudents: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a test test object
 */
export const createTestTest = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  title: 'Test Test',
  description: 'Test description',
  difficulty: 'intermediate',
  category: 'comprehensive',
  testType: 'practice',
  duration: 300,
  maxRetakes: 3,
  uploadedBy: new mongoose.Types.ObjectId(),
  isActive: true,
  isPublished: true,
  isBlocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a test result object
 */
export const createTestResult = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  studentId: new mongoose.Types.ObjectId(),
  batchId: new mongoose.Types.ObjectId(),
  testId: new mongoose.Types.ObjectId(),
  wpm: 50.5,
  accuracy: 95.5,
  speed: 50.5,
  totalWords: 100,
  correctWords: 95,
  incorrectWords: 5,
  totalCharacters: 500,
  correctCharacters: 475,
  incorrectCharacters: 25,
  timeTaken: 120,
  timeStarted: new Date(),
  timeCompleted: new Date(),
  attemptNumber: 1,
  isRetake: false,
  sessionId: 'test-session-id',
  status: 'completed',
  isValid: true,
  submittedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Mock Express request object
 */
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: null,
  ip: '127.0.0.1',
  ...overrides,
});

/**
 * Mock Express response object
 */
export const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Mock Express next function
 */
export const createMockNext = () => {
  return jest.fn();
};

/**
 * Wait for async operations
 */
export const wait = (ms) => new Promise(resolve => {
  // eslint-disable-next-line no-undef
  setTimeout(resolve, ms);
});

