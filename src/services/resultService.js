import Result from '../models/Result.js';

const resultService = {
  submitResult: async (data) => {
    return await Result.create(data);
  },

  getResultsByShift: async (shiftId) => {
    return await Result.find({ shiftId }).populate('studentId testId');
  }
};

export default resultService;
