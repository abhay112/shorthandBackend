import resultService from '../services/resultService.js';

export const submitResult = async (req, res) => {
  const result = await resultService.submitResult(req.body);
  res.json(result);
};

export const getResultsByShift = async (req, res) => {
  const shiftId = req.params.shiftId;
  const results = await resultService.getResultsByShift(shiftId);
  res.json(results);
};
