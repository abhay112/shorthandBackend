import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import TestSession from '../src/models/TestSession.js';

const dbUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/shorthand';

async function run() {
  console.log('Connecting to database:', dbUrl);
  await mongoose.connect(dbUrl);
  console.log('Fetching test sessions...');
  const sessions = await TestSession.find({}).sort({ updatedAt: -1 }).limit(10).lean();
  console.log('Sessions count:', sessions.length);
  for (const s of sessions) {
    console.log({
      id: s._id,
      sessionId: s.sessionId,
      studentId: s.studentId,
      testId: s.testId,
      status: s.status,
      currentAttempt: s.currentAttempt,
      timeStarted: s.timeStarted,
      timeExpires: s.timeExpires,
      sessionData: s.sessionData,
      updatedAt: s.updatedAt
    });
  }
  await mongoose.disconnect();
}

run().catch(console.error);
