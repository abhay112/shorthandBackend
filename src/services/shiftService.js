import Shift from '../models/Shift.js';

const shiftService = {
  createShift: async (name, startTime, durationMinutes, testId, date) => {
    return await Shift.create({
      name,
      startTime,
      durationMinutes,
      test: testId,
      date
    });
  }

  // You can add more methods here later if needed
};

export default shiftService;
