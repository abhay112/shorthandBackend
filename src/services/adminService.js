import Student from '../models/Student.js';

const adminService = {
  getAllStudents: async () => {
    return await Student.find().populate('assignedShifts');
  },

  getStudentById: async (id) => {
    return await Student.findById(id).populate('assignedShifts');
  },

  approveStudentService: async (email, status) => {
    return await Student.findOneAndUpdate(
      { email },
      { isApproved: status },
      { new: true } // 
    );
  },

  assignShift: async (studentId, shiftId) => {
    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error("Student not found.");
    }

    if (!student.isApproved) {
      throw new Error("Student is not approved.");
    }

    if (!student.assignedShifts.includes(shiftId)) {
      student.assignedShifts.push(shiftId);
    }

    return await student.save();
  },

  setBlockStatus: async (studentId, block) => {
    return await Student.findByIdAndUpdate(
      studentId,
      { isBlocked: block },
      { new: true }
    );
  }
};

export default adminService;
