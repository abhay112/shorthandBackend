import adminService from '../services/adminService.js';

export const getAllStudents = async (req, res) => {
  const students = await adminService.getAllStudents();
  res.json(students);
};

export const approveStudent = async (req, res) => {
  const { email } = req.body;
  const result = await adminService.approveStudentService(email);
  res.json(result);
};

export const assignShiftToStudent = async (req, res) => {
  const { studentId, shiftId } = req.body;
  try {
    const result = await adminService.assignShift(studentId, shiftId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


export const blockStudent = async (req, res) => {
  const { studentId, block } = req.body; 
  const result = await adminService.setBlockStatus(studentId, block);
  res.json(result);
};
