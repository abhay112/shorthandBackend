/**
 * Student Repository
 * Handles all data access operations for Student entity
 */

import BaseRepository from './base/BaseRepository.js';
import Student from '../../models/Student.js';

class StudentRepository extends BaseRepository {
  constructor() {
    super(Student);
  }

  /**
   * Find student by email
   */
  async findByEmail(email) {
    return await this.findOne({ email });
  }

  /**
   * Find student by Firebase UID
   */
  async findByFirebaseUid(firebaseUid) {
    return await this.findOne({ firebaseUid });
  }

  /**
   * Find approved students
   */
  async findApproved() {
    return await this.find({ isApproved: true, isBlocked: false });
  }

  /**
   * Find blocked students
   */
  async findBlocked() {
    return await this.find({ isBlocked: true });
  }

  /**
   * Find students by manager
   */
  async findByManager(managerId) {
    return await this.find({ managedBy: managerId });
  }

  /**
   * Approve student
   */
  async approveStudent(studentId, adminId) {
    return await this.updateById(studentId, {
      isApproved: true,
      approvedBy: adminId,
      approvedAt: new Date(),
    });
  }

  /**
   * Block student
   */
  async blockStudent(studentId, reason = null) {
    return await this.updateById(studentId, {
      isBlocked: true,
      blockReason: reason,
    });
  }

  /**
   * Unblock student
   */
  async unblockStudent(studentId) {
    return await this.updateById(studentId, {
      isBlocked: false,
      blockReason: null,
    });
  }

  /**
   * Update last login
   */
  async updateLastLogin(studentId) {
    return await this.updateById(studentId, {
      lastLogin: new Date(),
    });
  }
}

// Export singleton instance
export default new StudentRepository();

