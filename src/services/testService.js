import Test from '../models/Test.js';
import Batch from '../models/Batch.js';
import TestContent from '../models/TestContent.js';
import { AppError } from '../utils/AppError.js';

const testService = {
  createTest: async (title, audioURL, referenceText, adminId, options = {}) => {
    const {
      description,
      testType = 'practice',
      difficulty = 'intermediate',
      category = 'comprehensive',
      duration = 300,
      maxRetakes = 3,
      availableFrom,
      availableUntil,
      assignedDays = [],
      assignedBatches = []
    } = options;

    const now = new Date();

    const testData = {
      title,
      description,
      testType,
      difficulty,
      category,
      duration,
      maxRetakes,
      uploadedBy: adminId,
      availableFrom,
      availableUntil,
      assignedDays,
      assignedBatches,
      isActive: true,
      isPublished: true,
      publishedAt: now,
      audioURL,
      referenceText
    };

    const test = await Test.create(testData);

    const content = await TestContent.create({
      testId: test._id,
      version: 1,
      status: 'published',
      referenceText,
      audio: audioURL ? { url: audioURL } : undefined,
      createdBy: adminId,
      publishedAt: now
    });

    test.currentContent = content._id;
    test.latestVersion = 1;
    await test.save();

    // If there are batch assignments, update the batch documents to maintain bidirectional relationships
    if (assignedBatches.length > 0) {
      await Batch.updateMany(
        { _id: { $in: assignedBatches } },
        { $addToSet: { tests: test._id } }
      );
    }

    return await test.populate([
      { path: 'uploadedBy', select: 'name email' },
      { path: 'assignedBatches', select: 'name description' },
      { path: 'assignedDays.batchId', select: 'name description' },
      { path: 'assignedDays.assignedBy', select: 'name email' },
      { path: 'currentContent', select: 'version status referenceText audio publishedAt' }
    ]);
  },
  
  attachTextToTest: async (testId, referenceText) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    if (!test.currentContent) {
      throw new AppError('Test content not initialised', 400);
    }

    const content = await TestContent.findById(test.currentContent);
    if (content) {
      content.referenceText = referenceText;
      await content.save();
    }

    test.referenceText = referenceText;
    await test.save();

    return test;
  },
  
  getAllTests: async (options = {}) => {
    const { page, limit, testType, difficulty, category, isActive } = options;
    
    // Build filter object
    const filter = {};
    if (testType) filter.testType = testType;
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive;
    
    // If pagination is requested
    if (page && limit) {
      const skip = (page - 1) * limit;
      const totalItems = await Test.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / limit);
      
      const tests = await Test.find(filter)
        .populate('uploadedBy', 'name email')
        .populate('assignedBatches', 'name description')
        .populate('currentContent', 'version status publishedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return {
        tests,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
        },
      };
    }
    
    // Return all tests without pagination (for backward compatibility)
    const tests = await Test.find(filter)
      .populate('uploadedBy', 'name email')
      .populate('assignedBatches', 'name description')
      .populate('currentContent', 'version status publishedAt')
      .sort({ createdAt: -1 });

    return { tests, pagination: null };
  },
  
  getTestById: async (id) => {
    const test = await Test.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('assignedBatches', 'name description students')
      .populate('currentContent', 'version status referenceText audio publishedAt')
      .populate('draftContent', 'version status referenceText audio updatedAt');
    
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    return test;
  },
  
  updateTest: async (id, updateData = {}, options = {}) => {
    const adminId = options.adminId;

    const test = await Test.findById(id)
      .populate('currentContent')
      .populate('draftContent');
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    const assignIfDefined = (field, transformer) => {
      if (updateData[field] !== undefined) {
        test[field] = transformer ? transformer(updateData[field]) : updateData[field];
      }
    };

    assignIfDefined('title');
    assignIfDefined('description');
    assignIfDefined('testType');
    assignIfDefined('difficulty');
    assignIfDefined('category');
    assignIfDefined('duration', Number);
    assignIfDefined('maxRetakes', Number);
    assignIfDefined('availableFrom', (value) => value);
    assignIfDefined('availableUntil', (value) => value);
    assignIfDefined('isActive');
    assignIfDefined('allowViewWhenBlocked');

    // Settings merge
    if (updateData.settings && typeof updateData.settings === 'object') {
      test.settings = {
        ...(test.settings?.toObject?.() || test.settings || {}),
        ...updateData.settings
      };
    }

    // Assigned days replacement
    if (Array.isArray(updateData.assignedDays)) {
      test.assignedDays = updateData.assignedDays;
    }

    // Assigned batches diff handling
    if (Array.isArray(updateData.assignedBatches)) {
      const currentBatchIds = test.assignedBatches.map((batchId) => batchId.toString());
      const nextBatchIds = updateData.assignedBatches.map((batchId) => batchId.toString());

      const batchesToAdd = nextBatchIds.filter((batchId) => !currentBatchIds.includes(batchId));
      const batchesToRemove = currentBatchIds.filter((batchId) => !nextBatchIds.includes(batchId));

      if (batchesToAdd.length > 0) {
        await Batch.updateMany(
          { _id: { $in: batchesToAdd } },
          { $addToSet: { tests: test._id } }
        );
      }

      if (batchesToRemove.length > 0) {
        await Batch.updateMany(
          { _id: { $in: batchesToRemove } },
          { $pull: { tests: test._id } }
        );
      }

      test.assignedBatches = updateData.assignedBatches;
    }

    // Blocking logic
    if (updateData.isBlocked !== undefined) {
      if (updateData.isBlocked) {
        test.isBlocked = true;
        test.blockedBy = adminId || test.blockedBy;
        test.blockedAt = new Date();
        if (updateData.blockReason !== undefined) {
          test.blockReason = updateData.blockReason;
        }
      } else {
        test.isBlocked = false;
        test.blockedBy = null;
        test.blockedAt = null;
        test.blockReason = null;
      }
    } else if (updateData.blockReason !== undefined) {
      test.blockReason = updateData.blockReason;
    }

    const contentChanges = {};
    if (updateData.referenceText !== undefined) {
      contentChanges.referenceText = updateData.referenceText;
    }
    if (updateData.audioURL) {
      contentChanges.audio = { url: updateData.audioURL };
    }
    if (updateData.removeAudio) {
      contentChanges.audio = null;
    }

    let draftContentDoc = test.draftContent
      ? (test.draftContent.referenceText ? test.draftContent : await TestContent.findById(test.draftContent))
      : null;

    if (Object.keys(contentChanges).length > 0) {
      if (!draftContentDoc) {
        const baseContent = test.currentContent
          ? (test.currentContent.referenceText ? test.currentContent : await TestContent.findById(test.currentContent))
          : null;
        const nextVersion = (test.latestVersion || 1) + 1;

        draftContentDoc = await TestContent.create({
          testId: test._id,
          version: nextVersion,
          status: 'draft',
          referenceText: contentChanges.referenceText ?? baseContent?.referenceText ?? '',
          audio: contentChanges.audio !== undefined ? contentChanges.audio : baseContent?.audio,
          createdBy: adminId
        });

        test.draftContent = draftContentDoc._id;
        test.latestVersion = nextVersion;
      } else {
        if (contentChanges.referenceText !== undefined) {
          draftContentDoc.referenceText = contentChanges.referenceText;
        }
        if (contentChanges.audio !== undefined) {
          draftContentDoc.audio = contentChanges.audio;
        }
        draftContentDoc.updatedBy = adminId || draftContentDoc.updatedBy;
        draftContentDoc.updatedAt = new Date();
        await draftContentDoc.save();
      }
    }

    const publishRequested = Boolean(updateData.publishNow);

    if (updateData.isPublished !== undefined) {
      test.isPublished = updateData.isPublished;
      test.publishedAt = updateData.isPublished ? (test.publishedAt || new Date()) : null;
    }

    if (publishRequested) {
      let contentToPublish = draftContentDoc;

      if (!contentToPublish && test.currentContent) {
        contentToPublish = test.currentContent.referenceText
          ? test.currentContent
          : await TestContent.findById(test.currentContent);
      }

      if (!contentToPublish) {
        throw new AppError('No content available to publish', 400);
      }

      contentToPublish.status = 'published';
      contentToPublish.publishedAt = new Date();
      contentToPublish.updatedBy = adminId || contentToPublish.updatedBy;
      await contentToPublish.save();

      await TestContent.updateMany(
        {
          testId: test._id,
          status: 'published',
          _id: { $ne: contentToPublish._id }
        },
        { status: 'archived' }
      );

      test.currentContent = contentToPublish._id;
      test.draftContent = null;
      test.referenceText = contentToPublish.referenceText || '';
      test.audioURL = contentToPublish.audio?.url || null;
      test.isPublished = true;
      test.publishedAt = new Date();
    } else if (updateData.removeAudio && !draftContentDoc) {
      // remove audio from currently published version when no draft is used
      if (test.currentContent) {
        const currentContentDoc = test.currentContent.referenceText
          ? test.currentContent
          : await TestContent.findById(test.currentContent);
        if (currentContentDoc) {
          currentContentDoc.audio = null;
          currentContentDoc.updatedBy = adminId || currentContentDoc.updatedBy;
          await currentContentDoc.save();
        }
      }
      test.audioURL = null;
    }

    test.updatedAt = new Date();
    await test.save();

    await test.populate('uploadedBy', 'name email');
    await test.populate('assignedBatches', 'name description');
    await test.populate('assignedDays.batchId', 'name description');
    await test.populate('assignedDays.assignedBy', 'name email');
    await test.populate('currentContent', 'version status referenceText audio publishedAt');
    await test.populate('draftContent', 'version status referenceText audio updatedAt');

    return test;
  },
  
  deleteTest: async (id) => {
    const test = await Test.findById(id);
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    // Remove test from all batches
    await Batch.updateMany(
      { tests: id },
      { $pull: { tests: id } }
    );
    
    return await Test.findByIdAndDelete(id);
  },
  
  assignTestToBatches: async (testId, batchIds) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    // Verify all batches exist
    const batches = await Batch.find({ _id: { $in: batchIds } });
    if (batches.length !== batchIds.length) {
      throw new AppError('Some batches not found', 400);
    }
    
    // Add test to batches
    await Batch.updateMany(
      { _id: { $in: batchIds } },
      { $addToSet: { tests: testId } }
    );
    
    // Add batches to test
    await Test.findByIdAndUpdate(
      testId,
      { $addToSet: { assignedBatches: { $each: batchIds } } },
      { new: true }
    );
    
    return await testService.getTestById(testId);
  },
  
  removeTestFromBatches: async (testId, batchIds) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    // Remove test from batches
    await Batch.updateMany(
      { _id: { $in: batchIds } },
      { $pull: { tests: testId } }
    );
    
    // Remove batches from test
    await Test.findByIdAndUpdate(
      testId,
      { $pull: { assignedBatches: { $in: batchIds } } },
      { new: true }
    );
    
    return await testService.getTestById(testId);
  },
  
  getTestsForBatch: async (batchId) => {
    const tests = await Test.find({ assignedBatches: batchId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return tests;
  },

  // Block/Unblock test functionality
  blockTest: async (testId, adminId, reason = '') => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    if (test.isBlocked) {
      throw new AppError('Test is already blocked', 400);
    }

    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      {
        isBlocked: true,
        blockedBy: adminId,
        blockedAt: new Date(),
        blockReason: reason
      },
      { new: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('blockedBy', 'name email');

    return updatedTest;
  },

  unblockTest: async (testId, adminId) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    if (!test.isBlocked) {
      throw new AppError('Test is not blocked', 400);
    }

    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      {
        isBlocked: false,
        blockedBy: null,
        blockedAt: null,
        blockReason: null
      },
      { new: true }
    )
      .populate('uploadedBy', 'name email');

    return updatedTest;
  },

  // Get tests for a specific date and batch
  getTestsForDate: async (date, batchId) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tests = await Test.find({
      $or: [
        // Day-specific assignments
        {
          'assignedDays': {
            $elemMatch: {
              batchId: batchId,
              assignedDate: {
                $gte: startOfDay,
                $lte: endOfDay
              },
              isActive: true
            }
          }
        },
        // General batch assignments
        {
          assignedBatches: batchId,
          $or: [
            { availableFrom: { $lte: new Date() } },
            { availableFrom: null }
          ],
          $or: [
            { availableUntil: { $gte: new Date() } },
            { availableUntil: null }
          ]
        }
      ],
      isActive: true,
      isPublished: true
    })
      .populate('uploadedBy', 'name email')
      .populate('assignedDays.batchId', 'name')
      .populate('assignedBatches', 'name')
      .sort({ 'assignedDays.priority': -1, createdAt: -1 });

    return tests;
  },

  // Assign test to specific dates for batches
  assignTestToDates: async (testId, dateAssignments, adminId) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    // Validate date assignments
    for (const assignment of dateAssignments) {
      if (!assignment.batchId || !assignment.assignedDate) {
        throw new AppError('Each assignment must have batchId and assignedDate', 400);
      }
      
      // Add metadata
      assignment.assignedBy = adminId;
      assignment.assignedAt = new Date();
      assignment.isActive = assignment.isActive !== false;
      assignment.priority = assignment.priority || 1;
    }

    // Add new assignments to existing ones
    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      { $push: { assignedDays: { $each: dateAssignments } } },
      { new: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('assignedDays.batchId', 'name')
      .populate('assignedDays.assignedBy', 'name email');

    return updatedTest;
  },

  // Remove test from specific dates
  removeTestFromDates: async (testId, assignmentIds) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      { $pull: { assignedDays: { _id: { $in: assignmentIds } } } },
      { new: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('assignedDays.batchId', 'name');

    return updatedTest;
  }
};

export default testService;
