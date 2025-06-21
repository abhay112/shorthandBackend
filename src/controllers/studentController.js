import studentService from '../services/studentService.js';

export const loginStudent = async (req, res) => {
  const { email, name } = req.body;
  const result = await studentService.handleLogin(email, name);
  res.json(result);
};

export const getStudentProfile = async (req, res) => {
  const studentId = req.params.id;
  const profile = await studentService.getProfile(studentId);
  res.json(profile);
};

export const getCurrentTestForShift = async (req, res) => {
  const studentId = req.params.id;
  const test = await studentService.getTestForCurrentShift(studentId);
  res.json(test);
};

export const submitTestResult = async (req, res) => {
  const data = req.body;
  const result = await studentService.submitResult(data);
  res.json(result);
};
