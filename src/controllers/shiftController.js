import shiftService from '../services/shiftService.js';

export const createShift = async (req, res) => {
  const { name, startTime, durationMinutes, testId, date } = req.body;
  const shift = await shiftService.createShift(name, startTime, durationMinutes, testId, date);
  res.json(shift);
};
