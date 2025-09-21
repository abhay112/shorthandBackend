// src/services/batchService.js
import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Test from '../models/Test.js';
import { AppError } from '../utils/AppError.js';

class BatchService {
  /**
   * Create a new batch
   * @param {Object} batchData
   * @returns {Object} batch
   */
   async createBatch(batchData) {
    const { name } = batchData;

    // uniqueness check
    const existing = await Batch.findOne({ name });
    if (existing) throw new AppError("Batch with this name already exists", 400);

    const batch = new Batch(batchData);
    await batch.save();

    // populate for friendly response
    await batch.populate("createdBy", "name email").execPopulate?.() || await batch.populate([
      { path: "createdBy", select: "name email" },
      { path: "students", select: "name email" },
      { path: "tests", select: "title" }
    ]);

    return batch;
  }

  /**
   * Get all batches with pagination
   * @param {Object} options
   * @returns {Object} batches and pagination info
   */
  async getAllBatches(options = {}) {
    const { page = 1, limit = 10, isActive, createdBy } = options;
    const skip = (page - 1) * limit;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (createdBy) filter.createdBy = createdBy;

    const batches = await Batch.find(filter)
      .populate('createdBy', 'name email')
      .populate('students', 'name email')
      .populate('tests', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Batch.countDocuments(filter);

    return {
      batches,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Get batch by ID
   * @param {string} batchId
   * @returns {Object} batch
   */
  async getBatchById(batchId) {
    const batch = await Batch.findById(batchId)
      .populate('createdBy', 'name email')
      .populate('students', 'name email isApproved')
      .populate('tests', 'title duration');

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    return batch;
  }

  /**
   * Update batch
   * @param {string} batchId
   * @param {Object} updateData
   * @returns {Object} updated batch
   */
  async updateBatch(batchId, updateData) {
    const { name } = updateData;

    if (name) {
      const existing = await Batch.findOne({ name, _id: { $ne: batchId } });
      if (existing) throw new AppError("Batch with this name already exists", 400);
    }

    const updatePayload = {
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.maxStudents !== undefined && { maxStudents: updateData.maxStudents }),
      ...(updateData.startDate !== undefined && { startDate: updateData.startDate }),
      ...(updateData.endDate !== undefined && { endDate: updateData.endDate }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      // optionally allow passing students/tests arrays to replace current lists
      ...(updateData.assignedStudents !== undefined && { students: updateData.assignedStudents }),
      ...(updateData.assignedTests !== undefined && { tests: updateData.assignedTests }),
    };

    const batch = await Batch.findByIdAndUpdate(batchId, updatePayload, {
      new: true,
      runValidators: true
    })
      .populate("createdBy", "name email")
      .populate("students", "name email")
      .populate("tests", "title");

    if (!batch) throw new AppError("Batch not found", 404);

    return batch;
  }

  /**
   * Delete batch
   * @param {string} batchId
   * @returns {Object} success message
   */
  async deleteBatch(batchId) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Remove batch from all students
    await Student.updateMany(
      { assignedBatches: batchId },
      { $pull: { assignedBatches: batchId } }
    );

    // Remove batch from all tests
    await Test.updateMany(
      { assignedBatches: batchId },
      { $pull: { assignedBatches: batchId } }
    );

    await Batch.findByIdAndDelete(batchId);

    return { message: 'Batch deleted successfully' };
  }

  /**
   * Assign students to batch
   * @param {string} batchId
   * @param {Array} studentIds
   * @returns {Object} updated batch
   */
  async assignStudentsToBatch(batchId, studentIds) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Check if batch has capacity
    const currentStudentCount = batch.students.length;
    const newStudentCount = studentIds.length;
    
    if (currentStudentCount + newStudentCount > batch.maxStudents) {
      throw new AppError(`Batch capacity exceeded. Maximum ${batch.maxStudents} students allowed`, 400);
    }

    // Verify all students exist and are approved
    const students = await Student.find({
      _id: { $in: studentIds },
      isApproved: true,
      isBlocked: false,
    });

    if (students.length !== studentIds.length) {
      throw new AppError('Some students are not approved or blocked', 400);
    }

    // Add students to batch
    await Batch.findByIdAndUpdate(
      batchId,
      { $addToSet: { students: { $each: studentIds } } },
      { new: true }
    );

    // Add batch to students
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $addToSet: { assignedBatches: batchId } }
    );

    return await this.getBatchById(batchId);
  }

  /**
   * Remove students from batch
   * @param {string} batchId
   * @param {Array} studentIds
   * @returns {Object} updated batch
   */
  async removeStudentsFromBatch(batchId, studentIds) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Remove students from batch
    await Batch.findByIdAndUpdate(
      batchId,
      { $pull: { students: { $in: studentIds } } },
      { new: true }
    );

    // Remove batch from students
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $pull: { assignedBatches: batchId } }
    );

    return await this.getBatchById(batchId);
  }

  /**
   * Assign tests to batch
   * @param {string} batchId
   * @param {Array} testIds
   * @returns {Object} updated batch
   */
  async assignTestsToBatch(batchId, testIds) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Verify all tests exist and are active
    const tests = await Test.find({
      _id: { $in: testIds },
      isActive: true,
    });

    if (tests.length !== testIds.length) {
      throw new AppError('Some tests are not found or inactive', 400);
    }

    // Add tests to batch
    await Batch.findByIdAndUpdate(
      batchId,
      { $addToSet: { tests: { $each: testIds } } },
      { new: true }
    );

    // Add batch to tests
    await Test.updateMany(
      { _id: { $in: testIds } },
      { $addToSet: { assignedBatches: batchId } }
    );

    return await this.getBatchById(batchId);
  }

  /**
   * Remove tests from batch
   * @param {string} batchId
   * @param {Array} testIds
   * @returns {Object} updated batch
   */
  async removeTestsFromBatch(batchId, testIds) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Remove tests from batch
    await Batch.findByIdAndUpdate(
      batchId,
      { $pull: { tests: { $in: testIds } } },
      { new: true }
    );

    // Remove batch from tests
    await Test.updateMany(
      { _id: { $in: testIds } },
      { $pull: { assignedBatches: batchId } }
    );

    return await this.getBatchById(batchId);
  }

  /**
   * Get batches for a specific student
   * @param {string} studentId
   * @returns {Array} batches
   */
  async getBatchesForStudent(studentId) {
    const batches = await Batch.find({ students: studentId })
      .populate('createdBy', 'name email')
      .populate('tests', 'title duration')
      .sort({ createdAt: -1 });

    return batches;
  }

  /**
   * Get batches for a specific admin
   * @param {string} adminId
   * @returns {Array} batches
   */
  async getBatchesForAdmin(adminId) {
    const batches = await Batch.find({ createdBy: adminId })
      .populate('students', 'name email')
      .populate('tests', 'title')
      .sort({ createdAt: -1 });

    return batches;
  }
}

export default new BatchService();
