import mongoose from 'mongoose';
import { dbConnection } from '../src/config/index.js';
import TestSession from '../src/models/TestSession.js';

async function run() {
  try {
    await mongoose.connect(dbConnection.url, dbConnection.options);
    console.log('Connected to DB');

    const sessions = await TestSession.find({ testId: '6a0b248ca1389f6bbecaf950' }).lean();
    console.log('Sessions found:', JSON.stringify(sessions, null, 2));

    const Result = mongoose.model('Result', new mongoose.Schema({}, { strict: false }));
    const results = await Result.find({ testId: '6a0b248ca1389f6bbecaf950' }).lean();
    console.log('Results found:', JSON.stringify(results, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
