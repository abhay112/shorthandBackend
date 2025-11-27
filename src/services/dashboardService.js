import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Test from '../models/Test.js';
<<<<<<< Updated upstream
import Batch from '../models/Batch.js';
import TestSession from '../models/TestSession.js';
import logger from '../utils/logger.js';

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

// Helper function to format date
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Helper function to generate avatar initials
function getAvatarInitials(name) {
=======
import Result from '../models/Result.js';
import TestSession from '../models/TestSession.js';
import Shift from '../models/Shift.js';
import StudentRanking from '../models/StudentRanking.js';
import mongoose from 'mongoose';

// Helper function to generate avatar initials
const getAvatarInitials = (name) => {
>>>>>>> Stashed changes
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
<<<<<<< Updated upstream
}

const dashboardService = {
  fetchDashboardStats: async (options = {}) => {
    try {
      const {
        period = 'week',
        limit = 8,
        topPerformersLimit = 5,
        pendingApprovalsLimit = 4,
        testResultsLimit = 4
      } = options;

      // Overview Statistics
      const [
        totalStudents,
        approvedStudents,
        pendingApproval,
        blockedStudents,
        totalBatches,
        activeBatches,
        totalTests,
        activeTests
      ] = await Promise.all([
        Student.countDocuments(),
        Student.countDocuments({ isApproved: true, isBlocked: false }),
        Student.countDocuments({ isApproved: false, isBlocked: false }),
        Student.countDocuments({ isBlocked: true }),
        Batch.countDocuments(),
        Batch.countDocuments({ isActive: true }),
        Test.countDocuments(),
        Test.countDocuments({ isActive: true, isPublished: true })
      ]);

      // Online/Offline Students (based on recent activity - last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentlyActiveStudents = await Student.countDocuments({
        lastLogin: { $gte: thirtyMinutesAgo }
      });
      const onlineStudents = recentlyActiveStudents;
      const offlineStudents = totalStudents - onlineStudents;

      // Shifts Distribution
      const shifts = await Shift.find().populate('students', 'name');
      const shiftCounts = shifts.map(shift => ({
        name: shift.name,
        count: (shift.students || []).length,
      }));

      // Test Performance (only active tests with completed attempts)
      const activeTestsList = await Test.find({ isActive: true, isPublished: true }).lean();
      const testPerformance = await Promise.all(
        activeTestsList.map(async (test) => {
          const results = await Result.find({ testId: test._id, status: 'completed' });
          if (results.length === 0) {
            return null; // Don't include tests with no completions
          }
          const totalWPM = results.reduce((sum, r) => sum + r.wpm, 0);
          const totalAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0);
=======
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

// Helper function to get activity icon and color
const getActivityIcon = (type, status) => {
  if (type === 'test_completed' || status === 'Completed') {
    return { icon: 'CheckCircle', color: 'text-green-600' };
  }
  if (type === 'test_started' || status === 'In Progress') {
    return { icon: 'Clock', color: 'text-blue-600' };
  }
  if (type === 'student_registered') {
    return { icon: 'UserPlus', color: 'text-purple-600' };
  }
  if (status === 'Failed' || status === 'Abandoned') {
    return { icon: 'XCircle', color: 'text-red-600' };
  }
  return { icon: 'Activity', color: 'text-gray-600' };
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

const dashboardService = {
  fetchDashboardStats: async (options = {}) => {
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
>>>>>>> Stashed changes
          return {
            testTitle: test.title,
            averageWPM: Math.round((totalWPM / results.length) * 10) / 10,
            averageAccuracy: Math.round((totalAccuracy / results.length) * 10) / 10
          };
        })
      );
      const filteredTestPerformance = testPerformance.filter(t => t !== null);

      // Recent Activity
      const recentResults = await Result.find({ status: 'completed' })
        .populate('studentId', 'name email')
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .limit(limit)
        .lean();

      const recentSessions = await TestSession.find({
        status: { $in: ['in_progress', 'not_started'] }
      })
        .populate('studentId', 'name email')
        .populate('testId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const activities = [];

      // Add completed test activities
      recentResults.forEach((result) => {
        if (result.studentId && result.testId) {
          activities.push({
            id: `result_${result._id}`,
            type: 'test_completed',
            activity: 'Test Completed',
            student: {
              id: result.studentId._id || result.studentId,
              name: result.studentId.name || 'Unknown',
              email: result.studentId.email || '',
              avatar: getAvatarInitials(result.studentId.name)
            },
            test: {
              id: result.testId._id || result.testId,
              title: result.testId.title || 'Unknown Test'
            },
            status: 'Completed',
            timestamp: result.submittedAt,
            time: formatTimeAgo(result.submittedAt),
            icon: 'CheckCircle',
            iconColor: 'text-green-600',
            metadata: {
              wpm: result.wpm,
              accuracy: result.accuracy,
              resultId: result._id
            }
          });
        }
      });

      // Add in-progress test activities
      recentSessions.forEach((session) => {
        if (session.studentId && session.testId) {
          activities.push({
            id: `session_${session._id}`,
            type: 'test_in_progress',
            activity: 'Test In Progress',
            student: {
              id: session.studentId._id || session.studentId,
              name: session.studentId.name || 'Unknown',
              email: session.studentId.email || '',
              avatar: getAvatarInitials(session.studentId.name)
            },
            test: {
              id: session.testId._id || session.testId,
              title: session.testId.title || 'Unknown Test'
            },
            status: 'In Progress',
            timestamp: session.createdAt,
            time: formatTimeAgo(session.createdAt),
            icon: 'Clock',
            iconColor: 'text-yellow-600',
            metadata: {
              sessionId: session.sessionId,
              startedAt: session.timeStarted || session.createdAt
            }
          });
        }
      });

      // Sort activities by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const recentActivity = activities.slice(0, limit);

      // Pending Approvals
      const pendingStudents = await Student.find({
        isApproved: false,
        isBlocked: false
      })
        .sort({ createdAt: 1 })
        .limit(pendingApprovalsLimit)
        .lean();

      const pendingApprovals = pendingStudents.map(student => ({
        id: student._id,
        _id: student._id,
        name: student.name || 'Unknown',
        email: student.email || '',
        avatar: getAvatarInitials(student.name),
        createdAt: student.createdAt,
        date: formatDate(student.createdAt),
        requestedAt: student.createdAt
      }));

      // Test Results Awaiting Review (recent completed results)
      const recentTestResults = await Result.find({ status: 'completed' })
        .populate('testId', 'title')
        .populate('studentId', 'name email')
        .sort({ submittedAt: -1 })
        .limit(testResultsLimit)
        .lean();

      const testResults = recentTestResults.map(result => ({
        id: result._id,
        _id: result._id,
        test: result.testId ? {
          id: result.testId._id || result.testId,
          title: result.testId.title || 'Unknown Test'
        } : {
          id: null,
          title: 'Deleted Test'
        },
        student: result.studentId ? {
          id: result.studentId._id || result.studentId,
          name: result.studentId.name || 'Unknown',
          email: result.studentId.email || ''
        } : {
          id: null,
          name: 'Unknown',
          email: ''
        },
        wpm: result.wpm,
        accuracy: result.accuracy,
        completedAt: result.submittedAt,
        date: formatDate(result.submittedAt),
        status: 'awaiting_review',
        resultId: result._id
      }));

      // Top Performers
      const periodStart = getPeriodStart(period);
      const periodResults = await Result.find({
        status: 'completed',
        submittedAt: { $gte: periodStart }
      })
        .populate('studentId', 'name email')
        .populate('batchId', 'name')
        .lean();

      // Group by student and calculate stats
      const studentStats = {};
      periodResults.forEach(result => {
        if (!result.studentId) return;
        const studentId = result.studentId._id || result.studentId;
        if (!studentStats[studentId]) {
          studentStats[studentId] = {
            student: result.studentId,
            batch: result.batchId,
            wpm: [],
            accuracy: [],
            testCount: 0
          };
        }
<<<<<<< Updated upstream
        studentStats[studentId].wpm.push(result.wpm);
        studentStats[studentId].accuracy.push(result.accuracy);
        studentStats[studentId].testCount++;
      });

      // Calculate averages and sort
      const topPerformersList = Object.values(studentStats)
        .filter(stat => stat.wpm.length > 0 && stat.accuracy.length > 0)
        .map(stat => ({
          student: stat.student,
          batch: stat.batch,
          bestWpm: Math.max(...stat.wpm),
          avgAccuracy: stat.accuracy.reduce((a, b) => a + b, 0) / stat.accuracy.length,
          tests: stat.testCount
        }))
        .sort((a, b) => {
          // Sort by best WPM first, then by average accuracy
          if (b.bestWpm !== a.bestWpm) return b.bestWpm - a.bestWpm;
          return b.avgAccuracy - a.avgAccuracy;
        })
        .slice(0, topPerformersLimit)
        .map((performer, index) => ({
          id: performer.student._id || performer.student,
          _id: performer.student._id || performer.student,
          rank: index + 1,
          student: {
            id: performer.student._id || performer.student,
            name: performer.student.name || 'Unknown',
            email: performer.student.email || '',
            avatar: getAvatarInitials(performer.student.name)
          },
          batch: performer.batch ? {
            id: performer.batch._id || performer.batch,
            name: performer.batch.name || 'Unknown Batch'
          } : {
            id: null,
            name: 'No Batch'
          },
          wpm: performer.bestWpm,
          accuracy: Math.round(performer.avgAccuracy * 10) / 10,
          tests: performer.tests,
          color: index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-muted-foreground',
          period
        }));

      // Performance Metrics
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
        ? Math.round((allResults.reduce((sum, r) => sum + r.wpm, 0) / allResults.length) * 10) / 10
        : 0;

      const averageAccuracyAllStudents = allResults.length > 0
        ? Math.round((allResults.reduce((sum, r) => sum + r.accuracy, 0) / allResults.length) * 10) / 10
        : 0;

      return {
        overview: {
          totalStudents,
          approvedStudents,
          pendingApproval,
=======
        
        const totalWPM = results.reduce((sum, r) => sum + (r.wpm || 0), 0);
        const totalAccuracy = results.reduce((sum, r) => sum + (r.accuracy || 0), 0);
        
        return {
          testTitle: test.title,
          averageWPM: Math.round((totalWPM / results.length) * 100) / 100,
          averageAccuracy: Math.round((totalAccuracy / results.length) * 100) / 100
        };
      })
    );

    // 5. Recent Activity
    const recentResults = await Result.find()
      .populate('studentId', 'name email')
      .populate('testId', 'title')
      .sort({ submittedAt: -1 })
      .limit(20);

    const recentSessions = await TestSession.find({
      status: { $in: ['in_progress', 'completed'] }
    })
      .populate('studentId', 'name email')
      .populate('testId', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentStudents = await Student.find({ isApproved: false })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivity = [];
    
    // Add completed test results
    recentResults.slice(0, 10).forEach((result) => {
      if (result.studentId && result.testId) {
        recentActivity.push({
          id: `result_${result._id}`,
          type: 'test_completed',
          activity: 'Completed test',
          student: {
            id: result.studentId._id.toString(),
            name: result.studentId.name || 'Unknown',
            email: result.studentId.email || '',
            avatar: getAvatarInitials(result.studentId.name)
          },
          test: {
            id: result.testId._id.toString(),
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
            id: session.studentId._id.toString(),
            name: session.studentId.name || 'Unknown',
            email: session.studentId.email || '',
            avatar: getAvatarInitials(session.studentId.name)
          },
          test: {
            id: session.testId._id.toString(),
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
      .limit(pendingApprovalsLimit);

    const pendingApprovals = pendingStudents.map(student => ({
      id: student._id.toString(),
      _id: student._id.toString(),
      name: student.name || 'Unknown',
      email: student.email || '',
      avatar: getAvatarInitials(student.name),
      date: student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : '',
      createdAt: student.createdAt
    }));

    // 7. Test Results (Recent)
    const testResults = await Result.find({
      status: 'completed'
    })
      .populate('studentId', 'name email')
      .populate('testId', 'title')
      .sort({ submittedAt: -1 })
      .limit(testResultsLimit);

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
      .limit(100); // Get more to aggregate by student

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

    return {
      dashboard: {
        overview: {
          totalStudents,
          approvedStudents,
          pendingApproval: pendingApprovalCount,
>>>>>>> Stashed changes
          blockedStudents,
          totalBatches,
          activeBatches,
          totalTests,
          activeTests
        },
        onlineStudents,
        offlineStudents,
        shifts: shiftCounts,
<<<<<<< Updated upstream
        testPerformance: filteredTestPerformance,
        recentActivity,
        pendingApprovals,
        testResults,
        topPerformers: topPerformersList,
        performanceMetrics: {
          averageWpmAllStudents,
          averageAccuracyAllStudents,
          testsCompletedToday,
          testsCompletedThisWeek,
          testsCompletedThisMonth
        }
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats', { error: error.message });
      throw error;
    }
=======
        testPerformance,
        recentActivity: recentActivity.slice(0, 20),
        pendingApprovals,
        testResults: formattedTestResults,
        topPerformers
      }
    };
>>>>>>> Stashed changes
  }
};

// Helper function to get period start date
function getPeriodStart(period) {
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
    // all_time
    return new Date(0); // Beginning of time
  }
}

export default dashboardService;
