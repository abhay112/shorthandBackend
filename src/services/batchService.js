// src/services/batchService.js
import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Test from '../models/Test.js';
import StudentBatch from '../models/StudentBatch.js';
import BatchTestAssignment from '../models/BatchTestAssignment.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class BatchService {
  /**
   * Create a new batch
   * @param {Object} batchData
   * @returns {Object} batch
   */
   async createBatch(batchData) {
    const { name, students: assignedStudents = [], tests: assignedTests = [] } = batchData;

    // uniqueness check
    const existing = await Batch.findOne({ name });
    if (existing) throw new AppError("Batch with this name already exists", 400);

    // Create batch first
    const batch = new Batch(batchData);
    await batch.save();

    // Handle bidirectional relationships for students
    if (assignedStudents.length > 0) {
      // Verify students exist and are approved
      const students = await Student.find({
        _id: { $in: assignedStudents },
        isApproved: true,
        isBlocked: false,
      });

      if (students.length !== assignedStudents.length) {
        // Rollback batch creation
        await Batch.findByIdAndDelete(batch._id);
        throw new AppError('Some students are not approved or blocked', 400);
      }

      // Check batch capacity
      if (assignedStudents.length > batch.maxStudents) {
        // Rollback batch creation
        await Batch.findByIdAndDelete(batch._id);
        throw new AppError(`Batch capacity exceeded. Maximum ${batch.maxStudents} students allowed`, 400);
      }

      // Update student records with batch assignment
      await Student.updateMany(
        { _id: { $in: assignedStudents } },
        { $addToSet: { assignedBatches: batch._id } }
      );
    }

    // Handle bidirectional relationships for tests
    if (assignedTests.length > 0) {
      // Verify tests exist and are active
      const tests = await Test.find({
        _id: { $in: assignedTests },
        isActive: true,
      });

      if (tests.length !== assignedTests.length) {
        // Rollback batch creation and student assignments
        await Batch.findByIdAndDelete(batch._id);
        if (assignedStudents.length > 0) {
          await Student.updateMany(
            { _id: { $in: assignedStudents } },
            { $pull: { assignedBatches: batch._id } }
          );
        }
        throw new AppError('Some tests are not found or inactive', 400);
      }

      // Update test records with batch assignment
      await Test.updateMany(
        { _id: { $in: assignedTests } },
        { $addToSet: { assignedBatches: batch._id } }
      );
    }

    // Create StudentBatch entries for assigned students
    if (assignedStudents.length > 0) {
      const studentBatchEntries = assignedStudents.map(studentId => ({
        studentId,
        batchId: batch._id,
        enrolledBy: batch.createdBy,
        status: 'active'
      }));
      await StudentBatch.insertMany(studentBatchEntries);
    }

    // Note: Test assignments should be created via BatchTestAssignment join table
    // For now, we'll skip creating test assignments here as they require dates
    // Tests should be assigned using assignTestsToBatch or via BatchTestAssignment directly

    // Populate createdBy for response
    await batch.populate("createdBy", "name email");

    // Fetch students and tests using join tables for response
    const studentBatches = await StudentBatch.find({ batchId: batch._id })
      .populate('studentId', 'name email')
      .lean();
    const testAssignments = await BatchTestAssignment.find({ batchId: batch._id, status: 'active' })
      .populate('testId', 'title')
      .lean();
    
    batch.students = studentBatches.map(sb => sb.studentId).filter(Boolean);
    batch.tests = testAssignments.map(ta => ta.testId).filter(Boolean);

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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch students and tests for each batch using join tables
    const batchIds = batches.map(b => b._id);
    
    // Get students from StudentBatch join table
    const studentBatches = await StudentBatch.find({ 
      batchId: { $in: batchIds },
      status: 'active' 
    })
      .populate('studentId', 'name email')
      .lean();
    
    // Get tests from BatchTestAssignment join table
    const testAssignments = await BatchTestAssignment.find({ 
      batchId: { $in: batchIds },
      status: 'active',
      isActive: true
    })
      .populate('testId', 'title')
      .lean();
    
    // Group students and tests by batchId
    const studentsByBatch = {};
    const testsByBatch = {};
    
    studentBatches.forEach(sb => {
      const batchIdStr = sb.batchId.toString();
      if (!studentsByBatch[batchIdStr]) {
        studentsByBatch[batchIdStr] = [];
      }
      if (sb.studentId) {
        studentsByBatch[batchIdStr].push(sb.studentId);
      }
    });
    
    testAssignments.forEach(ta => {
      const batchIdStr = ta.batchId.toString();
      if (!testsByBatch[batchIdStr]) {
        testsByBatch[batchIdStr] = [];
      }
      if (ta.testId && !testsByBatch[batchIdStr].some(t => (t._id || t).toString() === (ta.testId._id || ta.testId).toString())) {
        testsByBatch[batchIdStr].push(ta.testId);
      }
    });
    
    // Attach students and tests to batches and convert to plain objects
    const batchesWithRelations = batches.map(batch => {
      const batchObj = batch.toObject ? batch.toObject() : batch;
      const batchIdStr = batchObj._id.toString();
      
      // Remove any old embedded arrays if they exist (from before schema migration)
      delete batchObj.students;
      delete batchObj.tests;
      
      // Always include students array (from join table or empty)
      batchObj.students = (studentsByBatch[batchIdStr] || []).map(s => s._id || s).filter(Boolean);
      
      // Always include tests array (from join table or empty)
      // Deduplicate tests and return just IDs
      const uniqueTestIds = [];
      const seenTestIds = new Set();
      const testList = testsByBatch[batchIdStr] || [];
      testList.forEach(test => {
        if (test) {
          const testId = (test._id || test).toString();
          if (!seenTestIds.has(testId)) {
            seenTestIds.add(testId);
            uniqueTestIds.push(testId);
          }
        }
      });
      // Always set tests array, even if empty - return IDs to match old format
      batchObj.tests = uniqueTestIds;
      
      return batchObj;
    });

    const total = await Batch.countDocuments(filter);

    return {
      batches: batchesWithRelations,
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
      .populate('createdBy', 'name email');

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Fetch students using StudentBatch join table
    const studentBatches = await StudentBatch.find({ 
      batchId: batchId,
      status: 'active' 
    })
      .populate('studentId', 'name email isApproved')
      .lean();
    
    // Fetch tests using BatchTestAssignment join table
    const testAssignments = await BatchTestAssignment.find({ 
      batchId: batchId,
      status: 'active',
      isActive: true
    })
      .populate('testId', 'title duration')
      .lean();
    
    // Attach students and tests to batch and convert to plain object
    const batchObj = batch.toObject ? batch.toObject() : batch;
    
    // Remove old embedded arrays if they exist
    delete batchObj.students;
    delete batchObj.tests;
    
    // Always include students array (return IDs to match old format)
    batchObj.students = studentBatches
      .map(sb => (sb.studentId?._id || sb.studentId || sb.studentId).toString())
      .filter(Boolean);
    
    // Get unique test IDs (deduplicate by testId)
    const uniqueTestIds = [];
    const seenTestIds = new Set();
    testAssignments.forEach(ta => {
      const test = ta.testId;
      if (test) {
        const testId = (test._id || test).toString();
        if (!seenTestIds.has(testId)) {
          seenTestIds.add(testId);
          uniqueTestIds.push(testId);
        }
      }
    });
    // Always include tests array (return IDs to match old format)
    batchObj.tests = uniqueTestIds;

    return batchObj;
  }

  /**
   * Update batch
   * @param {string} batchId
   * @param {Object} updateData
   * @returns {Object} updated batch
   */
  async updateBatch(batchId, updateData) {
    const { name, assignedStudents, assignedTests } = updateData;

    if (name) {
      const existing = await Batch.findOne({ name, _id: { $ne: batchId } });
      if (existing) throw new AppError("Batch with this name already exists", 400);
    }

    const batch = await Batch.findById(batchId);
    if (!batch) throw new AppError("Batch not found", 404);

    // Handle bidirectional relationship updates for students
    if (assignedStudents !== undefined) {
      // Get current enrollments from StudentBatch join table
      const currentEnrollments = await StudentBatch.find({ batchId, status: 'active' });
      const currentStudentIds = currentEnrollments.map(e => e.studentId.toString());
      const newStudentIds = assignedStudents || [];
      
      // Find students to add and remove
      const toAdd = newStudentIds.filter(id => !currentStudentIds.includes(id));
      const toRemove = currentStudentIds.filter(id => !newStudentIds.includes(id));

      // Verify new students exist and are approved
      if (toAdd.length > 0) {
        const students = await Student.find({
          _id: { $in: toAdd },
          isApproved: true,
          isBlocked: false,
        });

        if (students.length !== toAdd.length) {
          throw new AppError('Some students are not approved or blocked', 400);
        }

        // Check batch capacity
        const finalStudentCount = currentStudentIds.length - toRemove.length + toAdd.length;
        if (finalStudentCount > batch.maxStudents) {
          throw new AppError(`Batch capacity exceeded. Maximum ${batch.maxStudents} students allowed`, 400);
        }

        // Add batch to new students
        await Student.updateMany(
          { _id: { $in: toAdd } },
          { $addToSet: { assignedBatches: batchId } }
        );
      }

      // Remove batch from removed students
      if (toRemove.length > 0) {
        await Student.updateMany(
          { _id: { $in: toRemove } },
          { $pull: { assignedBatches: batchId } }
        );
      }
    }

    // Handle bidirectional relationship updates for tests
    // Note: Test assignments are now handled via BatchTestAssignment join table
    // This should be done using assignTestsToBatch or BatchTestAssignment directly
    if (assignedTests !== undefined) {
      logger.warn('assignedTests parameter in updateBatch is deprecated. Use assignTestsToBatch method or BatchTestAssignment directly.');
      // Optionally, you could handle test assignments here, but it's better to use dedicated methods
    }

    // Prepare update payload (exclude students and tests arrays as they no longer exist)
    const updatePayload = {
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.maxStudents !== undefined && { maxStudents: updateData.maxStudents }),
      ...(updateData.startDate !== undefined && { startDate: updateData.startDate }),
      ...(updateData.endDate !== undefined && { endDate: updateData.endDate }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
    };

    const updatedBatch = await Batch.findByIdAndUpdate(batchId, updatePayload, {
      new: true,
      runValidators: true
    })
      .populate("createdBy", "name email");

    // Update StudentBatch entries if students were changed
    if (assignedStudents !== undefined) {
      // Get current enrollments
      const currentEnrollments = await StudentBatch.find({ batchId, status: 'active' });
      const currentStudentIds = currentEnrollments.map(e => e.studentId.toString());
      const newStudentIds = assignedStudents.map(id => id.toString());
      
      const toAdd = newStudentIds.filter(id => !currentStudentIds.includes(id));
      const toRemove = currentStudentIds.filter(id => !newStudentIds.includes(id));
      
      // Add new enrollments
      if (toAdd.length > 0) {
        const studentBatchEntries = toAdd.map(studentId => ({
          studentId,
          batchId,
          enrolledBy: updatedBatch.createdBy,
          status: 'active'
        }));
        await StudentBatch.insertMany(studentBatchEntries);
      }
      
      // Update removed enrollments to 'dropped' status
      if (toRemove.length > 0) {
        await StudentBatch.updateMany(
          { batchId, studentId: { $in: toRemove } },
          { status: 'dropped', updatedAt: new Date() }
        );
      }
    }

    // Fetch students and tests using join tables for response
    const studentBatches = await StudentBatch.find({ batchId, status: 'active' })
      .populate('studentId', 'name email')
      .lean();
    const testAssignments = await BatchTestAssignment.find({ batchId, status: 'active', isActive: true })
      .populate('testId', 'title')
      .lean();
    
    // Convert to plain object and attach relations
    const batchObj = updatedBatch.toObject ? updatedBatch.toObject() : updatedBatch;
    batchObj.students = studentBatches.map(sb => sb.studentId).filter(Boolean);
    
    // Deduplicate tests
    const uniqueTests = [];
    const seenTestIds = new Set();
    testAssignments.forEach(ta => {
      const test = ta.testId;
      if (test) {
        const testId = (test._id || test).toString();
        if (!seenTestIds.has(testId)) {
          seenTestIds.add(testId);
          uniqueTests.push(test);
        }
      }
    });
    batchObj.tests = uniqueTests;

    return batchObj;
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

    // Update all StudentBatch entries to 'dropped' status
    await StudentBatch.updateMany(
      { batchId },
      { status: 'dropped', updatedAt: new Date() }
    );

    // Update all BatchTestAssignment entries to 'cancelled' status
    await BatchTestAssignment.updateMany(
      { batchId },
      { status: 'cancelled', updatedAt: new Date() }
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
  async assignStudentsToBatch(batchId, studentIds, adminId = null) {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Check if batch has capacity using StudentBatch join table
    const currentEnrollments = await StudentBatch.countDocuments({ 
      batchId, 
      status: 'active' 
    });
    const newStudentCount = studentIds.length;
    
    if (currentEnrollments + newStudentCount > batch.maxStudents) {
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

    // Create or update StudentBatch entries (handles duplicates via unique constraint)
    const enrolledByAdmin = adminId || batch.createdBy;
    
    for (const studentId of studentIds) {
      await StudentBatch.findOneAndUpdate(
        { studentId, batchId },
        { 
          status: 'active',
          enrolledBy: enrolledByAdmin,
          enrolledAt: new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

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

    // Update StudentBatch entries to 'dropped' status
    await StudentBatch.updateMany(
      { batchId, studentId: { $in: studentIds } },
      { 
        status: 'dropped',
        updatedAt: new Date()
      }
    );

    return await this.getBatchById(batchId);
  }

  /**
   * Assign tests to batch
   * @param {string} batchId
   * @param {Array} testIds
   * @returns {Object} updated batch
   */
  async assignTestsToBatch(batchId, testIds, adminId = null, assignedDate = null) {
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

    // Use provided date or default to today
    const assignmentDate = assignedDate || new Date();
    assignmentDate.setHours(0, 0, 0, 0);

    // Create BatchTestAssignment entries for each test
    const assignments = [];
    for (const testId of testIds) {
      // Check if an active assignment already exists for this batch-test combination
      const existing = await BatchTestAssignment.findOne({
        batchId,
        testId,
        status: 'active',
        isActive: true
      });

      if (!existing) {
        // Check if there's an inactive/cancelled assignment we can reactivate
        const inactiveAssignment = await BatchTestAssignment.findOne({
          batchId,
          testId
        });

        if (inactiveAssignment) {
          // Reactivate existing assignment
          await BatchTestAssignment.findByIdAndUpdate(inactiveAssignment._id, {
            status: 'active',
            isActive: true,
            assignedBy: adminId || batch.createdBy,
            assignedDate: assignmentDate,
            assignedAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          // Create new assignment
          assignments.push({
            batchId,
            testId,
            assignedBy: adminId || batch.createdBy,
            assignedAt: new Date(),
            assignedDate: assignmentDate,
            status: 'active',
            isActive: true
          });
        }
      }
      // If existing active assignment found, skip (test already assigned)
    }

    if (assignments.length > 0) {
      await BatchTestAssignment.insertMany(assignments);
    }

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

    // Update BatchTestAssignment entries to 'cancelled' status
    await BatchTestAssignment.updateMany(
      { batchId, testId: { $in: testIds } },
      { 
        status: 'cancelled',
        isActive: false,
        updatedAt: new Date()
      }
    );

    return await this.getBatchById(batchId);
  }

  /**
   * Get batches for a specific student
   * @param {string} studentId
   * @returns {Array} batches
   */
  async getBatchesForStudent(studentId) {
    // Get student batches from StudentBatch join table
    const studentBatches = await StudentBatch.find({ 
      studentId, 
      status: 'active' 
    })
      .populate('batchId')
      .lean();

    const batchIds = studentBatches.map(sb => sb.batchId?._id || sb.batchId).filter(Boolean);

    if (batchIds.length === 0) {
      return [];
    }

    // Fetch batch details
    const batches = await Batch.find({ _id: { $in: batchIds } })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Get test assignments for these batches
    const testAssignments = await BatchTestAssignment.find({
      batchId: { $in: batchIds },
      status: 'active',
      isActive: true
    })
      .populate('testId', 'title duration')
      .lean();

    // Group tests by batchId
    const testsByBatch = {};
    testAssignments.forEach(ta => {
      const batchIdStr = String(ta.batchId?._id || ta.batchId);
      if (!testsByBatch[batchIdStr]) {
        testsByBatch[batchIdStr] = [];
      }
      const testId = ta.testId?._id || ta.testId;
      if (testId && !testsByBatch[batchIdStr].some(t => String(t) === String(testId))) {
        testsByBatch[batchIdStr].push(testId);
      }
    });

    // Attach tests to batches
    const batchesWithTests = batches.map(batch => {
      const batchObj = batch.toObject ? batch.toObject() : batch;
      const batchIdStr = String(batchObj._id);
      batchObj.tests = testsByBatch[batchIdStr] || [];
      return batchObj;
    });

    return batchesWithTests;
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
