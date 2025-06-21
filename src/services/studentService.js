import Student from '../models/Student.js';

const studentService = {
  handleLogin: async (email, name) => {
    const existing = await Student.findOne({ email });
    if (existing) return existing;
    return await Student.create({ email, name });
  },

  // Future methods can go here, like:
  // getProfile: async (id) => { ... }
};

export default studentService;
