import shiftService from '../services/shiftService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/sendResponse.js';

export const createShift = asyncHandler(async (req, res) => {
  const { name, startTime, durationMinutes, testId, date } = req.body;
  const shift = await shiftService.createShift(name, startTime, durationMinutes, testId, date);
  return sendResponse(res, 201, true, 'Shift created successfully', { shift });
});

