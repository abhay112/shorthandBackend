/**
 * Refactored Student Service with Dependency Injection
 * This demonstrates the TDD-ready pattern
 */

import { createError } from '../../utils/AppError.js';

class StudentServiceRefactored {
  constructor({
    studentRepository,
    batchRepository,
    resultRepository,
    testRepository,
  } = {}) {
    // Dependency injection - repositories are injected, not imported
    this.studentRepository = studentRepository;
    this.batchRepository = batchRepository;
    this.resultRepository = resultRepository;
    this.testRepository = testRepository;
  }

  /**
   * Get student profile
   */
  async getProfile(studentId) {
    if (!this.studentRepository) {
      throw new Error('StudentRepository not injected');
    }

    const student = await this.studentRepository.findById(studentId);
    
    if (!student) {
      throw createError('Student not found', 404);
    }

    // Get statistics using repository
    const stats = await this.resultRepository.getStudentStatistics(studentId);
    const statistics = stats && stats.length > 0 ? stats[0] : {
      totalTests: 0,
      averageWpm: 0,
      averageAccuracy: 0,
      bestWpm: 0,
      bestAccuracy: 0,
      totalTimeSpent: 0,
    };
    
    return {
      _id: student._id,
      name: student.name || '',
      email: student.email || '',
      role: student.role || 'student',
      isApproved: student.isApproved || false,
      isBlocked: student.isBlocked || false,
      statistics,
    };
  }

  /**
   * Update student profile
   */
  async updateProfile(studentId, updateData) {
    if (!this.studentRepository) {
      throw new Error('StudentRepository not injected');
    }

    const allowedUpdates = ['name'];
    const updates = {};

    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const student = await this.studentRepository.updateById(
      studentId,
      updates,
      { new: true, runValidators: true }
    );

    if (!student) {
      throw createError('Student not found', 404);
    }

    return {
      _id: student._id,
      name: student.name || '',
      email: student.email || '',
      role: student.role || 'student',
      isApproved: student.isApproved || false,
      isBlocked: student.isBlocked || false,
      updatedAt: student.updatedAt,
    };
  }

  /**
   * Handle login
   */
  async handleLogin(email, name, firebaseUid) {
    if (!this.studentRepository) {
      throw new Error('StudentRepository not injected');
    }

    let student = await this.studentRepository.findByEmail(email);

    if (student) {
      // Update last login
      student = await this.studentRepository.updateLastLogin(student._id);
      if (!student.firebaseUid) {
        student = await this.studentRepository.updateById(student._id, {
          firebaseUid,
        });
      }
      return student;
    }

    // Create new student
    student = await this.studentRepository.create({
      email,
      name,
      firebaseUid,
      lastLogin: new Date(),
    });

    return student;
  }
}

export default StudentServiceRefactored;

