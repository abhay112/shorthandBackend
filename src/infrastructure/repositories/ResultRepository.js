/**
 * Result Repository
 * Handles all data access operations for Result entity
 */

import BaseRepository from './base/BaseRepository.js';
import Result from '../../models/Result.js';

class ResultRepository extends BaseRepository {
  constructor() {
    super(Result);
  }

  /**
   * Find results by student
   */
  async findByStudent(studentId, options = {}) {
    return await this.find(
      { studentId, ...options.query },
      {
        populate: ['testId', 'batchId'],
        sort: options.sort || { submittedAt: -1 },
        limit: options.limit,
        skip: options.skip,
      }
    );
  }

  /**
   * Find results by test
   */
  async findByTest(testId, options = {}) {
    return await this.find(
      { testId, ...options.query },
      {
        populate: ['studentId', 'batchId'],
        sort: options.sort || { wpm: -1 },
        limit: options.limit,
        skip: options.skip,
      }
    );
  }

  /**
   * Find results by batch
   */
  async findByBatch(batchId, options = {}) {
    return await this.find(
      { batchId, ...options.query },
      {
        populate: ['studentId', 'testId'],
        sort: options.sort || { submittedAt: -1 },
        limit: options.limit,
        skip: options.skip,
      }
    );
  }

  /**
   * Find results by student and test
   */
  async findByStudentAndTest(studentId, testId) {
    return await this.find({ studentId, testId });
  }

  /**
   * Get student statistics
   */
  async getStudentStatistics(studentId) {
    return await this.aggregate([
      { $match: { studentId: studentId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageWpm: { $avg: '$wpm' },
          averageAccuracy: { $avg: '$accuracy' },
          bestWpm: { $max: '$wpm' },
          bestAccuracy: { $max: '$accuracy' },
          totalTimeSpent: { $sum: '$timeTaken' },
        },
      },
    ]);
  }

  /**
   * Get top performers for a test
   */
  async getTopPerformers(testId, limit = 10) {
    return await this.find(
      { testId, status: 'completed' },
      {
        populate: ['studentId'],
        sort: { wpm: -1, accuracy: -1 },
        limit,
      }
    );
  }
}

export default new ResultRepository();

