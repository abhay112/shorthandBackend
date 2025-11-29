/**
 * Factory functions for creating test data
 */

import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

/**
 * Student factory
 */
export const studentFactory = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  firebaseUid: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'student',
  isApproved: faker.datatype.boolean(),
  isBlocked: false,
  isOnlineMode: true,
  approvedBy: new mongoose.Types.ObjectId(),
  approvedAt: faker.date.past(),
  managedBy: new mongoose.Types.ObjectId(),
  lastLogin: faker.date.recent(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * Admin factory
 */
export const adminFactory = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  firebaseUid: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: faker.helpers.arrayElement(['admin', 'super_admin']),
  isActive: true,
  lastLogin: faker.date.recent(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * Batch factory
 */
export const batchFactory = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  name: faker.company.name() + ' Batch',
  description: faker.lorem.sentence(),
  createdBy: new mongoose.Types.ObjectId(),
  isActive: true,
  startDate: faker.date.past(),
  endDate: faker.date.future(),
  maxStudents: faker.number.int({ min: 10, max: 100 }),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * Test factory
 */
export const testFactory = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  title: faker.lorem.words(3),
  description: faker.lorem.sentence(),
  audioURL: faker.internet.url(),
  referenceText: faker.lorem.paragraph(),
  difficulty: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced', 'expert']),
  category: faker.helpers.arrayElement(['dictation', 'transcription', 'speed_test', 'accuracy_test', 'comprehensive']),
  testType: faker.helpers.arrayElement(['curriculum', 'practice', 'assessment', 'special']),
  duration: faker.number.int({ min: 60, max: 600 }),
  maxRetakes: faker.number.int({ min: 1, max: 5 }),
  uploadedBy: new mongoose.Types.ObjectId(),
  isActive: true,
  isPublished: true,
  isBlocked: false,
  publishedAt: faker.date.past(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * Result factory
 */
export const resultFactory = (overrides = {}) => {
  const totalWords = overrides.totalWords || faker.number.int({ min: 50, max: 200 });
  const accuracy = overrides.accuracy || faker.number.float({ min: 70, max: 100, precision: 0.1 });
  const totalCharacters = overrides.totalCharacters || faker.number.int({ min: 200, max: 1000 });
  const correctWords = Math.floor(totalWords * (accuracy / 100));
  const correctCharacters = Math.floor(totalCharacters * (accuracy / 100));

  return {
    _id: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    batchId: new mongoose.Types.ObjectId(),
    testId: new mongoose.Types.ObjectId(),
    wpm: faker.number.float({ min: 20, max: 100, precision: 0.1 }),
    accuracy,
    speed: faker.number.float({ min: 20, max: 100, precision: 0.1 }),
    totalWords,
    correctWords,
    incorrectWords: totalWords - correctWords,
    totalCharacters,
    correctCharacters,
    incorrectCharacters: totalCharacters - correctCharacters,
    timeTaken: faker.number.int({ min: 60, max: 600 }),
    timeStarted: faker.date.past(),
    timeCompleted: faker.date.recent(),
    attemptNumber: faker.number.int({ min: 1, max: 3 }),
    isRetake: false,
    sessionId: faker.string.uuid(),
    status: 'completed',
    isValid: true,
    rank: faker.number.int({ min: 1, max: 100 }),
    percentile: faker.number.float({ min: 0, max: 100, precision: 0.1 }),
    submittedAt: faker.date.recent(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

/**
 * TestSession factory
 */
export const testSessionFactory = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  studentId: new mongoose.Types.ObjectId(),
  batchId: new mongoose.Types.ObjectId(),
  testId: new mongoose.Types.ObjectId(),
  sessionId: faker.string.uuid(),
  currentAttempt: 1,
  totalAttempts: 0,
  status: faker.helpers.arrayElement(['not_started', 'in_progress', 'completed', 'abandoned']),
  timeStarted: faker.date.past(),
  timeCompleted: null,
  timeExpires: faker.date.future(),
  canRetake: true,
  maxRetakes: 3,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * StudentBatch factory
 */
export const studentBatchFactory = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  studentId: new mongoose.Types.ObjectId(),
  batchId: new mongoose.Types.ObjectId(),
  enrolledBy: new mongoose.Types.ObjectId(),
  enrolledAt: faker.date.past(),
  status: faker.helpers.arrayElement(['active', 'completed', 'dropped', 'suspended']),
  enrolledUntil: faker.date.future(),
  notes: faker.lorem.sentence(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * BatchTestAssignment factory
 */
export const batchTestAssignmentFactory = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  batchId: new mongoose.Types.ObjectId(),
  testId: new mongoose.Types.ObjectId(),
  assignedBy: new mongoose.Types.ObjectId(),
  assignedAt: faker.date.past(),
  assignedDate: faker.date.future(),
  dayNumber: faker.number.int({ min: 1, max: 30 }),
  priority: faker.number.int({ min: 1, max: 10 }),
  status: 'active',
  availableFrom: faker.date.past(),
  availableUntil: faker.date.future(),
  isActive: true,
  isClosed: false,
  rankingsGenerated: false,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

