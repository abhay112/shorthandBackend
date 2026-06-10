import testService from '../services/testService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';
import { validateObjectId } from '../utils/validation.js';
import { uploadToS3, generatePresignedUploadUrl } from '../services/s3Service.js';


export const createTest = asyncHandler(async (req, res) => {
  let body = req.body;
  if (req.body.data) {
    try {
      body = JSON.parse(req.body.data);
    } catch (e) {
      throw new AppError('Invalid data JSON format', 400);
    }
  }

  const {
    title,
    referenceText,
    description,
    testType,
    difficulty,
    category,
    duration,
    maxRetakes,
    availableFrom,
    availableUntil,
    assignedDays,
    assignedBatches,
    showReferenceText
  } = body;

  // Handle multiple files from req.files and upload to S3, or fallback to direct S3 URLs
  let audioURL = req.files?.audioFile?.[0]?.path || null;

  if (audioURL) {
    audioURL = await uploadToS3(audioURL, 'audios');
  } else if (body.audioURL) {
    audioURL = body.audioURL;
  }

  let testImageUrls = [];
  if (req.files?.testImage) {
    for (const file of req.files.testImage) {
      const url = await uploadToS3(file.path, 'images');
      if (url) {
        testImageUrls.push(url);
      }
    }
  }

  if (body.testImageUrls) {
    try {
      const parsedUrls = typeof body.testImageUrls === 'string' ? JSON.parse(body.testImageUrls) : body.testImageUrls;
      if (Array.isArray(parsedUrls)) {
        testImageUrls = [...testImageUrls, ...parsedUrls];
      }
    } catch (e) {
      // ignore parsing error
    }
  } else if (body.testImageUrl) {
    testImageUrls.push(body.testImageUrl);
  }

  const testImageUrl = testImageUrls[0] || null;

  if (!title || !referenceText) {
    throw new AppError('Title and referenceText are required', 400);
  }

  // Parse JSON strings if provided (in case they are not already parsed objects)
  let parsedAssignedDays = (typeof assignedDays === 'string') ? JSON.parse(assignedDays) : (assignedDays || []);
  let parsedAssignedBatches = (typeof assignedBatches === 'string') ? JSON.parse(assignedBatches) : (assignedBatches || []);

  // Validate and process assigned days
  if (parsedAssignedDays.length > 0) {
    for (const dayAssignment of parsedAssignedDays) {
      if (!dayAssignment.batchId || !dayAssignment.assignedDate) {
        throw new AppError('Each day assignment must have batchId and assignedDate', 400);
      }

      // Add metadata
      dayAssignment.assignedBy = req.user.id;
      dayAssignment.assignedAt = new Date();
      dayAssignment.isActive = dayAssignment.isActive !== false; // Default to true
      dayAssignment.priority = dayAssignment.priority || 1;
    }
  }

  const test = await testService.createTest(
    title,
    audioURL,
    referenceText,
    req.user.id,
    {
      description,
      testType: testType || 'practice',
      difficulty: difficulty || 'intermediate',
      category: category || 'comprehensive',
      duration: duration ? parseInt(duration) : 300,
      maxRetakes: maxRetakes ? parseInt(maxRetakes) : 3,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      assignedDays: parsedAssignedDays,
      assignedBatches: parsedAssignedBatches,
      testImageUrl: testImageUrl,
      testImageUrls: testImageUrls,
      showReferenceText: showReferenceText !== undefined ? (String(showReferenceText).toLowerCase() !== 'false') : true
    }
  );

  return sendResponse(
    res,
    201,
    true,
    'Test created successfully',
    { test },
    { adminId: req.user.id, testId: test._id }
  );
});

export const getAllTests = asyncHandler(async (req, res) => {
  const { page, limit, testType, difficulty, category, isActive } = req.query;

  const options = {
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
    testType,
    difficulty,
    category,
    isActive: isActive !== undefined ? isActive === 'true' : undefined
  };

  const result = await testService.getAllTests(options);

  return sendResponse(
    res,
    200,
    true,
    'Tests retrieved successfully',
    result,
    { adminId: req.user?.id }
  );
});

export const getTestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'test ID');

  const test = await testService.getTestById(id);

  return sendResponse(
    res,
    200,
    true,
    'Test retrieved successfully',
    { test },
    { adminId: req.user?.id, testId: id }
  );
});

export const updateTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'test ID');

  let body = req.body;
  if (req.body.data) {
    try {
      body = JSON.parse(req.body.data);
    } catch (e) {
      throw new AppError('Invalid data JSON format', 400);
    }
  }

  const {
    title,
    description,
    referenceText,
    testType,
    difficulty,
    category,
    duration,
    maxRetakes,
    availableFrom,
    availableUntil,
    assignedDays,
    assignedBatches,
    settings,
    isActive,
    isPublished,
    allowViewWhenBlocked,
    isBlocked,
    blockReason,
    publishNow,
    removeAudio,
    removeImage,
    showReferenceText
  } = body;

  const parseBoolean = (value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return undefined;
  };

  const parseDate = (value) => {
    if (value === undefined || value === null || value === '' || value === 'null') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new AppError(`Invalid date value provided: ${value}`, 400);
    }
    return date;
  };

  const parseAssignmentDate = (value, fieldLabel) => {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new AppError(`Invalid date value provided for ${fieldLabel}`, 400);
    }
    return date;
  };

  const parseJsonField = (rawValue, fieldName) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;
    if (Array.isArray(rawValue) || typeof rawValue === 'object') {
      return rawValue;
    }
    try {
      return JSON.parse(rawValue);
    } catch {
      throw new AppError(`Invalid JSON format for ${fieldName}`, 400);
    }
  };

  // Handle assigned days parsing and metadata enrichment
  let parsedAssignedDays = parseJsonField(assignedDays, 'assignedDays');
  if (parsedAssignedDays !== undefined) {
    if (!Array.isArray(parsedAssignedDays)) {
      throw new AppError('assignedDays must be an array', 400);
    }

    parsedAssignedDays = parsedAssignedDays.map((assignment) => {
      if (!assignment.batchId || !assignment.assignedDate) {
        throw new AppError('Each day assignment must have batchId and assignedDate', 400);
      }

      const assignedAt = assignment.assignedAt ? new Date(assignment.assignedAt) : new Date();
      if (Number.isNaN(assignedAt.getTime())) {
        throw new AppError('Invalid date value provided for assignedAt', 400);
      }

      const priority =
        assignment.priority !== undefined
          ? Number(assignment.priority) || 1
          : 1;

      return {
        ...assignment,
        assignedBy: assignment.assignedBy || req.user.id,
        assignedAt,
        isActive: assignment.isActive !== false,
        priority,
        dayNumber: assignment.dayNumber !== undefined ? Number(assignment.dayNumber) : assignment.dayNumber,
        assignedDate: parseAssignmentDate(assignment.assignedDate, 'assignedDate'),
        availableFrom: parseAssignmentDate(assignment.availableFrom, 'availableFrom'),
        availableUntil: parseAssignmentDate(assignment.availableUntil, 'availableUntil')
      };
    });
  }

  // Handle batch assignments
  let parsedAssignedBatches = parseJsonField(assignedBatches, 'assignedBatches');
  if (parsedAssignedBatches !== undefined) {
    if (!Array.isArray(parsedAssignedBatches)) {
      throw new AppError('assignedBatches must be an array', 400);
    }
  }

  // Handle settings updates
  let parsedSettings = parseJsonField(settings, 'settings');
  if (parsedSettings !== undefined && typeof parsedSettings !== 'object') {
    throw new AppError('settings must be an object', 400);
  }

  // Collect flattened settings.* fields if provided via multipart forms
  const flattenedSettings = Object.keys(body).reduce((acc, key) => {
    if (!key.startsWith('settings.')) return acc;
    const settingKey = key.replace('settings.', '');
    acc[settingKey] = parseBoolean(body[key]) ?? body[key];
    return acc;
  }, {});

  if (Object.keys(flattenedSettings).length > 0) {
    parsedSettings = { ...(parsedSettings || {}), ...flattenedSettings };
  }

  const updatePayload = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(referenceText !== undefined && { referenceText }),
    ...(testType !== undefined && { testType }),
    ...(difficulty !== undefined && { difficulty }),
    ...(category !== undefined && { category }),
    ...(duration !== undefined && { duration: Number(duration) }),
    ...(maxRetakes !== undefined && { maxRetakes: Number(maxRetakes) }),
    ...(availableFrom !== undefined && { availableFrom: parseDate(availableFrom) }),
    ...(availableUntil !== undefined && { availableUntil: parseDate(availableUntil) }),
    ...(parsedAssignedDays !== undefined && { assignedDays: parsedAssignedDays }),
    ...(parsedAssignedBatches !== undefined && { assignedBatches: parsedAssignedBatches }),
    ...(parsedSettings !== undefined && { settings: parsedSettings }),
    ...(isActive !== undefined && { isActive: parseBoolean(isActive) }),
    ...(isPublished !== undefined && { isPublished: parseBoolean(isPublished) }),
    ...(allowViewWhenBlocked !== undefined && { allowViewWhenBlocked: parseBoolean(allowViewWhenBlocked) }),
    ...(isBlocked !== undefined && { isBlocked: parseBoolean(isBlocked) }),
    ...(blockReason !== undefined && { blockReason }),
    ...(publishNow !== undefined && { publishNow: parseBoolean(publishNow) }),
    ...(removeAudio !== undefined && { removeAudio: parseBoolean(removeAudio) }),
    ...(removeImage !== undefined && { removeImage: parseBoolean(removeImage) }),
    ...(showReferenceText !== undefined && { showReferenceText: parseBoolean(showReferenceText) })
  };

  if (req.files?.audioFile?.[0]?.path) {
    updatePayload.audioURL = await uploadToS3(req.files.audioFile[0].path, 'audios');
  } else if (body.audioURL) {
    updatePayload.audioURL = body.audioURL;
  }

  let testImageUrls = undefined;

  if (body.testImageUrls !== undefined) {
    try {
      const parsedUrls = typeof body.testImageUrls === 'string' ? JSON.parse(body.testImageUrls) : body.testImageUrls;
      if (Array.isArray(parsedUrls)) {
        testImageUrls = [...parsedUrls];
      }
    } catch (e) {
      // ignore parsing error
    }
  }

  if (req.files?.testImage) {
    if (testImageUrls === undefined) {
      testImageUrls = [];
    }
    for (const file of req.files.testImage) {
      const url = await uploadToS3(file.path, 'images');
      if (url) {
        testImageUrls.push(url);
      }
    }
  }

  if (body.testImageUrl !== undefined) {
    if (testImageUrls === undefined) {
      testImageUrls = [];
    }
    if (body.testImageUrl && !testImageUrls.includes(body.testImageUrl)) {
      testImageUrls.unshift(body.testImageUrl);
    }
  }

  if (testImageUrls !== undefined) {
    updatePayload.testImageUrls = testImageUrls;
    updatePayload.testImageUrl = testImageUrls[0] || null;
  }

  const test = await testService.updateTest(id, updatePayload, { adminId: req.user.id });

  return sendResponse(
    res,
    200,
    true,
    'Test updated successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

export const deleteTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'test ID');

  await testService.deleteTest(id);

  return sendResponse(
    res,
    200,
    true,
    'Test deleted successfully',
    {},
    { adminId: req.user.id, testId: id }
  );
});

export const assignTestToBatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { batchIds } = req.body;

  validateObjectId(id, 'test ID');

  if (!batchIds || !Array.isArray(batchIds)) {
    throw new AppError('Batch IDs array is required', 400);
  }

  // Validate each batch ID
  batchIds.forEach((batchId, index) => {
    validateObjectId(batchId, `batch ID at index ${index}`);
  });

  const test = await testService.assignTestToBatches(id, batchIds);

  return sendResponse(
    res,
    200,
    true,
    'Test assigned to batches successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

export const removeTestFromBatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { batchIds } = req.body;

  if (!batchIds || !Array.isArray(batchIds)) {
    throw new AppError('Batch IDs array is required', 400);
  }

  const test = await testService.removeTestFromBatches(id, batchIds);

  return sendResponse(
    res,
    200,
    true,
    'Test removed from batches successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

export const blockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const test = await testService.blockTest(id, req.user.id, reason);

  return sendResponse(
    res,
    200,
    true,
    'Test blocked successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

export const unblockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const test = await testService.unblockTest(id, req.user.id);

  return sendResponse(
    res,
    200,
    true,
    'Test unblocked successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

export const assignTestToDates = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dateAssignments } = req.body;

  if (!dateAssignments || !Array.isArray(dateAssignments)) {
    throw new AppError('Date assignments array is required', 400);
  }

  const test = await testService.assignTestToDates(id, dateAssignments, req.user.id);

  return sendResponse(
    res,
    200,
    true,
    'Test assigned to dates successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

export const removeTestFromDates = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignmentIds } = req.body;

  if (!assignmentIds || !Array.isArray(assignmentIds)) {
    throw new AppError('Assignment IDs array is required', 400);
  }

  const test = await testService.removeTestFromDates(id, assignmentIds);

  return sendResponse(
    res,
    200,
    true,
    'Test removed from dates successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

// Get batch-test statistics
export const getBatchTestStatistics = asyncHandler(async (req, res) => {
  const { testId, batchId } = req.params;

  validateObjectId(testId, 'test ID');
  validateObjectId(batchId, 'batch ID');

  const statistics = await testService.getBatchTestStatistics(testId, batchId);

  return sendResponse(
    res,
    200,
    true,
    'Batch-test statistics retrieved successfully',
    statistics,
    { adminId: req.user.id, testId, batchId }
  );
});

// Close test for a batch
export const closeTestForBatch = asyncHandler(async (req, res) => {
  const { testId, batchId } = req.params;
  const { reason } = req.body;

  validateObjectId(testId, 'test ID');
  validateObjectId(batchId, 'batch ID');

  const test = await testService.closeTestForBatch(testId, batchId, req.user.id, reason || '');

  return sendResponse(
    res,
    200,
    true,
    'Test closed for batch successfully',
    { test },
    { adminId: req.user.id, testId, batchId }
  );
});

// Open (re-open) test for a batch
export const openTestForBatch = asyncHandler(async (req, res) => {
  const { testId, batchId } = req.params;

  validateObjectId(testId, 'test ID');
  validateObjectId(batchId, 'batch ID');

  const test = await testService.openTestForBatch(testId, batchId);

  return sendResponse(
    res,
    200,
    true,
    'Test opened for batch successfully',
    { test },
    { adminId: req.user.id, testId, batchId }
  );
});

// Generate rankings for batch-test
export const generateRankingsForBatchTest = asyncHandler(async (req, res) => {
  const { testId, batchId } = req.params;

  validateObjectId(testId, 'test ID');
  validateObjectId(batchId, 'batch ID');

  const result = await testService.generateRankingsForBatchTest(testId, batchId, req.user.id);

  return sendResponse(
    res,
    200,
    true,
    result.message,
    result,
    { adminId: req.user.id, testId, batchId }
  );
});

// Toggle test publication (publish/unpublish)
export const toggleTestPublication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { publish } = req.body; // Optional: explicitly set publish state (true/false), or omit to toggle

  validateObjectId(id, 'test ID');

  // Convert publish to boolean if provided, otherwise null (toggle)
  const publishState = publish !== undefined ? Boolean(publish) : null;

  const result = await testService.toggleTestPublication(id, req.user.id, publishState);

  const message = result.action === 'published'
    ? 'Test published successfully'
    : 'Test unpublished successfully';

  return sendResponse(
    res,
    200,
    true,
    message,
    result,
    { adminId: req.user.id, testId: id, action: result.action }
  );
});

// Generate S3 presigned upload URL
export const getPresignedUrl = asyncHandler(async (req, res) => {
  const { fileName, fileType, folder, files } = req.query;

  // Support generating multiple URLs
  if (files) {
    let parsedFiles;
    try {
      parsedFiles = typeof files === 'string' ? JSON.parse(files) : files;
    } catch (e) {
      throw new AppError('Invalid files format. Must be a valid JSON array.', 400);
    }

    if (!Array.isArray(parsedFiles)) {
      throw new AppError('files query parameter must be a JSON array', 400);
    }

    const urls = await Promise.all(
      parsedFiles.map(async (fileObj) => {
        const { fileName: name, fileType: type, folder: fFolder } = fileObj;
        if (!name || !type) {
          throw new AppError('Each file must have fileName and fileType properties', 400);
        }
        const { uploadUrl, downloadUrl } = await generatePresignedUploadUrl(name, type, fFolder || folder);
        return { fileName: name, uploadUrl, downloadUrl };
      })
    );

    return sendResponse(
      res,
      200,
      true,
      'Presigned S3 upload URLs generated successfully',
      { urls }
    );
  }

  // Fallback to single file logic
  if (!fileName || !fileType) {
    throw new AppError('fileName and fileType query parameters are required', 400);
  }

  const { uploadUrl, downloadUrl } = await generatePresignedUploadUrl(fileName, fileType, folder);

  return sendResponse(
    res,
    200,
    true,
    'Presigned S3 upload URL generated successfully',
    { uploadUrl, downloadUrl }
  );
});
