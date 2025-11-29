/**
 * Batch Repository
 * Handles all data access operations for Batch entity
 */

import BaseRepository from './base/BaseRepository.js';
import Batch from '../../models/Batch.js';

class BatchRepository extends BaseRepository {
  constructor() {
    super(Batch);
  }

  /**
   * Find batch by name
   */
  async findByName(name) {
    return await this.findOne({ name });
  }

  /**
   * Find active batches
   */
  async findActive() {
    return await this.find({ isActive: true });
  }

  /**
   * Find batches by creator
   */
  async findByCreator(creatorId) {
    return await this.find({ createdBy: creatorId });
  }

  /**
   * Find batches within date range
   */
  async findInDateRange(startDate, endDate) {
    return await this.find({
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
        { startDate: null, endDate: null },
      ],
    });
  }
}

export default new BatchRepository();

