import testService from '../services/testService.js';

// Upload audio only
export const uploadAudio = async (req, res) => {
  const audioURL = req.file.path;
  const { title } = req.body;

  const test = await testService.createTestWithAudio(title, audioURL, req.adminId);
  res.json(test);
};

// Upload reference text (attach to existing test)
export const uploadText = async (req, res) => {
  const { testId, referenceText } = req.body;

  const updatedTest = await testService.attachTextToTest(testId, referenceText);
  res.json(updatedTest);
};
