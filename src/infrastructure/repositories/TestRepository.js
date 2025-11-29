/**
 * Test Repository
 * Handles all data access operations for Test entity
 */

import BaseRepository from './base/BaseRepository.js';
import Test from '../../models/Test.js';

class TestRepository extends BaseRepository {
  constructor() {
    super(Test);
  }

  /**
   * Find published tests
   */
  async findPublished() {
    return await this.find({ 
      isPublished: true, 
      isActive: true,
      isBlocked: false,
    });
  }

  /**
   * Find active tests
   */
  async findActive() {
    return await this.find({ isActive: true });
  }

  /**
   * Find tests by uploader
   */
  async findByUploader(uploaderId) {
    return await this.find({ uploadedBy: uploaderId });
  }

  /**
   * Find tests by difficulty
   */
  async findByDifficulty(difficulty) {
    return await this.find({ difficulty });
  }

  /**
   * Find tests by category
   */
  async findByCategory(category) {
    return await this.find({ category });
  }

  /**
   * Find blocked tests
   */
  async findBlocked() {
    return await this.find({ isBlocked: true });
  }

  /**
   * Publish test
   */
  async publishTest(testId) {
    return await this.updateById(testId, {
      isPublished: true,
      publishedAt: new Date(),
    });
  }

  /**
   * Block test
   */
  async blockTest(testId, adminId, reason = null) {
    return await this.updateById(testId, {
      isBlocked: true,
      blockedBy: adminId,
      blockedAt: new Date(),
      blockReason: reason,
    });
  }

  /**
   * Unblock test
   */
  async unblockTest(testId) {
    return await this.updateById(testId, {
      isBlocked: false,
      blockedBy: null,
      blockedAt: null,
      blockReason: null,
    });
  }
}

export default new TestRepository();

