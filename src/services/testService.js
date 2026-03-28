import Test from '../models/Test.js';
import Batch from '../models/Batch.js';
import TestContent from '../models/TestContent.js';
import Result from '../models/Result.js';
// Student imported but not used - kept for potential future use
import StudentRanking from '../models/StudentRanking.js';
import BatchTestAssignment from '../models/BatchTestAssignment.js';
import StudentBatch from '../models/StudentBatch.js';
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
      settings = {},
      statistics = {},
      isPublished = false,
      testImageUrl
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
      settings,
      statistics,
      isActive: true,
      isPublished: isPublished,
      publishedAt: isPublished ? now : null,
      audioURL,
      testImageUrl,
      referenceText
    };

    const test = await Test.create(testData);

    const content = await TestContent.create({
      testId: test._id,
      version: 1,
      status: isPublished ? 'published' : 'draft',
      referenceText,
      audio: audioURL ? { url: audioURL } : undefined,
      createdBy: adminId,
      publishedAt: isPublished ? now : null
    });

    test.currentContent = content._id;
    test.latestVersion = 1;
    await test.save();

    // Populate basic fields
    await test.populate([
      { path: 'uploadedBy', select: 'name email' },
      { path: 'currentContent', select: 'version status referenceText audio publishedAt' }
    ]);

    // Fetch batch assignments from BatchTestAssignment join table if any exist
    const assignments = await BatchTestAssignment.find({ testId: test._id, status: 'active' })
      .populate('batchId', 'name description')
      .lean();

    test.assignedBatches = assignments.map(a => a.batchId).filter(Boolean);

    return test;
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
        .populate('currentContent', 'version status publishedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Fetch batch assignments separately for each test using BatchTestAssignment join table
      const testIds = tests.map(t => t._id.toString());
      const assignments = await BatchTestAssignment.find({
        testId: { $in: testIds },
        status: 'active',
        isActive: true
      })
        .populate('batchId', 'name description')
        .lean();

      // Group assignments by testId
      const assignmentsByTest = {};
      assignments.forEach(assignment => {
        const testIdStr = assignment.testId.toString();
        if (!assignmentsByTest[testIdStr]) {
          assignmentsByTest[testIdStr] = [];
        }
        // Only add unique batches
        const batchId = assignment.batchId?._id || assignment.batchId;
        if (batchId && !assignmentsByTest[testIdStr].some(b => (b._id || b).toString() === batchId.toString())) {
          assignmentsByTest[testIdStr].push(assignment.batchId);
        }
      });

      // Convert tests to plain objects and attach batch assignments
      const testsWithBatches = tests.map(test => {
        const testObj = test.toObject ? test.toObject() : test;
        const testIdStr = testObj._id.toString();

        // Get batch assignments for this test - return batch IDs to match expected format
        const batchAssignments = assignmentsByTest[testIdStr] || [];
        testObj.assignedBatches = batchAssignments.map(batch => {
          // Return just the batch ID string
          return (batch._id || batch).toString();
        });

        return testObj;
      });

      return {
        tests: testsWithBatches,
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
      .populate('currentContent', 'version status publishedAt')
      .sort({ createdAt: -1 });

    // Fetch batch assignments separately using BatchTestAssignment join table
    const testIds = tests.map(t => t._id.toString());
    const assignments = await BatchTestAssignment.find({
      testId: { $in: testIds },
      status: 'active',
      isActive: true
    })
      .populate('batchId', 'name description')
      .lean();

    // Group assignments by testId
    const assignmentsByTest = {};
    assignments.forEach(assignment => {
      const testIdStr = assignment.testId.toString();
      if (!assignmentsByTest[testIdStr]) {
        assignmentsByTest[testIdStr] = [];
      }
      // Only add unique batches
      const batchId = assignment.batchId?._id || assignment.batchId;
      if (batchId && !assignmentsByTest[testIdStr].some(b => (b._id || b).toString() === batchId.toString())) {
        assignmentsByTest[testIdStr].push(assignment.batchId);
      }
    });

    // Convert tests to plain objects and attach batch assignments
    const testsWithBatches = tests.map(test => {
      const testObj = test.toObject ? test.toObject() : test;
      const testIdStr = testObj._id.toString();

      // Get batch assignments for this test - return batch IDs to match expected format
      const batchAssignments = assignmentsByTest[testIdStr] || [];
      testObj.assignedBatches = batchAssignments.map(batch => {
        // Return just the batch ID string
        return (batch._id || batch).toString();
      });

      return testObj;
    });

    return { tests: testsWithBatches, pagination: null };
  },

  getTestById: async (id) => {
    const test = await Test.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('currentContent', 'version status referenceText audio publishedAt')
      .populate('draftContent', 'version status referenceText audio updatedAt');

    if (!test) {
      throw new AppError('Test not found', 404);
    }

    // Fetch batch assignments using BatchTestAssignment join table
    const assignments = await BatchTestAssignment.find({
      testId: id,
      status: 'active',
      isActive: true
    })
      .populate('batchId', 'name description')
      .lean();

    // Get unique batch IDs
    const uniqueBatchIds = [];
    const seenBatchIds = new Set();
    assignments.forEach(assignment => {
      const batchId = (assignment.batchId?._id || assignment.batchId)?.toString();
      if (batchId && !seenBatchIds.has(batchId)) {
        seenBatchIds.add(batchId);
        uniqueBatchIds.push(batchId);
      }
    });

    // Convert test to plain object and attach assignedBatches
    const testObj = test.toObject ? test.toObject() : test;
    testObj.assignedBatches = uniqueBatchIds;

    return testObj;
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
    assignIfDefined('testImageUrl');

    if (updateData.removeImage) {
      test.testImageUrl = null;
    }

    // Settings merge
    if (updateData.settings && typeof updateData.settings === 'object') {
      test.settings = {
        ...(test.settings?.toObject?.() || test.settings || {}),
        ...updateData.settings
      };
    }

    // Note: assignedDays and assignedBatches are now handled via BatchTestAssignment join table
    // Batch assignments should be created/updated using BatchTestAssignment model directly
    // or via dedicated methods for assigning tests to batches with dates

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
    await test.populate('currentContent', 'version status referenceText audio publishedAt');
    await test.populate('draftContent', 'version status referenceText audio updatedAt');

    // Fetch batch assignments from BatchTestAssignment join table
    const assignments = await BatchTestAssignment.find({ testId: test._id, status: 'active' })
      .populate('batchId', 'name description')
      .lean();

    test.assignedBatches = assignments.map(a => a.batchId).filter(Boolean);

    return test;
  },

  /**
   * Toggle test publication status (publish or unpublish)
   * @param {string} testId - The ID of the test to toggle
   * @param {string} adminId - The ID of the admin performing the action
   * @param {boolean} publish - Optional: explicitly set publish state. If not provided, toggles current state
   * @returns {Object} The updated test with action performed
   */
  toggleTestPublication: async (testId, adminId, publish = null) => {
    const test = await Test.findById(testId)
      .populate('currentContent')
      .populate('draftContent');

    if (!test) {
      throw new AppError('Test not found', 404);
    }

    // Determine target state: if publish parameter is provided, use it; otherwise toggle
    const targetState = publish !== null ? publish : !test.isPublished;

    // If already in target state, return early
    if (test.isPublished === targetState) {
      const action = targetState ? 'published' : 'unpublished';
      throw new AppError(`Test is already ${action}`, 400);
    }

    if (targetState) {
      // Publishing the test
      // Determine which content to publish
      let contentToPublish = test.draftContent;

      if (!contentToPublish && test.currentContent) {
        contentToPublish = test.currentContent.referenceText
          ? test.currentContent
          : await TestContent.findById(test.currentContent);
      }

      if (!contentToPublish) {
        throw new AppError('No content available to publish. Please add content to the test first.', 400);
      }

      // Update content status to published
      const contentDoc = contentToPublish.referenceText
        ? contentToPublish
        : await TestContent.findById(contentToPublish);

      if (!contentDoc) {
        throw new AppError('Content not found', 404);
      }

      contentDoc.status = 'published';
      contentDoc.publishedAt = new Date();
      contentDoc.updatedBy = adminId || contentDoc.updatedBy;
      await contentDoc.save();

      // Archive any previously published content
      await TestContent.updateMany(
        {
          testId: test._id,
          status: 'published',
          _id: { $ne: contentDoc._id }
        },
        { status: 'archived' }
      );

      // Update test to published
      test.currentContent = contentDoc._id;
      test.draftContent = null;
      test.referenceText = contentDoc.referenceText || '';
      test.audioURL = contentDoc.audio?.url || null;
      test.isPublished = true;
      test.publishedAt = new Date();
    } else {
      // Unpublishing the test
      test.isPublished = false;
      test.publishedAt = null;
    }

    test.updatedAt = new Date();
    await test.save();

    // Populate response
    await test.populate('uploadedBy', 'name email');
    await test.populate('currentContent', 'version status referenceText audio publishedAt');
    await test.populate('draftContent', 'version status referenceText audio updatedAt');

    // Fetch batch assignments from BatchTestAssignment join table
    const assignments = await BatchTestAssignment.find({ testId: test._id, status: 'active' })
      .populate('batchId', 'name description')
      .lean();

    const testObj = test.toObject ? test.toObject() : test;
    testObj.assignedBatches = assignments.map(a => a.batchId).filter(Boolean);

    return {
      test: testObj,
      action: targetState ? 'published' : 'unpublished'
    };
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

  unblockTest: async (testId, _adminId) => {
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
          $and: [
            {
              $or: [
                { availableUntil: { $gte: new Date() } },
                { availableUntil: null }
              ]
            }
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
  },

  // Get batch-test statistics (attempts, completions, student list)
  getBatchTestStatistics: async (testId, batchId) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Get all students in the batch using StudentBatch join table
    const studentBatches = await StudentBatch.find({
      batchId,
      status: 'active'
    })
      .populate('studentId', '_id name email')
      .lean();

    const studentsInBatch = studentBatches.map(sb => sb.studentId).filter(Boolean);
    const studentIds = studentsInBatch.map(s => s._id || s);

    // Get all results for this test and batch
    const allResults = await Result.find({
      testId,
      batchId,
      studentId: { $in: studentIds }
    }).populate('studentId', 'name email').sort({ submittedAt: -1 });

    // Get completed results
    const completedResults = allResults.filter(r => r.status === 'completed');

    // Get unique students who attempted
    const attemptedStudentIds = [...new Set(allResults.map(r => {
      const studentId = r.studentId?._id || r.studentId;
      return studentId.toString();
    }))];

    // Get unique students who completed
    const completedStudentIds = [...new Set(completedResults.map(r => {
      const studentId = r.studentId?._id || r.studentId;
      return studentId.toString();
    }))];
    const completedStudents = studentsInBatch.filter(s => {
      const sid = (s._id || s).toString();
      return completedStudentIds.includes(sid);
    });

    // Get students who attempted but didn't complete (exclude completed students)
    const attemptedButNotCompletedIds = attemptedStudentIds.filter(
      id => !completedStudentIds.includes(id)
    );
    const attemptedStudents = studentsInBatch.filter(s => {
      const sid = (s._id || s).toString();
      return attemptedButNotCompletedIds.includes(sid);
    });

    // Get students who haven't attempted
    const notAttemptedStudents = studentsInBatch.filter(s => {
      const sid = (s._id || s).toString();
      return !attemptedStudentIds.includes(sid);
    });

    // Check if test is closed for this batch using BatchTestAssignment join table
    const assignment = await BatchTestAssignment.findOne({
      batchId,
      testId,
      isClosed: true
    }).lean();
    const isClosed = !!assignment;

    // Check if rankings are generated using BatchTestAssignment join table
    const rankingAssignment = await BatchTestAssignment.findOne({
      batchId,
      testId,
      rankingsGenerated: true
    }).lean();
    const rankingsGenerated = !!rankingAssignment;

    return {
      test: {
        _id: test._id,
        title: test.title,
        testType: test.testType,
        difficulty: test.difficulty
      },
      batch: {
        _id: batch._id,
        name: batch.name
      },
      statistics: {
        totalStudents: studentsInBatch.length,
        attemptedCount: attemptedStudents.length,
        completedCount: completedStudents.length,
        notAttemptedCount: notAttemptedStudents.length,
        totalAttempts: allResults.length,
        totalCompletedAttempts: completedResults.length
      },
      attemptedStudents: attemptedStudents.map(s => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        attempts: allResults.filter(r => r.studentId._id.toString() === s._id.toString()).length,
        completedAttempts: completedResults.filter(r => r.studentId._id.toString() === s._id.toString()).length
      })),
      completedStudents: completedStudents.map(s => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        attempts: allResults.filter(r => r.studentId._id.toString() === s._id.toString()).length,
        bestResult: completedResults
          .filter(r => r.studentId._id.toString() === s._id.toString())
          .sort((a, b) => (b.wpm * b.accuracy) - (a.wpm * a.accuracy))[0] || null
      })),
      notAttemptedStudents: notAttemptedStudents.map(s => ({
        _id: s._id,
        name: s.name,
        email: s.email
      })),
      isClosed,
      rankingsGenerated
    };
  },

  // Close test for a specific batch
  closeTestForBatch: async (testId, batchId, adminId, reason = '') => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Check if already closed using BatchTestAssignment join table
    const assignment = await BatchTestAssignment.findOne({
      batchId,
      testId,
      isClosed: true
    });

    if (assignment) {
      throw new AppError('Test is already closed for this batch', 400);
    }

    // Update or create BatchTestAssignment entry to mark as closed
    const updatedAssignment = await BatchTestAssignment.findOneAndUpdate(
      { batchId, testId },
      {
        isClosed: true,
        closedBy: adminId,
        closedAt: new Date(),
        closureReason: reason,
        status: 'inactive',
        isActive: false,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    )
      .populate('batchId', 'name')
      .populate('closedBy', 'name email');

    return {
      message: 'Test closed for batch successfully',
      assignment: updatedAssignment
    };
  },

  // Open (re-open) test for a specific batch
  openTestForBatch: async (testId, batchId) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Check if rankings are generated using BatchTestAssignment join table
    const assignment = await BatchTestAssignment.findOne({
      batchId,
      testId,
      rankingsGenerated: true
    });

    if (assignment) {
      throw new AppError('Cannot reopen test: Rankings have already been generated for this batch', 400);
    }

    // Check if test is closed using BatchTestAssignment join table
    const closedAssignment = await BatchTestAssignment.findOne({
      batchId,
      testId,
      isClosed: true
    });

    if (!closedAssignment) {
      throw new AppError('Test is not closed for this batch', 400);
    }

    // Reopen by updating BatchTestAssignment
    const updatedAssignment = await BatchTestAssignment.findByIdAndUpdate(
      closedAssignment._id,
      {
        isClosed: false,
        closedBy: null,
        closedAt: null,
        closureReason: null,
        status: 'active',
        isActive: true,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('batchId', 'name');

    return {
      message: 'Test reopened for batch successfully',
      assignment: updatedAssignment
    };
  },

  // Generate rankings for a batch-test combination
  generateRankingsForBatchTest: async (testId, batchId, adminId) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Check if rankings already generated using BatchTestAssignment join table
    const existingAssignment = await BatchTestAssignment.findOne({
      batchId,
      testId,
      rankingsGenerated: true
    });

    if (existingAssignment) {
      throw new AppError('Rankings are already generated for this batch-test combination', 400);
    }

    // Get all completed results for this batch-test
    const results = await Result.find({
      testId,
      batchId,
      status: 'completed',
      isValid: true
    }).sort({ wpm: -1, accuracy: -1, speed: -1 });

    if (results.length === 0) {
      throw new AppError('No completed results found for this batch-test combination', 400);
    }

    const totalStudents = results.length;

    // Calculate rankings for each student
    const rankingPromises = results.map(async (result, index) => {
      const rank = index + 1;
      const percentile = Math.round(((totalStudents - rank + 1) / totalStudents) * 100);

      // Get previous ranking if exists
      const previousRanking = await StudentRanking.findOne({
        studentId: result.studentId,
        batchId,
        testId
      });

      const previousRank = previousRanking ? previousRanking.rank : null;
      const rankChange = previousRank ? previousRank - rank : 0;

      // Update or create StudentRanking
      await StudentRanking.findOneAndUpdate(
        { studentId: result.studentId, batchId, testId },
        {
          studentId: result.studentId,
          batchId,
          testId,
          rank,
          percentile,
          wpm: result.wpm,
          accuracy: result.accuracy,
          speed: result.speed,
          totalStudents,
          totalAttempts: totalStudents,
          previousRank,
          rankChange,
          testDate: result.submittedAt,
          rankingCalculatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      // Update result with rank and percentile
      result.rank = rank;
      result.percentile = percentile;
      await result.save();

      return { studentId: result.studentId, rank, percentile };
    });

    await Promise.all(rankingPromises);

    // Mark rankings as generated in BatchTestAssignment join table
    await BatchTestAssignment.findOneAndUpdate(
      { batchId, testId },
      {
        rankingsGenerated: true,
        rankingsGeneratedBy: adminId,
        rankingsGeneratedAt: new Date(),
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Get the test for response
    const testObj = await testService.getTestById(testId);

    return {
      test: testObj,
      rankingsGenerated: totalStudents,
      message: `Rankings generated successfully for ${totalStudents} students`
    };
  }
};

export default testService;
