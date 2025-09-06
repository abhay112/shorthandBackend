import testService from '../services/testService.js';


export const uploadTest = async (req, res) => {
  try {
    const { title, referenceText, id } = req.body;
    const audioURL = req.file?.path || null;

    if (!title || !referenceText) {
      return res.status(400).json({ message: 'Title and referenceText are required' });
    }

    let test;

    if (id) {
      // Update case
      const updatePayload = { referenceText };
      if (audioURL) updatePayload.audioURL = audioURL;
      test = await testService.updateTest(id, updatePayload);
      if (!test) return res.status(404).json({ message: 'Test not found' });
    } else {
      // Create case
      test = await testService.createTest(title, audioURL, referenceText, req.adminId);
    }

    res.status(200).json(test);
  } catch (error) {
    console.error('Upload Test Error:', error);
    res.status(500).json({ message: 'Failed to save test' });
  }
};

// Get all tests
export const getAllTests = async (req, res) => {
  try {
    const tests = await testService.getAllTests();
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await testService.deleteTest(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Delete Test Error:', error);
    res.status(500).json({ message: 'Failed to delete test' });
  }
};
