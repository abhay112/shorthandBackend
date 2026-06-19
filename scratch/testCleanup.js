import mongoose from 'mongoose';
import { dbConnection } from '../src/config/index.js';
import studentService from '../src/services/studentService.js';
import TestSession from '../src/models/TestSession.js';

async function run() {
  try {
    await mongoose.connect(dbConnection.url, dbConnection.options);
    console.log('Connected to DB');

    const testId = '6a0b248ca1389f6bbecaf950';
    const studentId = '68c6acb61d1e6a2919b50af9'; // From queryTest.js output

    console.log('--- Sessions BEFORE running cleanup/getAttemptUsage ---');
    const sessionsBefore = await TestSession.find({ testId }).lean();
    console.log(`Total sessions: ${sessionsBefore.length}`);
    console.log('Active (in_progress or not_started) sessions:', 
      sessionsBefore.filter(s => ['in_progress', 'not_started'].includes(s.status)).map(s => ({
        id: s._id,
        status: s.status,
        expires: s.timeExpires,
        attempt: s.currentAttempt
      }))
    );

    console.log('\nRunning canStudentTakeTest (which calls getAttemptUsage)...');
    const access = await studentService.canStudentTakeTest(studentId, testId, { consumeAttempt: false });
    console.log('Access result:', access);

    console.log('\n--- Sessions AFTER running cleanup/getAttemptUsage ---');
    const sessionsAfter = await TestSession.find({ testId }).lean();
    console.log(`Total sessions: ${sessionsAfter.length}`);
    console.log('Active (in_progress or not_started) sessions:', 
      sessionsAfter.filter(s => ['in_progress', 'not_started'].includes(s.status)).map(s => ({
        id: s._id,
        status: s.status,
        expires: s.timeExpires,
        attempt: s.currentAttempt
      }))
    );

    console.log('\nExpired sessions:', 
      sessionsAfter.filter(s => s.status === 'expired').map(s => ({
        id: s._id,
        status: s.status,
        expires: s.timeExpires
      }))
    );

    console.log('\nAbandoned sessions:', 
      sessionsAfter.filter(s => s.status === 'abandoned').map(s => ({
        id: s._id,
        status: s.status,
        createdAt: s.createdAt
      }))
    );

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
