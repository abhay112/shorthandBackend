import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Test from '../models/Test.js';
import TestContent from '../models/TestContent.js';
import Result from '../models/Result.js';
import TestSession from '../models/TestSession.js';
import StudentRanking from '../models/StudentRanking.js';
import { createError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import {
  processResultSideEffects,
  calculateAndSaveRanking as calculateAndSaveRankingUtil
} from './utils/resultUtils.js';

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value._id) return toIdString(value._id);
  if (value.id) return toIdString(value.id);
  return value.toString();
};

const determineTestBatchId = (studentBatchIds, test) => {
  if (Array.isArray(test.assignedDays)) {
    for (const day of test.assignedDays) {
      const batchIdStr = toIdString(day.batchId);
      if (batchIdStr && studentBatchIds.includes(batchIdStr)) {
        return batchIdStr;
      }
    }
  }

  if (Array.isArray(test.assignedBatches)) {
    for (const batchId of test.assignedBatches) {
      const batchIdStr = toIdString(batchId);
      if (batchIdStr && studentBatchIds.includes(batchIdStr)) {
        return batchIdStr;
      }
    }
  }

  return null;
};

const getAttemptUsage = async (studentId, testId) => {
  const [completedAttempts, reservedAttempts] = await Promise.all([
    Result.countDocuments({ studentId, testId, status: 'completed' }),
    TestSession.countDocuments({
      studentId,
      testId,
      status: { $in: ['not_started', 'in_progress'] }
    })
  ]);

  return {
    completedAttempts,
    reservedAttempts,
    totalUsed: completedAttempts + reservedAttempts
  };
};

const reserveTestAttempt = async ({ studentId, studentBatchIds, test, attemptNumber }) => {
  const batchIdStr = determineTestBatchId(studentBatchIds, test);

  if (!batchIdStr) {
    throw createError('No batch assignment found for this test', 400);
  }

  const session = await TestSession.create({
    studentId,
    batchId: new mongoose.Types.ObjectId(batchIdStr),
    testId: test._id,
    sessionId: uuidv4(),
    currentAttempt: attemptNumber,
    totalAttempts: 0,
    maxRetakes: test.maxRetakes || 3, // Set maxRetakes to prevent validation error
    status: 'not_started',
    timeStarted: null,
    timeCompleted: null,
    timeExpires: null
  });

  return session;
};

const studentService = {
  // Authentication and Profile Management
  handleLogin: async (email, name, firebaseUid) => {
    try {
      let student = await Student.findOne({ email });

      if (student) {
        // Update last login and firebase UID if needed
        student.lastLogin = new Date();
        if (!student.firebaseUid) {
          student.firebaseUid = firebaseUid;
        }
        await student.save();
        return student;
      }

      // Create new student
      student = await Student.create({
        email,
        name,
        firebaseUid,
        lastLogin: new Date()
      });

      logger.info('New student created', { studentId: student._id, email });
      return student;
    } catch (error) {
      logger.error('Error in student login', { error: error.message, email });
      throw createError('Login failed', 500);
    }
  },

  getProfile: async (studentId) => {
    try {
      const student = await Student.findById(studentId)
        .populate('assignedBatches', 'name description startDate endDate')
        .select('-firebaseUid');

      if (!student) {
        throw createError('Student not found', 404);
      }

      // Get statistics
      const stats = await studentService.getStudentStatistics(studentId);
      
      // Format student data with statistics
      const studentData = student.toObject ? student.toObject() : student;
      return {
        ...studentData,
        id: studentData._id,
        approved: studentData.isApproved,
        blocked: studentData.isBlocked,
        active: !studentData.isBlocked && studentData.isApproved,
        memberSince: studentData.createdAt ? new Date(studentData.createdAt).toISOString().split('T')[0] : null,
        statistics: stats
      };
    } catch (error) {
      logger.error('Error fetching student profile', { error: error.message, studentId });
      throw error;
    }
  },

  updateProfile: async (studentId, updateData) => {
    try {
      const allowedUpdates = ['name'];
      const updates = {};

      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = updateData[key];
        }
      });

      const student = await Student.findByIdAndUpdate(
        studentId,
        updates,
        { new: true, runValidators: true }
      ).select('-firebaseUid');

      if (!student) {
        throw createError('Student not found', 404);
      }

      logger.info('Student profile updated', { studentId, updates });
      return student;
    } catch (error) {
      logger.error('Error updating student profile', { error: error.message, studentId });
      throw error;
    }
  },

  // Dashboard and Overview
  getDashboard: async (studentId) => {
    try {
      const student = await Student.findById(studentId)
        .populate('assignedBatches', 'name description startDate endDate isActive');

      if (!student) {
        throw createError('Student not found', 404);
      }

      // Get current day's test
      const currentTest = await studentService.getCurrentDayTest(studentId);

      // Get recent results
      const recentResults = await Result.find({ studentId })
        .populate('testId', 'title difficulty category')
        .populate('batchId', 'name')
        .sort({ submittedAt: -1 })
        .limit(5);

      // Get overall statistics
      const stats = await studentService.getStudentStatistics(studentId);

      // Get ranking information
      const rankings = await StudentRanking.find({ studentId })
        .populate('testId', 'title')
        .populate('batchId', 'name')
        .sort({ testDate: -1 })
        .limit(5);

      // Get upcoming tests
      const upcomingTests = await studentService.getUpcomingTests(studentId);

      return {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          isApproved: student.isApproved,
          isBlocked: student.isBlocked,
          assignedBatches: student.assignedBatches
        },
        currentTest,
        recentResults,
        statistics: stats,
        rankings,
        upcomingTests
      };
    } catch (error) {
      logger.error('Error fetching student dashboard', { error: error.message, studentId });
      throw error;
    }
  },

  getStudentStatistics: async (studentId) => {
    try {
      const results = await Result.find({ studentId, status: 'completed' });

      if (results.length === 0) {
        return {
          totalTests: 0,
          averageWpm: 0,
          averageAccuracy: 0,
          bestWpm: 0,
          bestAccuracy: 0,
          totalTimeSpent: 0,
          improvementTrend: 'stable'
        };
      }

      const totalTests = results.length;
      const averageWpm = results.reduce((sum, r) => sum + r.wpm, 0) / totalTests;
      const averageAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / totalTests;
      const bestWpm = Math.max(...results.map(r => r.wpm));
      const bestAccuracy = Math.max(...results.map(r => r.accuracy));
      const totalTimeSpent = results.reduce((sum, r) => sum + r.timeTaken, 0);

      // Calculate improvement trend
      const recentResults = results.slice(-5);
      const olderResults = results.slice(-10, -5);

      let improvementTrend = 'stable';
      if (recentResults.length >= 3 && olderResults.length >= 3) {
        const recentAvg = recentResults.reduce((sum, r) => sum + r.wpm, 0) / recentResults.length;
        const olderAvg = olderResults.reduce((sum, r) => sum + r.wpm, 0) / olderResults.length;

        if (recentAvg > olderAvg * 1.05) improvementTrend = 'improving';
        else if (recentAvg < olderAvg * 0.95) improvementTrend = 'declining';
      }

      return {
        totalTests,
        averageWpm: Math.round(averageWpm * 100) / 100,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        bestWpm,
        bestAccuracy,
        totalTimeSpent,
        improvementTrend
      };
    } catch (error) {
      logger.error('Error calculating student statistics', { error: error.message, studentId });
      throw error;
    }
  },

  getUtcDayRange: (date = new Date()) => {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
    return { start, end };
  },
  getCurrentDayTest: async (studentId) => {
    try {
      const student = await Student.findById(studentId).populate('assignedBatches').lean();
      if (!student) {
        logger.info('student not found', { studentId });
        return null;
      }
      if (!student.assignedBatches || student.assignedBatches.length === 0) {
        logger.info('student has no batches', { studentId });
        return null;
      }

      const batchIdStrings = Array.from(new Set(student.assignedBatches.map(b => String(b._id))));
      const batchIds = student.assignedBatches.map(batch => batch._id);

      // Get today's UTC date range
      const { start: startUtc, end: endUtc } = studentService.getUtcDayRange();

      // Find tests assigned to the student's batches for today
      // Priority: Day-specific assignments > General batch assignments
      const testsFromAssignedDays = await Test.find({
        'assignedDays': {
          $elemMatch: {
            batchId: { $in: batchIds },
            assignedDate: {
              $gte: startUtc,
              $lt: endUtc
            },
            isActive: true
          }
        },
        isActive: true,
        isPublished: true
      })
        .populate('assignedDays.batchId', 'name')
        .lean();
      
      const testsFromAssignedBatches = await Test.find({ 
        assignedBatches: { $in: batchIds },
        isActive: true,
        isPublished: true,
        // Only include if no specific day assignments exist
        'assignedDays.0': { $exists: false }
      })
        .populate('assignedBatches', 'name')
        .lean();

      // Combine and prioritize day-specific tests
      const allAvailableTests = [...testsFromAssignedDays, ...testsFromAssignedBatches];

      logger.debug('tests found for student today', { 
        studentId, 
        batchIds, 
        assignedDaysTests: testsFromAssignedDays.length,
        assignedBatchesTests: testsFromAssignedBatches.length,
        totalTests: allAvailableTests.length,
        startUtc,
        endUtc
      });

      if (!allAvailableTests || allAvailableTests.length === 0) {
        logger.info('no test found for student today', { studentId, batchIds, startUtc, endUtc });
        return null;
      }

      // Sort tests by priority (day-specific tests first, then by priority, then by creation date)
      const sortedTests = allAvailableTests.sort((a, b) => {
        // Day-specific tests have higher priority
        const aHasDayAssignment = a.assignedDays && a.assignedDays.length > 0;
        const bHasDayAssignment = b.assignedDays && b.assignedDays.length > 0;
        
        if (aHasDayAssignment && !bHasDayAssignment) return -1;
        if (!aHasDayAssignment && bHasDayAssignment) return 1;
        
        // If both have day assignments, sort by priority
        if (aHasDayAssignment && bHasDayAssignment) {
          const aPriority = Math.max(...a.assignedDays.map(ad => ad.priority || 1));
          const bPriority = Math.max(...b.assignedDays.map(ad => ad.priority || 1));
          if (aPriority !== bPriority) return bPriority - aPriority;
        }
        
        // Finally sort by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Return all available tests for today (multiple tests per day support)
      const testsWithMetadata = [];

      for (const test of sortedTests) {
        // Find the specific day assignment for this test
        let matchedDay = null;
        let assignedBatch = null;

        if (test.assignedDays && test.assignedDays.length > 0) {
          matchedDay = test.assignedDays.find(ad => {
            const bid = ad.batchId && (ad.batchId._id || ad.batchId);
            const matchBatch = batchIdStrings.includes(String(bid));
            const d = new Date(ad.assignedDate);
            return matchBatch && d >= startUtc && d < endUtc && ad.isActive;
          });
          assignedBatch = matchedDay?.batchId;
        } else if (test.assignedBatches && test.assignedBatches.length > 0) {
          // General assignment
          assignedBatch = test.assignedBatches.find(batch => 
            batchIdStrings.includes(String(batch._id || batch))
          );
        }

        // Check if student can take this test (considering blocking)
        const accessCheck = await studentService.canStudentTakeTest(studentId, test._id, { consumeAttempt: false });
        
        // Get completion info for this test
        const existingAttempts = await Result.find({ 
          studentId, 
          testId: test._id,
          status: 'completed'
        }).sort({ submittedAt: -1 }).lean();

        const attemptCount = existingAttempts.length;
        const hasCompleted = attemptCount > 0;
        const lastAttempt = hasCompleted ? existingAttempts[0] : null;
        
        // Check if completed today
        const { start: todayStart, end: todayEnd } = studentService.getUtcDayRange();
        const completedToday = hasCompleted && lastAttempt && 
          new Date(lastAttempt.submittedAt) >= todayStart && 
          new Date(lastAttempt.submittedAt) < todayEnd;
        
        // Check if test content can be viewed (even if blocked)
        const canViewContent = !test.isBlocked || test.allowViewWhenBlocked;

        // Determine test status
        let testStatus = 'available';
        if (test.isBlocked) {
          testStatus = 'blocked';
        } else if (hasCompleted && completedToday) {
          testStatus = 'completed';
        } else if (hasCompleted) {
          testStatus = 'completed';
        }

        testsWithMetadata.push({
          test: {
            id: test._id,
            title: test.title,
            description: test.description,
            testType: test.testType,
            difficulty: test.difficulty,
            category: test.category,
            duration: test.duration,
            maxRetakes: test.maxRetakes,
            settings: test.settings,
            isBlocked: test.isBlocked,
            blockReason: test.blockReason,
            status: testStatus
          },
          canTakeTest: accessCheck.canTake && !test.isBlocked,
          canViewContent,
          assignedBatch,
          priority: matchedDay?.priority || 1,
          isBlocked: test.isBlocked,
          blockReason: test.blockReason,
          // Attempt information
          attemptInfo: {
            totalAttempts: attemptCount,
            maxRetakes: test.maxRetakes,
            remainingAttempts: accessCheck.remainingAttempts || 0,
            hasCompleted: hasCompleted,
            completedToday: completedToday,
            lastAttemptDate: lastAttempt ? lastAttempt.submittedAt : null,
            lastAttemptScore: lastAttempt ? {
              wpm: lastAttempt.wpm,
              accuracy: lastAttempt.accuracy,
              rank: lastAttempt.rank,
              percentile: lastAttempt.percentile
            } : null
          }
        });
      }

      // Return the highest priority test as primary, but include all tests for the day
      return {
        primaryTest: testsWithMetadata[0] || null,
        allTestsForToday: testsWithMetadata,
        totalTestsAvailable: testsWithMetadata.length
      };

    } catch (err) {
      logger.error('Error in getCurrentDayTest', { error: err.message, studentId });
      throw err;
    }
  },


  getUpcomingTests: async (studentId) => {
    try {
      const student = await Student.findById(studentId).populate('assignedBatches');

      if (!student || !student.assignedBatches.length) {
        return [];
      }

      const batchIds = student.assignedBatches.map(batch => batch._id);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const upcomingTests = await Test.find({
        'assignedDays.batchId': { $in: batchIds },
        'assignedDays.date': {
          $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          $lte: nextWeek
        },
        isActive: true,
        isPublished: true
      })
        .populate('assignedDays.batchId', 'name')
        .sort({ 'assignedDays.date': 1 })
        .limit(7);

      return upcomingTests.map(test => ({
        id: test._id,
        title: test.title,
        difficulty: test.difficulty,
        category: test.category,
        duration: test.duration,
        assignedDate: test.assignedDays.find(day =>
          batchIds.some(batchId => batchId.toString() === day.batchId._id.toString())
        )?.date,
        assignedBatch: test.assignedDays.find(day =>
          batchIds.some(batchId => batchId.toString() === day.batchId._id.toString())
        )?.batchId
      }));
    } catch (error) {
      logger.error('Error fetching upcoming tests', { error: error.message, studentId });
      throw error;
    }
  },

  canStudentTakeTest: async (studentId, testId, options = {}) => {
    const { consumeAttempt = false } = options;

    try {
      const student = await Student.findById(studentId);
      if (!student || !student.isApproved || student.isBlocked) {
        return { canTake: false, reason: 'Student not approved or blocked' };
      }

      const test = await Test.findById(testId);
      if (!test || !test.isActive || !test.isPublished) {
        return { canTake: false, reason: 'Test not available' };
      }

      if (test.isBlocked) {
        return { canTake: false, reason: 'Test is currently blocked by admin' };
      }

      const studentBatchIds = (student.assignedBatches || []).map(id => toIdString(id)).filter(Boolean);

      // Check if test is closed for any of the student's batches
      const isClosedForStudentBatch = studentBatchIds.some(batchId => test.isClosedForBatch(batchId));
      if (isClosedForStudentBatch) {
        return { canTake: false, reason: 'Test is closed for your batch. Time\'s up!' };
      }

      const dayBasedBatches = (test.assignedDays || []).map(day => toIdString(day.batchId)).filter(Boolean);
      const generalBatches = (test.assignedBatches || []).map(id => toIdString(id)).filter(Boolean);

      const allTestBatches = Array.from(new Set([...dayBasedBatches, ...generalBatches]));
      const hasAccess = studentBatchIds.some(batchId => allTestBatches.includes(batchId));

      if (!hasAccess) {
        logger.debug('Access check failed', {
          studentId,
          testId,
          studentBatchIds,
          dayBasedBatches,
          generalBatches
        });
        return { canTake: false, reason: 'No access to this test' };
      }

      const { completedAttempts, reservedAttempts, totalUsed } = await getAttemptUsage(studentId, testId);
      const remainingAttempts = test.maxRetakes - totalUsed;

      // Check if test has been completed today
      const { start: todayStart, end: todayEnd } = studentService.getUtcDayRange();
      const completedToday = await Result.findOne({
        studentId,
        testId,
        status: 'completed',
        submittedAt: {
          $gte: todayStart,
          $lt: todayEnd
        }
      }).lean();

      if (consumeAttempt) {
        if (remainingAttempts <= 0) {
          // Check if there are any completed attempts
          if (completedAttempts > 0) {
            return { canTake: false, reason: 'You have already completed this test' };
          }
          return { canTake: false, reason: 'Maximum retakes exceeded' };
        }

        const attemptNumber = totalUsed + 1;
        
        const reservation = await reserveTestAttempt({
          studentId,
          studentBatchIds,
          test,
          attemptNumber
        });

        return {
          canTake: true,
          remainingAttempts: Math.max(0, remainingAttempts - 1),
          attemptNumber,
          reservationSessionId: reservation.sessionId
        };
      }

      if (remainingAttempts <= 0) {
        if (reservedAttempts > 0) {
          return {
            canTake: true,
            remainingAttempts: 0,
            reservedAttempts,
            nextAttemptNumber: totalUsed
          };
        }
        // Check if test has been completed
        if (completedAttempts > 0) {
          return { canTake: false, reason: 'You have already completed this test' };
        }
        return { canTake: false, reason: 'Maximum retakes exceeded' };
      }

      return {
        canTake: true,
        remainingAttempts,
        nextAttemptNumber: totalUsed + 1,
        reservedAttempts,
        completedAttempts
      };
    } catch (error) {
      logger.error('Error checking test access', { error: error.message, studentId, testId });
      throw error;
    }
  },

  // Test Session Management
  startTestSession: async (studentId, testId) => {
    try {
      const accessCheck = await studentService.canStudentTakeTest(studentId, testId, { consumeAttempt: false });
      if (!accessCheck.canTake) {
        throw createError(accessCheck.reason || 'Test access denied', 403);
      }

      const [student, test] = await Promise.all([
        Student.findById(studentId).populate('assignedBatches'),
        Test.findById(testId).populate('currentContent')
      ]);

      if (!student || !student.isApproved || student.isBlocked) {
        throw createError('Student not approved or blocked', 403);
      }

      if (!test || !test.isActive || !test.isPublished) {
        throw createError('Test not available', 404);
      }

      const studentBatchIds = (student.assignedBatches || []).map(batch => toIdString(batch._id || batch)).filter(Boolean);

      const { completedAttempts, reservedAttempts, totalUsed } = await getAttemptUsage(studentId, testId);
      const attemptLimit = test.maxRetakes;

      if (totalUsed >= attemptLimit && reservedAttempts === 0) {
        throw createError('Maximum retakes exceeded', 403);
      }

      let session = await TestSession.findOne({
        studentId,
        testId,
        status: 'not_started'
      }).sort({ createdAt: -1 });

      if (!session) {
        session = await TestSession.findOne({
          studentId,
          testId,
          status: 'in_progress'
        });
      }

      if (session) {
        session.maxRetakes = test.maxRetakes;
      }

      if (session && session.status === 'not_started') {
        session.status = 'in_progress';
        session.timeStarted = new Date();
        session.timeExpires = new Date(Date.now() + test.duration * 1000);
        await session.save();
      } else if (session && session.status === 'in_progress') {
        session.timeExpires = new Date(Date.now() + test.duration * 1000);
        await session.save();
      } else {
        if (totalUsed >= attemptLimit) {
          throw createError('Maximum retakes exceeded', 403);
        }

        const batchIdStr = determineTestBatchId(studentBatchIds, test);
        if (!batchIdStr) {
          throw createError('No batch assignment found for this test', 400);
        }

        session = await TestSession.create({
          studentId,
          batchId: new mongoose.Types.ObjectId(batchIdStr),
          testId,
          sessionId: uuidv4(),
          currentAttempt: totalUsed + 1,
          totalAttempts: 0,
          maxRetakes: test.maxRetakes,
          status: 'in_progress',
          timeStarted: new Date(),
          timeExpires: new Date(Date.now() + test.duration * 1000)
        });

        logger.info('Test session started', {
          studentId,
          testId,
          sessionId: session.sessionId,
          attemptNumber: session.currentAttempt
        });
      }

      const contentDoc = test.currentContent
        ? (test.currentContent.referenceText ? test.currentContent : await TestContent.findById(test.currentContent))
        : null;

      const content = contentDoc
        ? {
            version: contentDoc.version,
            referenceText: contentDoc.referenceText || '',
            audio: contentDoc.audio?.url || null,
            audioMeta: contentDoc.audio
              ? {
                  url: contentDoc.audio.url,
                  duration: contentDoc.audio.duration,
                  format: contentDoc.audio.format,
                  size: contentDoc.audio.size
                }
              : null
          }
        : {
            referenceText: test.referenceText || '',
            audio: test.audioURL || null,
            audioMeta: null
          };

      const usageAfter = await getAttemptUsage(studentId, testId);
      const remainingAttempts = Math.max(0, test.maxRetakes - usageAfter.totalUsed);

      return {
        sessionId: session.sessionId,
        test: {
          id: test._id,
          title: test.title,
          duration: test.duration,
          settings: test.settings
        },
        content,
        attemptNumber: session.currentAttempt || 1,
        remainingAttempts,
        timeExpires: session.timeExpires
      };
    } catch (error) {
      logger.error('Error starting test session', { error: error.message, studentId, testId });
      throw error;
    }
  },

  endTestSession: async (studentId, sessionId, resultData) => {
    try {
      const session = await TestSession.findOne({
        studentId,
        sessionId,
        status: 'in_progress'
      });

      if (!session) {
        throw createError('Active test session not found', 404);
      }

      // Update session
      session.status = 'completed';
      session.timeCompleted = new Date();
      session.totalAttempts += 1;
      await session.save();

      // Create result
      const result = await Result.create({
        ...resultData,
        studentId,
        batchId: session.batchId,
        testId: session.testId,
        sessionId,
        attemptNumber: session.currentAttempt,
        isRetake: session.currentAttempt > 1,
        timeStarted: session.timeStarted,
        timeCompleted: session.timeCompleted,
        timeTaken: Math.floor((session.timeCompleted - session.timeStarted) / 1000)
      });

      // Add result to session
      session.results.push(result._id);
      await session.save();

      // Process result side effects (student linkage, statistics, ranking)
      await processResultSideEffects({
        studentId,
        batchId: session.batchId,
        testId: session.testId,
        result
      });

      logger.info('Test session completed', {
        studentId,
        testId: session.testId,
        sessionId,
        resultId: result._id
      });

      return result;
    } catch (error) {
      logger.error('Error ending test session', { error: error.message, studentId, sessionId });
      throw error;
    }
  },

  // Results and Rankings
  getStudentResults: async (studentId, options = {}) => {
    try {
      const {
        batchId,
        testId,
        limit = 20,
        page = 1,
        sortBy = 'submittedAt',
        sortOrder = 'desc'
      } = options;

      const query = { studentId, status: 'completed' };
      if (batchId) query.batchId = batchId;
      if (testId) query.testId = testId;

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const results = await Result.find(query)
        .populate('testId', 'title difficulty category')
        .populate('batchId', 'name')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Result.countDocuments(query);

      return {
        results,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      };
    } catch (error) {
      logger.error('Error fetching student results', { error: error.message, studentId });
      throw error;
    }
  },

  getStudentResultById: async (studentId, resultId) => {
    try {
      const result = await Result.findOne({ _id: resultId, studentId })
        .populate('testId', 'title description difficulty category duration referenceText')
        .populate('batchId', 'name description')
        .populate('studentId', 'name email')
        .lean();

      if (!result) {
        throw createError('Result not found or you do not have access to it', 404);
      }

      // Get ranking context if available
      let rankingContext = null;
      if (result.rank) {
        const totalResults = await Result.countDocuments({
          batchId: result.batchId._id,
          testId: result.testId._id,
          status: 'completed'
        });

        rankingContext = {
          rank: result.rank,
          percentile: result.percentile,
          totalParticipants: totalResults
        };
      }

      // Calculate error statistics
      const errorStats = {
        totalErrors: result.stenographyErrors?.length || 0,
        errorsByType: {},
        errorsBySeverity: {}
      };

      if (result.stenographyErrors && result.stenographyErrors.length > 0) {
        result.stenographyErrors.forEach(error => {
          // Count by type
          errorStats.errorsByType[error.type] = (errorStats.errorsByType[error.type] || 0) + 1;
          // Count by severity
          errorStats.errorsBySeverity[error.severity] = (errorStats.errorsBySeverity[error.severity] || 0) + 1;
        });
      }

      // Get comparison with student's average
      const studentAverage = await Result.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(studentId), status: 'completed' } },
        {
          $group: {
            _id: null,
            avgWpm: { $avg: '$wpm' },
            avgAccuracy: { $avg: '$accuracy' },
            avgSpeed: { $avg: '$speed' }
          }
        }
      ]);

      const comparison = studentAverage.length > 0 ? {
        wpmDiff: result.wpm - studentAverage[0].avgWpm,
        accuracyDiff: result.accuracy - studentAverage[0].avgAccuracy,
        speedDiff: result.speed - studentAverage[0].avgSpeed,
        studentAverage: {
          wpm: Math.round(studentAverage[0].avgWpm * 100) / 100,
          accuracy: Math.round(studentAverage[0].avgAccuracy * 100) / 100,
          speed: Math.round(studentAverage[0].avgSpeed * 100) / 100
        }
      } : null;

      return {
        ...result,
        rankingContext,
        errorStats,
        comparison
      };
    } catch (error) {
      logger.error('Error fetching student result by ID', { error: error.message, studentId, resultId });
      throw error;
    }
  },

  calculateAndSaveRanking: async (studentId, batchId, testId, result) => {
    return calculateAndSaveRankingUtil(studentId, batchId, testId, result);
  },

  getStudentRankings: async (studentId, options = {}) => {
    try {
      const { batchId, limit = 20, page = 1 } = options;

      const query = { studentId };
      if (batchId) query.batchId = batchId;

      const allRankings = await StudentRanking.find(query)
        .populate('testId', 'title difficulty category')
        .populate('batchId', 'name')
        .sort({ testDate: -1 });

      // Filter rankings to only include those where rankings are generated for the batch-test
      const validRankings = [];
      for (const ranking of allRankings) {
        if (ranking.testId && ranking.batchId) {
          const test = await Test.findById(ranking.testId);
          if (test && test.areRankingsGeneratedForBatch(ranking.batchId._id || ranking.batchId)) {
            validRankings.push(ranking);
          }
        }
      }

      // Apply pagination
      const total = validRankings.length;
      const paginatedRankings = validRankings.slice((page - 1) * limit, page * limit);

      return {
        rankings: paginatedRankings,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      };
    } catch (error) {
      logger.error('Error fetching student rankings', { error: error.message, studentId });
      throw error;
    }
  },

  // Batch-specific operations
  getBatchLeaderboard: async (batchId, testId = null) => {
    try {
      const query = { batchId };
      if (testId) {
        query.testId = testId;
        
        // Check if rankings are generated for this batch-test combination
        const test = await Test.findById(testId);
        if (!test || !test.areRankingsGeneratedForBatch(batchId)) {
          return [];
        }
      } else {
        // For batch-only queries, filter by tests that have rankings generated
        const allRankings = await StudentRanking.find(query)
          .populate('studentId', 'name email')
          .populate('testId', 'title')
          .sort({ rank: 1 })
          .limit(50);

        const validRankings = [];
        for (const ranking of allRankings) {
          if (ranking.testId) {
            const test = await Test.findById(ranking.testId);
            if (test && test.areRankingsGeneratedForBatch(batchId)) {
              validRankings.push(ranking);
            }
          }
        }
        return validRankings;
      }

      const rankings = await StudentRanking.find(query)
        .populate('studentId', 'name email')
        .populate('testId', 'title')
        .sort({ rank: 1 })
        .limit(50);

      return rankings;
    } catch (error) {
      logger.error('Error fetching batch leaderboard', { error: error.message, batchId, testId });
      throw error;
    }
  },

  // Profile API Methods
  getWpmTrend: async (studentId, options = {}) => {
    try {
      const { days = 30, period } = options;
      let startDate = new Date();
      
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (period === 'year') {
        startDate.setDate(startDate.getDate() - 365);
      } else {
        startDate.setDate(startDate.getDate() - days);
      }

      const results = await Result.find({
        studentId,
        status: 'completed',
        submittedAt: { $gte: startDate }
      })
        .sort({ submittedAt: 1 })
        .select('wpm submittedAt')
        .lean();

      // Group by day and calculate average WPM per day
      const wpmByDay = {};
      results.forEach(result => {
        const day = new Date(result.submittedAt).toISOString().split('T')[0];
        if (!wpmByDay[day]) {
          wpmByDay[day] = { wpm: [], date: day };
        }
        wpmByDay[day].wpm.push(result.wpm);
      });

      const wpmTrend = Object.keys(wpmByDay)
        .sort()
        .map((day, index) => ({
          day: index + 1,
          wpm: Math.round(wpmByDay[day].wpm.reduce((a, b) => a + b, 0) / wpmByDay[day].wpm.length),
          date: new Date(day).toISOString()
        }));

      return wpmTrend;
    } catch (error) {
      logger.error('Error fetching WPM trend', { error: error.message, studentId });
      throw error;
    }
  },

  getBestPerformance: async (studentId) => {
    try {
      const results = await Result.find({ studentId, status: 'completed' })
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .lean();

      if (results.length === 0) {
        return {
          bestWpm: 0,
          bestAccuracy: 0,
          bestRank: null,
          testsToday: 0,
          bestWpmDate: null,
          bestAccuracyDate: null,
          bestRankDate: null,
          bestRankTest: null
        };
      }

      // Get today's test count
      const { start: todayStart, end: todayEnd } = studentService.getUtcDayRange();
      const testsToday = results.filter(r => {
        const submitted = new Date(r.submittedAt);
        return submitted >= todayStart && submitted < todayEnd;
      }).length;

      // Find best WPM
      const bestWpmResult = results.reduce((best, current) => 
        current.wpm > best.wpm ? current : best
      );

      // Find best accuracy
      const bestAccuracyResult = results.reduce((best, current) => 
        current.accuracy > best.accuracy ? current : best
      );

      // Find best rank
      const rankedResults = results.filter(r => r.rank !== null && r.rank !== undefined);
      const bestRankResult = rankedResults.length > 0 
        ? rankedResults.reduce((best, current) => 
            (current.rank < best.rank || best.rank === null) ? current : best
          )
        : null;

      return {
        bestWpm: bestWpmResult.wpm,
        bestAccuracy: bestAccuracyResult.accuracy,
        bestRank: bestRankResult ? bestRankResult.rank : null,
        testsToday,
        bestWpmDate: bestWpmResult.submittedAt,
        bestAccuracyDate: bestAccuracyResult.submittedAt,
        bestRankDate: bestRankResult ? bestRankResult.submittedAt : null,
        bestRankTest: bestRankResult && bestRankResult.testId ? {
          id: bestRankResult.testId._id || bestRankResult.testId,
          title: bestRankResult.testId.title
        } : null
      };
    } catch (error) {
      logger.error('Error fetching best performance', { error: error.message, studentId });
      throw error;
    }
  },

  getRecentActivity: async (studentId, options = {}) => {
    try {
      const { limit = 4 } = options;
      
      // Get recent results (test completions)
      const recentResults = await Result.find({ studentId, status: 'completed' })
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .limit(limit)
        .lean();

      // Get recent test sessions (test started)
      const recentSessions = await TestSession.find({ studentId })
        .populate('testId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Get audit logs for this student
      const AuditLog = (await import('../models/AuditLog.js')).default;
      const auditLogs = await AuditLog.find({
        entityType: 'Student',
        entityId: studentId
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      const activities = [];

      // Process results
      recentResults.forEach((result, index) => {
        activities.push({
          id: `result_${result._id}`,
          type: 'test_completed',
          text: 'Completed Test',
          detail: `${result.testId?.title || 'Test'} - ${result.wpm} WPM, ${result.accuracy}% Accuracy`,
          timestamp: result.submittedAt,
          time: formatTimeAgo(result.submittedAt),
          icon: 'CheckCircle',
          color: 'text-green-500',
          metadata: {
            testId: result.testId?._id || result.testId,
            testTitle: result.testId?.title,
            wpm: result.wpm,
            accuracy: result.accuracy,
            resultId: result._id
          }
        });
      });

      // Process sessions
      recentSessions.forEach((session) => {
        if (session.status === 'not_started' || session.status === 'in_progress') {
          activities.push({
            id: `session_${session._id}`,
            type: 'test_started',
            text: 'Started Test',
            detail: `${session.testId?.title || 'Test'} - Session started`,
            timestamp: session.createdAt,
            time: formatTimeAgo(session.createdAt),
            icon: 'Activity',
            color: 'text-blue-500',
            metadata: {
              testId: session.testId?._id || session.testId,
              testTitle: session.testId?.title,
              sessionId: session.sessionId
            }
          });
        }
      });

      // Process audit logs
      auditLogs.forEach((log) => {
        if (log.action === 'UPDATE' && log.changes?.fieldsChanged?.includes('name')) {
          activities.push({
            id: `audit_${log._id}`,
            type: 'profile_updated',
            text: 'Profile Updated',
            detail: 'Updated contact information',
            timestamp: log.timestamp,
            time: formatTimeAgo(log.timestamp),
            icon: 'Edit',
            color: 'text-purple-500',
            metadata: {
              fieldsUpdated: log.changes?.fieldsChanged || []
            }
          });
        } else if (log.action === 'ASSIGN_BATCH') {
          activities.push({
            id: `audit_${log._id}`,
            type: 'batch_assigned',
            text: 'Assigned to Batch',
            detail: 'Added to batch',
            timestamp: log.timestamp,
            time: formatTimeAgo(log.timestamp),
            icon: 'FileText',
            color: 'text-orange-500',
            metadata: {
              batchId: log.batchId,
              batchName: log.changes?.after?.batchName
            }
          });
        } else if (log.action === 'APPROVE') {
          activities.push({
            id: `audit_${log._id}`,
            type: 'account_approved',
            text: 'Account Approved',
            detail: 'Student account approved by Admin',
            timestamp: log.timestamp,
            time: formatTimeAgo(log.timestamp),
            icon: 'CheckCircle',
            color: 'text-green-500',
            metadata: {
              approvedBy: log.performedBy
            }
          });
        }
      });

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return activities.slice(0, limit);
    } catch (error) {
      logger.error('Error fetching recent activity', { error: error.message, studentId });
      throw error;
    }
  },

  getAssignedBatchesWithDetails: async (studentId) => {
    try {
      const student = await Student.findById(studentId)
        .populate({
          path: 'assignedBatches',
          populate: {
            path: 'tests',
            select: 'title'
          }
        })
        .lean();

      if (!student || !student.assignedBatches) {
        return [];
      }

      const batches = await Promise.all(
        student.assignedBatches.map(async (batch) => {
          // Get student count
          const studentCount = await Student.countDocuments({ assignedBatches: batch._id });
          
          // Get test count
          const testCount = await Test.countDocuments({
            $or: [
              { assignedBatches: batch._id },
              { 'assignedDays.batchId': batch._id }
            ]
          });

          // Get recent test results for this batch
          const recentResults = await Result.find({
            studentId,
            batchId: batch._id,
            status: 'completed'
          })
            .populate('testId', 'title')
            .sort({ submittedAt: -1 })
            .limit(2)
            .lean();

          // Calculate progress (percentage of tests completed)
          const totalTests = testCount;
          const completedTests = await Result.countDocuments({
            studentId,
            batchId: batch._id,
            status: 'completed'
          });
          const progress = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

          return {
            id: batch._id,
            _id: batch._id,
            name: batch.name,
            description: batch.description,
            status: batch.isActive ? 'active' : 'inactive',
            duration: batch.startDate && batch.endDate
              ? `${Math.ceil((new Date(batch.endDate) - new Date(batch.startDate)) / (1000 * 60 * 60 * 24 * 30))} months`
              : 'N/A',
            students: `${studentCount} students`,
            studentCount,
            tests: testCount,
            testCount,
            progress,
            assignedAt: student.createdAt,
            recentTests: recentResults.map(r => ({
              testId: r.testId?._id || r.testId,
              testTitle: r.testId?.title,
              wpm: r.wpm,
              accuracy: r.accuracy,
              rank: r.rank,
              completedAt: r.submittedAt
            }))
          };
        })
      );

      return batches;
    } catch (error) {
      logger.error('Error fetching assigned batches with details', { error: error.message, studentId });
      throw error;
    }
  },

  getTestHistory: async (studentId, options = {}) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        batchId,
        sortBy = 'date',
        sortOrder = 'desc'
      } = options;

      const query = { studentId, status: 'completed' };
      
      if (batchId) {
        query.batchId = batchId;
      }

      if (search) {
        const testIds = await Test.find({
          title: { $regex: search, $options: 'i' }
        }).select('_id').lean();
        query.testId = { $in: testIds.map(t => t._id) };
      }

      if (status) {
        query.status = status;
      }

      const sortOptions = {};
      if (sortBy === 'date') {
        sortOptions.submittedAt = sortOrder === 'asc' ? 1 : -1;
      } else if (sortBy === 'wpm') {
        sortOptions.wpm = sortOrder === 'asc' ? 1 : -1;
      } else if (sortBy === 'accuracy') {
        sortOptions.accuracy = sortOrder === 'asc' ? 1 : -1;
      } else if (sortBy === 'rank') {
        sortOptions.rank = sortOrder === 'asc' ? 1 : -1;
      }

      const skip = (page - 1) * limit;
      const [results, total] = await Promise.all([
        Result.find(query)
          .populate('testId', 'title description testType difficulty category duration')
          .populate('batchId', 'name')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Result.countDocuments(query)
      ]);

      // Get total students for each test to calculate percentile
      const tests = await Promise.all(
        results.map(async (result) => {
          // Handle null references (deleted tests or batches)
          if (!result.testId) {
            return {
              id: result._id,
              _id: result._id,
              test: {
                id: null,
                title: 'Deleted Test',
                description: null,
                testType: null,
                difficulty: null,
                category: null,
                duration: null
              },
              batch: result.batchId ? {
                id: result.batchId._id,
                name: result.batchId.name || 'Unknown Batch'
              } : {
                id: null,
                name: 'Deleted Batch'
              },
              status: result.status,
              completedAt: result.submittedAt,
              completedAgo: formatTimeAgo(result.submittedAt),
              wpm: result.wpm,
              accuracy: result.accuracy,
              rank: result.rank,
              totalStudents: 0,
              percentile: result.percentile,
              duration: result.timeTaken,
              attempts: {
                current: result.attemptNumber,
                max: 3
              },
              resultId: result._id
            };
          }

          const totalStudents = await Result.countDocuments({
            testId: result.testId._id,
            status: 'completed'
          });

          return {
            id: result._id,
            _id: result._id,
            test: {
              id: result.testId._id,
              title: result.testId.title || 'Unknown Test',
              description: result.testId.description || null,
              testType: result.testId.testType || null,
              difficulty: result.testId.difficulty || null,
              category: result.testId.category || null,
              duration: result.testId.duration || null
            },
            batch: result.batchId ? {
              id: result.batchId._id,
              name: result.batchId.name || 'Unknown Batch'
            } : {
              id: result.batchId || null,
              name: 'Deleted Batch'
            },
            status: result.status,
            completedAt: result.submittedAt,
            completedAgo: formatTimeAgo(result.submittedAt),
            wpm: result.wpm,
            accuracy: result.accuracy,
            rank: result.rank,
            totalStudents,
            percentile: result.percentile,
            duration: result.timeTaken,
            attempts: {
              current: result.attemptNumber,
              max: 3 // This should come from test settings
            },
            resultId: result._id
          };
        })
      );

      return {
        tests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      logger.error('Error fetching test history', { error: error.message, studentId });
      throw error;
    }
  },

  getPerformanceRankings: async (studentId) => {
    try {
      // Get global rankings
      const allResults = await Result.find({ status: 'completed' })
        .select('studentId wpm accuracy')
        .lean();

      const studentResults = allResults.filter(r => r.studentId.toString() === studentId.toString());
      const allWpm = allResults.map(r => r.wpm).sort((a, b) => b - a);
      const studentWpm = studentResults.map(r => r.wpm).sort((a, b) => b - a);
      const bestStudentWpm = studentWpm.length > 0 ? studentWpm[0] : 0;

      let globalRank = null;
      if (bestStudentWpm > 0) {
        globalRank = allWpm.findIndex(wpm => wpm <= bestStudentWpm) + 1;
      }

      const totalStudents = new Set(allResults.map(r => r.studentId.toString())).size;
      const globalPercentile = globalRank && totalStudents > 0
        ? Math.round(((totalStudents - globalRank) / totalStudents) * 100 * 10) / 10
        : 0;

      // Get batch rankings
      const student = await Student.findById(studentId).populate('assignedBatches').lean();
      let batchRank = null;
      let batchPercentile = 0;

      if (student && student.assignedBatches && student.assignedBatches.length > 0) {
        const batchId = student.assignedBatches[0]._id;
        const batchResults = await Result.find({
          batchId,
          status: 'completed'
        })
          .select('studentId wpm')
          .lean();

        const batchWpm = batchResults.map(r => r.wpm).sort((a, b) => b - a);
        const batchStudentWpm = batchResults
          .filter(r => r.studentId.toString() === studentId.toString())
          .map(r => r.wpm)
          .sort((a, b) => b - a);

        if (batchStudentWpm.length > 0) {
          const bestBatchWpm = batchStudentWpm[0];
          batchRank = batchWpm.findIndex(wpm => wpm <= bestBatchWpm) + 1;
          const batchTotalStudents = new Set(batchResults.map(r => r.studentId.toString())).size;
          batchPercentile = batchTotalStudents > 0
            ? Math.round(((batchTotalStudents - batchRank) / batchTotalStudents) * 100 * 10) / 10
            : 0;
        }
      }

      // Calculate progress (simplified - would need historical data for accurate calculation)
      const progress = {
        change: 0,
        direction: 'stable',
        period: 'month',
        previousRank: null
      };

      return {
        globalRank: {
          rank: globalRank,
          totalStudents,
          percentile: globalPercentile,
          topPercent: globalPercentile > 0 ? Math.round(100 - globalPercentile) : 0
        },
        batchRank: batchRank ? {
          rank: batchRank,
          totalStudents: new Set(
            (await Result.find({ batchId: student.assignedBatches[0]._id }).select('studentId').lean())
              .map(r => r.studentId.toString())
          ).size,
          percentile: batchPercentile,
          topPercent: batchPercentile > 0 ? Math.round(100 - batchPercentile) : 0,
          batchId: student.assignedBatches[0]._id,
          batchName: student.assignedBatches[0].name
        } : null,
        progress
      };
    } catch (error) {
      logger.error('Error fetching performance rankings', { error: error.message, studentId });
      throw error;
    }
  },

  getPerformanceTrends: async (studentId, options = {}) => {
    try {
      const { limit = 10 } = options;

      const results = await Result.find({
        studentId,
        status: 'completed'
      })
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .limit(limit)
        .lean();

      return results.map((result, index) => ({
        test: `Test ${results.length - index}`,
        testId: result.testId?._id || result.testId,
        testTitle: result.testId?.title,
        wpm: result.wpm,
        accuracy: result.accuracy,
        date: result.submittedAt
      })).reverse();
    } catch (error) {
      logger.error('Error fetching performance trends', { error: error.message, studentId });
      throw error;
    }
  },

  getAchievements: async (studentId) => {
    try {
      const results = await Result.find({ studentId, status: 'completed' })
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .lean();

      const achievements = [];

      // WPM milestones
      const wpmMilestones = [30, 40, 50, 60, 70, 80];
      const bestWpm = Math.max(...results.map(r => r.wpm), 0);
      const reachedMilestone = wpmMilestones.find(m => bestWpm >= m);
      if (reachedMilestone) {
        const milestoneResult = results.find(r => r.wpm >= reachedMilestone);
        if (milestoneResult) {
          achievements.push({
            id: `wpm_${reachedMilestone}`,
            type: 'wpm_milestone',
            title: `Reached ${reachedMilestone} WPM milestone`,
            description: `Achieved ${reachedMilestone} WPM in a test`,
            icon: 'Award',
            color: 'text-yellow-500',
            achievedAt: milestoneResult.submittedAt,
            timeAgo: formatTimeAgo(milestoneResult.submittedAt),
            metadata: {
              wpm: milestoneResult.wpm,
              testId: milestoneResult.testId?._id || milestoneResult.testId
            }
          });
        }
      }

      // Test count milestones
      const testCount = results.length;
      const testMilestones = [5, 10, 20, 50, 100];
      const reachedTestMilestone = testMilestones.find(m => testCount >= m);
      if (reachedTestMilestone) {
        const milestoneResult = results[testCount - 1];
        achievements.push({
          id: `test_${reachedTestMilestone}`,
          type: 'test_count',
          title: `Completed ${reachedTestMilestone} tests`,
          description: `Completed ${reachedTestMilestone} tests successfully`,
          icon: 'Medal',
          color: 'text-blue-500',
          achievedAt: milestoneResult.submittedAt,
          timeAgo: formatTimeAgo(milestoneResult.submittedAt),
          metadata: {
            testCount: reachedTestMilestone
          }
        });
      }

      // Perfect accuracy
      const perfectResult = results.find(r => r.accuracy === 100);
      if (perfectResult) {
        achievements.push({
          id: 'perfect_accuracy',
          type: 'perfect_accuracy',
          title: 'Perfect accuracy (100%) achieved',
          description: 'Achieved 100% accuracy in a test',
          icon: 'Target',
          color: 'text-green-500',
          achievedAt: perfectResult.submittedAt,
          timeAgo: formatTimeAgo(perfectResult.submittedAt),
          metadata: {
            accuracy: 100,
            testId: perfectResult.testId?._id || perfectResult.testId
          }
        });
      }

      // Streak (simplified - would need more complex logic)
      const { start: todayStart } = studentService.getUtcDayRange();
      let streakDays = 0;
      let currentDate = new Date(todayStart);
      for (let i = 0; i < 30; i++) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const hasTest = results.some(r => {
          const submitted = new Date(r.submittedAt);
          return submitted >= dayStart && submitted < dayEnd;
        });

        if (hasTest) {
          streakDays++;
        } else {
          break;
        }
        currentDate.setDate(currentDate.getDate() - 1);
      }

      if (streakDays >= 5) {
        achievements.push({
          id: 'streak',
          type: 'streak',
          title: `${streakDays}-day practice streak`,
          description: `Completed tests for ${streakDays} consecutive days`,
          icon: 'Activity',
          color: 'text-orange-500',
          achievedAt: new Date(),
          timeAgo: 'Active now',
          metadata: {
            streakDays,
            isActive: true
          }
        });
      }

      return achievements.sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt));
    } catch (error) {
      logger.error('Error fetching achievements', { error: error.message, studentId });
      throw error;
    }
  },

  getFullActivityLog: async (studentId, options = {}) => {
    try {
      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        type
      } = options;

      const query = { studentId };
      
      if (startDate || endDate) {
        query.submittedAt = {};
        if (startDate) query.submittedAt.$gte = new Date(startDate);
        if (endDate) query.submittedAt.$lte = new Date(endDate);
      }

      if (type && type !== 'all') {
        // This would need to be mapped to actual activity types
      }

      // Similar to getRecentActivity but with pagination
      const skip = (page - 1) * limit;
      const results = await Result.find({ ...query, status: 'completed' })
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const activities = results.map(result => ({
        id: `result_${result._id}`,
        type: 'test_completed',
        text: 'Completed Test',
        detail: `${result.testId?.title || 'Test'} - ${result.wpm} WPM, ${result.accuracy}% Accuracy`,
        timestamp: result.submittedAt,
        time: formatTimeAgo(result.submittedAt),
        icon: 'CheckCircle',
        color: 'text-green-500',
        metadata: {
          testId: result.testId?._id || result.testId,
          testTitle: result.testId?.title,
          wpm: result.wpm,
          accuracy: result.accuracy,
          resultId: result._id
        }
      }));

      const total = await Result.countDocuments({ studentId, status: 'completed' });

      return {
        activities,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      logger.error('Error fetching full activity log', { error: error.message, studentId });
      throw error;
    }
  },

  exportActivityLog: async (studentId, options = {}) => {
    try {
      const { format = 'json', startDate, endDate, type } = options;
      
      // For now, return JSON format. CSV/Excel/PDF can be added later with appropriate libraries
      const result = await studentService.getFullActivityLog(studentId, {
        page: 1,
        limit: 10000, // Large limit for export
        startDate,
        endDate,
        type
      });

      if (format === 'json') {
        return {
          format: 'json',
          data: result.activities,
          metadata: {
            totalItems: result.pagination.totalItems,
            exportedAt: new Date().toISOString()
          }
        };
      }

      // TODO: Implement CSV/Excel/PDF export
      // For now, return JSON for all formats
      return {
        format,
        data: result.activities,
        metadata: {
          totalItems: result.pagination.totalItems,
          exportedAt: new Date().toISOString(),
          note: `${format.toUpperCase()} export not yet implemented, returning JSON`
        }
      };
    } catch (error) {
      logger.error('Error exporting activity log', { error: error.message, studentId });
      throw error;
    }
  }
};

// Helper function to format time ago
function formatTimeAgo(date) {
  if (!date) return 'Unknown';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  return then.toLocaleDateString();
}

export default studentService;
