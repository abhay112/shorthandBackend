import Test from '../models/Test.js';

const testService = {
  createTestWithAudio: async (title, audioURL, adminId) => {
    return await Test.create({
      title,
      audioURL,
      uploadedBy: adminId
    });
  },

  attachTextToTest: async (testId, referenceText) => {
    return await Test.findByIdAndUpdate(
      testId,
      { referenceText },
      { new: true }
    );
  }
};

export default testService;
