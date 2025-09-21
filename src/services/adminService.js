import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import { AppError } from '../utils/AppError.js';
import mongoose from 'mongoose';
import { normalizeIds } from '../utils/helper.js';
import Test from '../models/Test.js';
import Shift from '../models/Shift.js';

const adminService = {
  /**
   * Get all students
   */
  getAllStudents: async () => {
    return await Student.find().populate('assignedBatches');
  },

  /**
   * Get a student by ID
   * @param {string} id - Student ID
   */
  getStudentById: async (id) => {
    const student = await Student.findById(id).populate('assignedBatches');
    if (!student) {
      throw new AppError('Student not found', 404);
    }
    return student;
  },

  /**
   * Approve or disapprove a student
   * @param {string} email - Student email
   * @param {boolean} status - Approval status
   */
  approveStudentService: async (email, status) => {
    const student = await Student.findOneAndUpdate(
      { email },
      { isApproved: status },
      { new: true }
    );
    if (!student) {
      throw new AppError('Student not found', 404);
    }
    return student;
  },

  /**
   * Assign a batch to a student
   * @param {string} studentId - Student ID
   * @param {string} batchId - Batch ID
   */
  assignBatch: async (studentId, batchId) => {
    const student = await Student.findById(studentId);
    const batch = await Batch.findById(batchId);

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    if (!student.isApproved) {
      throw new AppError('Student is not approved', 400);
    }

    if (student.isBlocked) {
      throw new AppError('Student is blocked', 400);
    }

    // Check if batch has capacity
    if (batch.students.length >= batch.maxStudents) {
      throw new AppError('Batch is at maximum capacity', 400);
    }

    // Add student to batch if not already assigned
    if (!student.assignedBatches.includes(batchId)) {
      student.assignedBatches.push(batchId);
      await student.save();
    }

    // Add student to batch if not already in batch
    if (!batch.students.includes(studentId)) {
      batch.students.push(studentId);
      await batch.save();
    }

    return await Student.findById(studentId).populate('assignedBatches');
  },

  /**
   * Remove a batch from a student
   * @param {string} studentId - Student ID
   * @param {string} batchId - Batch ID
   */
  removeBatch: async (studentId, batchId) => {
    const student = await Student.findById(studentId);
    const batch = await Batch.findById(batchId);

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Remove batch from student
    student.assignedBatches = student.assignedBatches.filter(id => id.toString() !== batchId);
    await student.save();

    // Remove student from batch
    batch.students = batch.students.filter(id => id.toString() !== studentId);
    await batch.save();

    return await Student.findById(studentId).populate('assignedBatches');
  },

  /**
   * Block or unblock a student
   * @param {string} studentId - Student ID
   * @param {boolean} block - Block status
   */
  setBlockStatus: async (studentId, block) => {
    const student = await Student.findByIdAndUpdate(
      studentId,
      { isBlocked: block },
      { new: true }
    );
    if (!student) {
      throw new AppError('Student not found', 404);
    }
    return student;
  },
  updateAssignedBatches: async (studentId, newBatchIds = []) => {
    const newIds = normalizeIds(newBatchIds); // safer normalization
    // debug if client sent unexpected shapes
    if ((newBatchIds || []).length && newIds.length === 0) {
      console.warn('updateAssignedBatches: received non-normalizable batch ids', newBatchIds);
      throw new AppError('Invalid batch ids provided', 400);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // load student
      const student = await Student.findById(studentId).session(session);
      if (!student) throw new AppError('Student not found', 404);

      const oldIds = (student.assignedBatches || []).map(String);

      const toAdd = newIds.filter((id) => !oldIds.includes(id));
      const toRemove = oldIds.filter((id) => !newIds.includes(id));

      // validate batches exist
      if (toAdd.length) {
        const found = await Batch.find({ _id: { $in: toAdd } }, null, { session }).lean();
        if (found.length !== toAdd.length) {
          // identify missing ids
          const foundIds = found.map(f => String(f._id));
          const missing = toAdd.filter(id => !foundIds.includes(id));
          throw new AppError(`One or more batches not found: ${missing.join(',')}`, 404);
        }
      }

      // Use updateOne to avoid instance save validation issues
      await Student.updateOne({ _id: studentId }, { $set: { assignedBatches: newIds } }, { session });

      if (toAdd.length) {
        await Batch.updateMany(
          { _id: { $in: toAdd } },
          { $addToSet: { students: student._id } },
          { session }
        );
      }

      if (toRemove.length) {
        await Batch.updateMany(
          { _id: { $in: toRemove } },
          { $pull: { students: student._id } },
          { session }
        );
      }

      await session.commitTransaction();

      const updatedStudent = await Student.findById(studentId)
        .populate('assignedBatches', 'name startDate endDate')
        .lean();

      return updatedStudent;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },
 updateAssignedTests: async (studentId, newTestIds = []) => {
  const newIds = normalizeIds(newTestIds);
  if ((newTestIds || []).length && newIds.length === 0) {
    throw new AppError('Invalid test ids provided', 400);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const student = await Student.findById(studentId).session(session);
    if (!student) throw new AppError('Student not found', 404);

    const oldIds = (student.assignedTests || []).map(String);
    const toAdd = newIds.filter((id) => !oldIds.includes(id));
    const toRemove = oldIds.filter((id) => !newIds.includes(id));

    if (toAdd.length) {
      const found = await Test.find({ _id: { $in: toAdd } }, null, { session }).lean();
      if (found.length !== toAdd.length) {
        const foundIds = found.map(f => String(f._id));
        const missing = toAdd.filter(id => !foundIds.includes(id));
        throw new AppError(`One or more tests not found: ${missing.join(',')}`, 404);
      }
    }

    await Student.updateOne({ _id: studentId }, { $set: { assignedTests: newIds } }, { session });

    if (toAdd.length) {
      await Test.updateMany(
        { _id: { $in: toAdd } },
        { $addToSet: { students: student._id } },
        { session }
      );
    }
    if (toRemove.length) {
      await Test.updateMany(
        { _id: { $in: toRemove } },
        { $pull: { students: student._id } },
        { session }
      );
    }

    await session.commitTransaction();
    // transaction committed successfully — now do a separate read/populate
    const updatedStudent = await Student.findById(studentId)
      .populate('assignedBatches', 'name startDate endDate')
      .lean();

    return updatedStudent;
  } catch (err) {
    // only abort if the transaction is still active
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // log abort error but prefer to throw original error
        console.error('Failed to abort transaction:', abortErr);
      }
    }
    throw err;
  } finally {
    session.endSession();
  }
},

// updateAssignedShifts
updateAssignedShifts: async (studentId, newShiftIds = []) => {
  const newIds = normalizeIds(newShiftIds);
  if ((newShiftIds || []).length && newIds.length === 0) {
    throw new AppError('Invalid shift ids provided', 400);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const student = await Student.findById(studentId).session(session);
    if (!student) throw new AppError('Student not found', 404);

    const oldIds = (student.assignedShifts || []).map(String);
    const toAdd = newIds.filter((id) => !oldIds.includes(id));
    const toRemove = oldIds.filter((id) => !newIds.includes(id));

    if (toAdd.length) {
      const found = await Shift.find({ _id: { $in: toAdd } }, null, { session }).lean();
      if (found.length !== toAdd.length) {
        const foundIds = found.map(f => String(f._id));
        const missing = toAdd.filter(id => !foundIds.includes(id));
        throw new AppError(`One or more shifts not found: ${missing.join(',')}`, 404);
      }
    }

    await Student.updateOne({ _id: studentId }, { $set: { assignedShifts: newIds } }, { session });

    if (toAdd.length) {
      await Shift.updateMany(
        { _id: { $in: toAdd } },
        { $addToSet: { students: student._id } },
        { session }
      );
    }
    if (toRemove.length) {
      await Shift.updateMany(
        { _id: { $in: toRemove } },
        { $pull: { students: student._id } },
        { session }
      );
    }

    await session.commitTransaction();

    const updatedStudent = await Student.findById(studentId)
      .populate('assignedBatches', 'name startDate endDate')
      .lean();

    return updatedStudent;
  } catch (err) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error('Failed to abort transaction:', abortErr);
      }
    }
    throw err;
  } finally {
    session.endSession();
  }
},

};

export default adminService;
