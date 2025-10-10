#!/usr/bin/env node

/**
 * Data Migration Script: Fix Batch-Student Bidirectional Relationship Consistency
 * 
 * This script fixes the data consistency issues between Batch and Student collections
 * by ensuring bidirectional relationships are properly maintained.
 * 
 * Issues Fixed:
 * 1. Students assigned to batches but missing from student.assignedBatches
 * 2. Students in assignedBatches but not in batch.students
 * 3. Tests assigned to batches but missing from test.assignedBatches
 * 4. Tests in assignedBatches but not in batch.tests
 * 
 * Usage: node src/scripts/fixBatchStudentConsistency.js [--dry-run]
 */

import mongoose from 'mongoose';
import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Test from '../models/Test.js';
import { dbConnection } from '../config/index.js';
import logger from '../utils/logger.js';

const isDryRun = process.argv.includes('--dry-run');

class DataConsistencyFixer {
  constructor() {
    this.stats = {
      batchesProcessed: 0,
      studentsFixed: 0,
      testsFixed: 0,
      inconsistenciesFound: 0,
      errors: 0
    };
  }

  async connect() {
    try {
      await mongoose.connect(dbConnection.url, dbConnection.options);
      logger.info('✅ Connected to MongoDB');
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    logger.info('📡 Disconnected from MongoDB');
  }

  async fixBatchStudentConsistency() {
    logger.info('🔧 Starting batch-student consistency fix...');
    
    const batches = await Batch.find({}).lean();
    logger.info(`📊 Found ${batches.length} batches to process`);

    for (const batch of batches) {
      try {
        await this.processBatch(batch);
        this.stats.batchesProcessed++;
      } catch (error) {
        logger.error(`❌ Error processing batch ${batch._id}:`, error);
        this.stats.errors++;
      }
    }
  }

  async processBatch(batch) {
    const batchId = batch._id;
    const batchStudentIds = (batch.students || []).map(id => id.toString());
    const batchTestIds = (batch.tests || []).map(id => id.toString());

    // Fix student relationships
    if (batchStudentIds.length > 0) {
      await this.fixStudentBatchRelationships(batchId, batchStudentIds);
    }

    // Fix test relationships
    if (batchTestIds.length > 0) {
      await this.fixTestBatchRelationships(batchId, batchTestIds);
    }

    // Check for orphaned references
    await this.checkOrphanedStudentReferences(batchId);
    await this.checkOrphanedTestReferences(batchId);
  }

  async fixStudentBatchRelationships(batchId, batchStudentIds) {
    // Find students who should have this batch in their assignedBatches but don't
    const studentsWithoutBatch = await Student.find({
      _id: { $in: batchStudentIds },
      assignedBatches: { $ne: batchId }
    }).lean();

    if (studentsWithoutBatch.length > 0) {
      const studentIds = studentsWithoutBatch.map(s => s._id);
      logger.info(`🔄 Found ${studentsWithoutBatch.length} students missing batch ${batchId} in their assignedBatches`);
      
      this.stats.inconsistenciesFound += studentsWithoutBatch.length;

      if (!isDryRun) {
        await Student.updateMany(
          { _id: { $in: studentIds } },
          { $addToSet: { assignedBatches: batchId } }
        );
        logger.info(`✅ Fixed ${studentsWithoutBatch.length} student records`);
        this.stats.studentsFixed += studentsWithoutBatch.length;
      } else {
        logger.info(`🔍 [DRY RUN] Would fix ${studentsWithoutBatch.length} student records`);
      }
    }
  }

  async fixTestBatchRelationships(batchId, batchTestIds) {
    // Find tests who should have this batch in their assignedBatches but don't
    const testsWithoutBatch = await Test.find({
      _id: { $in: batchTestIds },
      assignedBatches: { $ne: batchId }
    }).lean();

    if (testsWithoutBatch.length > 0) {
      const testIds = testsWithoutBatch.map(t => t._id);
      logger.info(`🔄 Found ${testsWithoutBatch.length} tests missing batch ${batchId} in their assignedBatches`);
      
      this.stats.inconsistenciesFound += testsWithoutBatch.length;

      if (!isDryRun) {
        await Test.updateMany(
          { _id: { $in: testIds } },
          { $addToSet: { assignedBatches: batchId } }
        );
        logger.info(`✅ Fixed ${testsWithoutBatch.length} test records`);
        this.stats.testsFixed += testsWithoutBatch.length;
      } else {
        logger.info(`🔍 [DRY RUN] Would fix ${testsWithoutBatch.length} test records`);
      }
    }
  }

  async checkOrphanedStudentReferences(batchId) {
    // Find students who have this batch in assignedBatches but the batch doesn't have them
    const studentsWithOrphanedBatch = await Student.find({
      assignedBatches: batchId
    }).lean();

    const batch = await Batch.findById(batchId).lean();
    if (!batch) return;

    const batchStudentIds = (batch.students || []).map(id => id.toString());
    const orphanedStudents = studentsWithOrphanedBatch.filter(
      student => !batchStudentIds.includes(student._id.toString())
    );

    if (orphanedStudents.length > 0) {
      logger.info(`🚨 Found ${orphanedStudents.length} students with orphaned batch reference ${batchId}`);
      this.stats.inconsistenciesFound += orphanedStudents.length;

      if (!isDryRun) {
        await Student.updateMany(
          { _id: { $in: orphanedStudents.map(s => s._id) } },
          { $pull: { assignedBatches: batchId } }
        );
        logger.info(`✅ Cleaned up ${orphanedStudents.length} orphaned student references`);
        this.stats.studentsFixed += orphanedStudents.length;
      } else {
        logger.info(`🔍 [DRY RUN] Would clean up ${orphanedStudents.length} orphaned student references`);
      }
    }
  }

  async checkOrphanedTestReferences(batchId) {
    // Find tests who have this batch in assignedBatches but the batch doesn't have them
    const testsWithOrphanedBatch = await Test.find({
      assignedBatches: batchId
    }).lean();

    const batch = await Batch.findById(batchId).lean();
    if (!batch) return;

    const batchTestIds = (batch.tests || []).map(id => id.toString());
    const orphanedTests = testsWithOrphanedBatch.filter(
      test => !batchTestIds.includes(test._id.toString())
    );

    if (orphanedTests.length > 0) {
      logger.info(`🚨 Found ${orphanedTests.length} tests with orphaned batch reference ${batchId}`);
      this.stats.inconsistenciesFound += orphanedTests.length;

      if (!isDryRun) {
        await Test.updateMany(
          { _id: { $in: orphanedTests.map(t => t._id) } },
          { $pull: { assignedBatches: batchId } }
        );
        logger.info(`✅ Cleaned up ${orphanedTests.length} orphaned test references`);
        this.stats.testsFixed += orphanedTests.length;
      } else {
        logger.info(`🔍 [DRY RUN] Would clean up ${orphanedTests.length} orphaned test references`);
      }
    }
  }

  async generateReport() {
    logger.info('\n📋 === DATA CONSISTENCY FIX REPORT ===');
    logger.info(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE RUN'}`);
    logger.info(`Batches processed: ${this.stats.batchesProcessed}`);
    logger.info(`Inconsistencies found: ${this.stats.inconsistenciesFound}`);
    logger.info(`Students fixed: ${this.stats.studentsFixed}`);
    logger.info(`Tests fixed: ${this.stats.testsFixed}`);
    logger.info(`Errors encountered: ${this.stats.errors}`);
    
    if (this.stats.inconsistenciesFound === 0) {
      logger.info('🎉 No data consistency issues found!');
    } else if (isDryRun) {
      logger.info('🔍 Run without --dry-run flag to apply fixes');
    } else {
      logger.info('✅ Data consistency issues have been fixed!');
    }
    logger.info('=====================================\n');
  }

  async run() {
    try {
      await this.connect();
      
      if (isDryRun) {
        logger.info('🔍 Running in DRY RUN mode - no changes will be made');
      } else {
        logger.info('⚡ Running in LIVE mode - changes will be applied');
      }

      await this.fixBatchStudentConsistency();
      await this.generateReport();
      
    } catch (error) {
      logger.error('💥 Script failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the script
const fixer = new DataConsistencyFixer();
fixer.run().then(() => {
  logger.info('🏁 Script completed successfully');
  process.exit(0);
}).catch((error) => {
  logger.error('💥 Script failed:', error);
  process.exit(1);
});
