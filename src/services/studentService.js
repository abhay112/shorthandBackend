import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Test from '../models/Test.js';
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

      return student;
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
        const accessCheck = await studentService.canStudentTakeTest(studentId, test._id);
        
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
            status: test.isBlocked ? 'blocked' : 'available'
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

  canStudentTakeTest: async (studentId, testId) => {
    try {
      // Check if student exists and is approved
      const student = await Student.findById(studentId);
      if (!student || !student.isApproved || student.isBlocked) {
        return { canTake: false, reason: 'Student not approved or blocked' };
      }

      // Check if test exists and is active
      const test = await Test.findById(testId);
      if (!test || !test.isActive || !test.isPublished) {
        return { canTake: false, reason: 'Test not available' };
      }

      // Check if test is blocked
      if (test.isBlocked) {
        return { canTake: false, reason: 'Test is currently blocked by admin' };
      }

      // Check if student is assigned to the batch for this test
      const studentBatches = student.assignedBatches.map(b => b.toString());
      
      // Check both assignedDays and assignedBatches for access
      const dayBasedBatches = (test.assignedDays || []).map(day => day.batchId.toString());
      const generalBatches = (test.assignedBatches || []).map(b => b.toString());
      
      // Combine all test batches
      const allTestBatches = [...new Set([...dayBasedBatches, ...generalBatches])];
      
      const hasAccess = studentBatches.some(batchId => allTestBatches.includes(batchId));

      if (!hasAccess) {
        console.log('Access check failed:', {
          studentId,
          testId,
          studentBatches,
          dayBasedBatches,
          generalBatches,
          allTestBatches
        });
        return { canTake: false, reason: 'No access to this test' };
      }

      // Check retake limits
      const existingResults = await Result.find({ studentId, testId });
      const completedAttempts = existingResults.filter(r => r.status === 'completed').length;

      if (completedAttempts >= test.maxRetakes) {
        return { canTake: false, reason: 'Maximum retakes exceeded' };
      }

      return { canTake: true, remainingAttempts: test.maxRetakes - completedAttempts };
    } catch (error) {
      logger.error('Error checking test access', { error: error.message, studentId, testId });
      throw error;
    }
  },

  // Test Session Management
  startTestSession: async (studentId, testId) => {
    try {
      // Validate test access
      const accessCheck = await studentService.canStudentTakeTest(studentId, testId);
      if (!accessCheck.canTake) {
        throw createError(accessCheck.reason, 403);
      }

      // Get student's batch for this test
      const student = await Student.findById(studentId).populate('assignedBatches');
      const test = await Test.findById(testId);

      const studentBatches = student.assignedBatches.map(b => b._id.toString());
      
      // Find the batch assignment - check both assignedDays and assignedBatches
      let testBatch = null;
      
      // First try to find from assignedDays
      if (test.assignedDays && test.assignedDays.length > 0) {
        const dayAssignment = test.assignedDays.find(day =>
          studentBatches.includes(day.batchId.toString())
        );
        if (dayAssignment) {
          testBatch = dayAssignment.batchId;
        }
      }
      
      // If not found, try assignedBatches
      if (!testBatch && test.assignedBatches && test.assignedBatches.length > 0) {
        const batchAssignment = test.assignedBatches.find(batchId =>
          studentBatches.includes(batchId.toString())
        );
        if (batchAssignment) {
          testBatch = batchAssignment;
        }
      }

      if (!testBatch) {
        console.log('No batch found for test session:', {
          studentId,
          testId,
          studentBatches,
          testAssignedDays: test.assignedDays,
          testAssignedBatches: test.assignedBatches
        });
        throw createError('No batch assignment found for this test', 400);
      }

      // Check for existing active session
      const existingSession = await TestSession.findOne({
        studentId,
        testId,
        status: { $in: ['not_started', 'in_progress'] }
      });

      if (existingSession) {
        // Update existing session
        existingSession.status = 'in_progress';
        existingSession.timeStarted = new Date();
        existingSession.timeExpires = new Date(Date.now() + test.duration * 1000);
        await existingSession.save();

        return {
          sessionId: existingSession.sessionId,
          test: {
            id: test._id,
            title: test.title,
            duration: test.duration,
            settings: test.settings
          },
          attemptNumber: existingSession.currentAttempt,
          timeExpires: existingSession.timeExpires
        };
      }

      // Create new session
      const sessionId = uuidv4();
      const timeExpires = new Date(Date.now() + test.duration * 1000);

      const session = await TestSession.create({
        studentId,
        batchId: testBatch,
        testId,
        sessionId,
        currentAttempt: 1,
        totalAttempts: 0,
        status: 'in_progress',
        timeStarted: new Date(),
        timeExpires
      });

      logger.info('Test session started', {
        studentId,
        testId,
        sessionId,
        attemptNumber: 1
      });

      return {
        sessionId: session.sessionId,
        test: {
          id: test._id,
          title: test.title,
          duration: test.duration,
          settings: test.settings
        },
        attemptNumber: 1,
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

      const rankings = await StudentRanking.find(query)
        .populate('testId', 'title difficulty category')
        .populate('batchId', 'name')
        .sort({ testDate: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await StudentRanking.countDocuments(query);

      return {
        rankings,
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
      if (testId) query.testId = testId;

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
  }
};

export default studentService;
