import Student from '../models/Student.js';
import Shift from '../models/Shift.js';
import Result from '../models/Result.js';
import Test from '../models/Test.js';

const dashboardService = {
  fetchDashboardStats: async () => {
    const [
      totalStudents,
      approvedStudents,
      blockedStudents,
      onlineStudents,
      offlineStudents
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isApproved: true }),
      Student.countDocuments({ isBlocked: true }),
      Student.countDocuments({ isOnlineMode: true }),
      Student.countDocuments({ isOnlineMode: false })
    ]);

    const shifts = await Shift.find();
    const shiftCounts = await Promise.all(
      shifts.map(async (shift) => {
        const count = await Student.countDocuments({ assignedShifts: shift._id });
        return {
          name: shift.name,
          count
        };
      })
    );

    const tests = await Test.find();
    const testPerformance = await Promise.all(
      tests.map(async (test) => {
        const results = await Result.find({ testId: test._id });
        if (results.length === 0) {
          return {
            testTitle: test.title,
            averageWPM: 0,
            averageAccuracy: 0
          };
        }
        const totalWPM = results.reduce((sum, r) => sum + r.wpm, 0);
        const totalAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0);
        return {
          testTitle: test.title,
          averageWPM: Math.round(totalWPM / results.length),
          averageAccuracy: Math.round(totalAccuracy / results.length)
        };
      })
    );

    return {
      totalStudents,
      approvedStudents,
      blockedStudents,
      onlineStudents,
      offlineStudents,
      shifts: shiftCounts,
      testPerformance
    };
  }
};

export default dashboardService;
