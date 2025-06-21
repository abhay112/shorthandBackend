import studentService from '../services/studentService.js';

export const loginStudent = async (req, res) => {
  const { email, name } = req.body;
  const result = await studentService.handleLogin(email, name);
  res.json(result);
};
