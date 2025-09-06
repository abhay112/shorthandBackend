import adminService from '../services/adminService.js';
import dashboardService from '../services/dashboardService.js';

export const getAllStudents = async (req, res) => {
  const students = await adminService.getAllStudents();
  res.json(students);
};

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await adminService.getStudentById(id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveStudent = async (req, res) => {
  const { email,status } = req.body;
  const result = await adminService.approveStudentService(email, status);
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


export const getDashboardStats = async (req, res) => {
  try {
    const data = await dashboardService.fetchDashboardStats();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Dashboard fetch failed', error: err.message });
  }
};