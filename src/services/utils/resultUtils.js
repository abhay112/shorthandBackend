import mongoose from 'mongoose';
import Student from '../../models/Student.js';
import Test from '../../models/Test.js';
import Result from '../../models/Result.js';
import StudentRanking from '../../models/StudentRanking.js';
import { createError } from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

export const attachResultToStudent = async (studentId, resultId) => {
  if (!studentId || !resultId) {
    return;
  }

  try {
    await Student.findByIdAndUpdate(
      studentId,
      { $addToSet: { results: resultId } },
      { new: false }
    );
  } catch (error) {
    logger.error('Error attaching result to student', { error: error.message, studentId, resultId });
    throw error;
  }
};

export const recomputeTestStatistics = async (testId) => {
  if (!testId) return;

  try {
    const [stats] = await Result.aggregate([
      {
        $match: {
          testId: new mongoose.Types.ObjectId(testId),
          status: 'completed',
          isValid: true
        }
      },
      {
        $group: {
          _id: '$testId',
          totalAttempts: { $sum: 1 },
          avgWpm: { $avg: '$wpm' },
          avgAccuracy: { $avg: '$accuracy' }
        }
      }
    ]);

    const update = stats
      ? {
          'statistics.totalAttempts': stats.totalAttempts,
          'statistics.averageWpm': Math.round(stats.avgWpm * 100) / 100,
          'statistics.averageAccuracy': Math.round(stats.avgAccuracy * 100) / 100,
          'statistics.completionRate': 100
        }
      : {
          'statistics.totalAttempts': 0,
          'statistics.averageWpm': 0,
          'statistics.averageAccuracy': 0,
          'statistics.completionRate': 0
        };

    await Test.findByIdAndUpdate(
      testId,
      {
        $set: {
          ...update,
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    logger.error('Error recomputing test statistics', { error: error.message, testId });
    throw error;
  }
};

export const calculateAndSaveRanking = async (studentId, batchId, testId, result) => {
  try {
    const allResults = await Result.find({
      batchId,
      testId,
      status: 'completed'
    }).sort({ wpm: -1, accuracy: -1 });

    const totalStudents = allResults.length;
    const studentResult = allResults.find((r) => r.studentId.toString() === studentId.toString());

    if (!studentResult) {
      throw createError('Student result not found for ranking', 404);
    }

    const rank = allResults.findIndex((r) => r._id.toString() === studentResult._id.toString()) + 1;
    const percentile = Math.round(((totalStudents - rank + 1) / totalStudents) * 100);

    const previousRanking = await StudentRanking.findOne({
      studentId,
      batchId,
      testId
    });

    const previousRank = previousRanking ? previousRanking.rank : null;
    const rankChange = previousRank ? previousRank - rank : 0;

    await StudentRanking.findOneAndUpdate(
      { studentId, batchId, testId },
      {
        studentId,
        batchId,
        testId,
        rank,
        percentile,
        wpm: result.wpm,
        accuracy: result.accuracy,
        speed: result.speed,
        totalStudents,
        totalAttempts: allResults.length,
        previousRank,
        rankChange,
        testDate: result.submittedAt
      },
      { upsert: true, new: true }
    );

    result.rank = rank;
    result.percentile = percentile;
    await result.save();

    logger.info('Ranking calculated and saved', {
      studentId,
      batchId,
      testId,
      rank,
      percentile
    });
  } catch (error) {
    logger.error('Error calculating ranking', { error: error.message, studentId, batchId, testId });
    throw error;
  }
};

export const processResultSideEffects = async ({ studentId, batchId, testId, result }) => {
  try {
    await attachResultToStudent(studentId, result._id);
    await recomputeTestStatistics(testId);
    await calculateAndSaveRanking(studentId, batchId, testId, result);
  } catch (error) {
    logger.error('Error processing result side effects', {
      error: error.message,
      studentId,
      batchId,
      testId,
      resultId: result?._id
    });
    throw error;
  }
};


