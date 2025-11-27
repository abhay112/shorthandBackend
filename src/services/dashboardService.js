import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Test from '../models/Test.js';
import Result from '../models/Result.js';
import TestSession from '../models/TestSession.js';
import Shift from '../models/Shift.js';
import StudentRanking from '../models/StudentRanking.js';
import logger from '../utils/logger.js';

// Helper function to generate avatar initials
const getAvatarInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Helper function to format time ago
const getTimeAgo = (date) => {
  if (!date) return 'Unknown';
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
};

// Helper function to format date
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

// Helper function to get period date range
const getPeriodDateRange = (period) => {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = null;
  }
  
  return { startDate, endDate: now };
};

// Helper function to get period start date
const getPeriodStart = (period) => {
  const now = new Date();
  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return weekAgo;
  } else if (period === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return monthAgo;
  } else {
    return new Date(0); // Beginning of time
  }
};

const dashboardService = {
  fetchDashboardStats: async (options = {}) => {
    try {
      const {
        period,
        topPerformersLimit = 10,
        pendingApprovalsLimit = 50,
        testResultsLimit = 10
      } = options;

      const periodRange = getPeriodDateRange(period);

      // 1. Overview Statistics
      const [
        totalStudents,
        approvedStudents,
        blockedStudents,
        pendingApprovalCount,
        totalBatches,
        activeBatches,
        totalTests,
        activeTests
      ] = await Promise.all([
        Student.countDocuments(),
        Student.countDocuments({ isApproved: true, isBlocked: false }),
        Student.countDocuments({ isBlocked: true }),
        Student.countDocuments({ isApproved: false, isBlocked: false }),
        Batch.countDocuments(),
        Batch.countDocuments({ isActive: true }),
        Test.countDocuments(),
        Test.countDocuments({ isActive: true, isPublished: true })
      ]);

      // 2. Online/Offline Students
      const onlineStudents = await Student.countDocuments({ isOnlineMode: true });
      const offlineStudents = totalStudents - onlineStudents;

      // 3. Shifts Data
      const shifts = await Shift.find().populate('students');
      const shiftCounts = shifts.map(shift => ({
        name: shift.name || 'Unnamed Shift',
        count: (shift.students || []).length
      }));

      // 4. Test Performance
      const tests = await Test.find({ isActive: true, isPublished: true });
      const testPerformance = await Promise.all(
        tests.map(async (test) => {
          const results = await Result.find({ 
            testId: test._id,
            status: 'completed',
            isValid: true
          });
          
          if (results.length === 0) {
            return {
              testTitle: test.title,
              averageWPM: 0,
              averageAccuracy: 0
            };
          }
          
          const totalWPM = results.reduce((sum, r) => sum + (r.wpm || 0), 0);
          const totalAccuracy = results.reduce((sum, r) => sum + (r.accuracy || 0), 0);
          
          return {
            testTitle: test.title,
            averageWPM: Math.round((totalWPM / results.length) * 100) / 100,
            averageAccuracy: Math.round((totalAccuracy / results.length) * 100) / 100
          };
        })
      );
      const filteredTestPerformance = testPerformance.filter(t => t !== null && t.averageWPM > 0);

      // 5. Recent Activity
      const recentResults = await Result.find({ status: 'completed' })
        .populate('studentId', 'name email')
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .limit(20)
        .lean();

      const recentSessions = await TestSession.find({
        status: { $in: ['in_progress', 'not_started'] }
      })
        .populate('studentId', 'name email')
        .populate('testId', 'title')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const recentStudents = await Student.find({ isApproved: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const recentActivity = [];
      
      // Add completed test results
      recentResults.slice(0, 10).forEach((result) => {
        if (result.studentId && result.testId) {
          recentActivity.push({
            id: `result_${result._id}`,
            type: 'test_completed',
            activity: 'Completed test',
            student: {
              id: result.studentId._id?.toString() || result.studentId.toString(),
              name: result.studentId.name || 'Unknown',
              email: result.studentId.email || '',
              avatar: getAvatarInitials(result.studentId.name)
            },
            test: {
              id: result.testId._id?.toString() || result.testId.toString(),
              title: result.testId.title || 'Unknown Test'
            },
            status: 'Completed',
            time: getTimeAgo(result.submittedAt),
            timestamp: result.submittedAt || result.createdAt,
            icon: 'CheckCircle',
            iconColor: 'text-green-600'
          });
        }
      });

      // Add in-progress sessions
      recentSessions.filter(s => s.status === 'in_progress').slice(0, 5).forEach((session) => {
        if (session.studentId && session.testId) {
          recentActivity.push({
            id: `session_${session._id}`,
            type: 'test_started',
            activity: 'Started test',
            student: {
              id: session.studentId._id?.toString() || session.studentId.toString(),
              name: session.studentId.name || 'Unknown',
              email: session.studentId.email || '',
              avatar: getAvatarInitials(session.studentId.name)
            },
            test: {
              id: session.testId._id?.toString() || session.testId.toString(),
              title: session.testId.title || 'Unknown Test'
            },
            status: 'In Progress',
            time: getTimeAgo(session.timeStarted || session.createdAt),
            timestamp: session.timeStarted || session.createdAt,
            icon: 'Clock',
            iconColor: 'text-blue-600'
          });
        }
      });

      // Add student registrations
      recentStudents.forEach((student) => {
        recentActivity.push({
          id: `student_${student._id}`,
          type: 'student_registered',
          activity: 'Registered',
          student: {
            id: student._id.toString(),
            name: student.name || 'Unknown',
            email: student.email || '',
            avatar: getAvatarInitials(student.name)
          },
          status: 'Pending',
          time: getTimeAgo(student.createdAt),
          timestamp: student.createdAt,
          icon: 'UserPlus',
          iconColor: 'text-purple-600'
        });
      });

      // Sort by timestamp (most recent first) and limit
      recentActivity.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      // 6. Pending Approvals
      const pendingStudents = await Student.find({
        isApproved: false,
        isBlocked: false
      })
        .sort({ createdAt: -1 })
        .limit(pendingApprovalsLimit)
        .lean();

      const pendingApprovals = pendingStudents.map(student => ({
        id: student._id.toString(),
        _id: student._id.toString(),
        name: student.name || 'Unknown',
        email: student.email || '',
        avatar: getAvatarInitials(student.name),
        date: student.createdAt ? formatDate(student.createdAt) : '',
        createdAt: student.createdAt
      }));

      // 7. Test Results (Recent)
      const testResults = await Result.find({
        status: 'completed'
      })
        .populate('studentId', 'name email')
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .limit(testResultsLimit)
        .lean();

      const formattedTestResults = testResults.map(result => ({
        id: result._id.toString(),
        _id: result._id.toString(),
        resultId: result._id.toString(),
        test: {
          id: result.testId?._id?.toString() || '',
          title: result.testId?.title || 'Unknown Test'
        },
        student: {
          id: result.studentId?._id?.toString() || '',
          name: result.studentId?.name || 'Unknown',
          email: result.studentId?.email || ''
        },
        wpm: result.wpm || 0,
        accuracy: result.accuracy || 0,
        date: result.submittedAt || result.createdAt
      }));

      // 8. Top Performers
      let topPerformersQuery = StudentRanking.find();
      
      if (periodRange.startDate) {
        topPerformersQuery = topPerformersQuery.where('testDate').gte(periodRange.startDate);
      }
      
      const topRankings = await topPerformersQuery
        .populate('studentId', 'name email')
        .populate('batchId', 'name')
        .sort({ wpm: -1, accuracy: -1 })
        .limit(100);

      // Aggregate by student to get best performance
      const studentPerformanceMap = new Map();
      
      topRankings.forEach(ranking => {
        const studentId = ranking.studentId?._id?.toString();
        if (!studentId) return;
        
        if (!studentPerformanceMap.has(studentId)) {
          studentPerformanceMap.set(studentId, {
            studentId: ranking.studentId,
            batchId: ranking.batchId,
            wpm: ranking.wpm,
            accuracy: ranking.accuracy,
            tests: 1,
            rank: ranking.rank
          });
        } else {
          const existing = studentPerformanceMap.get(studentId);
          // Use best WPM
          if (ranking.wpm > existing.wpm) {
            existing.wpm = ranking.wpm;
            existing.accuracy = ranking.accuracy;
            existing.rank = ranking.rank;
          }
          existing.tests += 1;
        }
      });

      const topPerformers = Array.from(studentPerformanceMap.values())
        .sort((a, b) => {
          // Sort by WPM first, then accuracy
          if (b.wpm !== a.wpm) return b.wpm - a.wpm;
          return b.accuracy - a.accuracy;
        })
        .slice(0, topPerformersLimit)
        .map((perf, index) => ({
          id: `performer_${perf.studentId._id}`,
          _id: `performer_${perf.studentId._id}`,
          rank: index + 1,
          student: {
            id: perf.studentId._id.toString(),
            name: perf.studentId.name || 'Unknown',
            email: perf.studentId.email || '',
            avatar: getAvatarInitials(perf.studentId.name)
          },
          batch: {
            id: perf.batchId?._id?.toString() || '',
            name: perf.batchId?.name || 'Unknown Batch'
          },
          wpm: Math.round(perf.wpm * 100) / 100,
          accuracy: Math.round(perf.accuracy * 100) / 100,
          tests: perf.tests,
          color: index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-gray-500',
          period: period || 'all'
        }));

      // 9. Performance Metrics
      const allResults = await Result.find({ status: 'completed' }).lean();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - 1);

      const testsCompletedToday = await Result.countDocuments({
        status: 'completed',
        submittedAt: { $gte: todayStart }
      });

      const testsCompletedThisWeek = await Result.countDocuments({
        status: 'completed',
        submittedAt: { $gte: weekStart }
      });

      const testsCompletedThisMonth = await Result.countDocuments({
        status: 'completed',
        submittedAt: { $gte: monthStart }
      });

      const averageWpmAllStudents = allResults.length > 0
        ? Math.round((allResults.reduce((sum, r) => sum + (r.wpm || 0), 0) / allResults.length) * 10) / 10
        : 0;

      const averageAccuracyAllStudents = allResults.length > 0
        ? Math.round((allResults.reduce((sum, r) => sum + (r.accuracy || 0), 0) / allResults.length) * 10) / 10
        : 0;

      return {
        dashboard: {
          overview: {
            totalStudents,
            approvedStudents,
            pendingApproval: pendingApprovalCount,
            blockedStudents,
            totalBatches,
            activeBatches,
            totalTests,
            activeTests
          },
          onlineStudents,
          offlineStudents,
          shifts: shiftCounts,
          testPerformance: filteredTestPerformance,
          recentActivity: recentActivity.slice(0, 20),
          pendingApprovals,
          testResults: formattedTestResults,
          topPerformers,
          performanceMetrics: {
            averageWpmAllStudents,
            averageAccuracyAllStudents,
            testsCompletedToday,
            testsCompletedThisWeek,
            testsCompletedThisMonth
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats', { error: error.message });
      throw error;
    }
  }
};

export default dashboardService;
