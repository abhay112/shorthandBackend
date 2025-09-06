import Test from '../models/Test.js';

const testService = {
  createTest: async (title, audioURL, referenceText, adminId) => {
    return await Test.create({
      title,
      audioURL,
      referenceText,
      uploadedBy: adminId
    });
  },
  attachTextToTest: async (testId, referenceText) => {
    return await Test.findByIdAndUpdate(
      testId,
      { referenceText },
      { new: true }
    );
  },
  getAllTests: async () => {
    return await Test.find();
  },
  deleteTest: async (id) => {
    return await Test.findByIdAndDelete(id);
  }

};

export default testService;
