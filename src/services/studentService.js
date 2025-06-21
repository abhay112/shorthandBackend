import Student from '../models/Student.js';
import Shift from '../models/Shift.js';
import Test from '../models/Test.js';
import Result from '../models/Result.js';

const studentService = {
  handleLogin: async (email, name) => {
    const existing = await Student.findOne({ email });
    if (existing) return existing;
    return await Student.create({ email, name });
  },

  getProfile: async (studentId) => {
    return await Student.findById(studentId).populate('assignedShifts');
  },

  getTestForCurrentShift: async (studentId) => {
    const student = await Student.findById(studentId).populate('assignedShifts');
    if (!student) throw new Error('Student not found');

    const now = new Date();
    const currentShift = student.assignedShifts.find(shift => {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shiftStart.getTime() + shift.durationMinutes * 60000);
      return now >= shiftStart && now <= shiftEnd;
    });

    if (!currentShift) {
      throw new Error('No active shift found');
    }

    const test = await Test.findById(currentShift.testId);
    return { shift: currentShift, test };
  },

  submitResult: async (data) => {
    return await Result.create(data);
  }
};

export default studentService;
