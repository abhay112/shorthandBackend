#!/usr/bin/env node

/**
 * Test Script: Validate Batch-Student Bidirectional Relationships
 * 
 * This script tests the fixed batch-student relationship APIs to ensure
 * bidirectional consistency is maintained.
 * 
 * Usage: node src/scripts/testBatchRelationships.js
 */

import mongoose from 'mongoose';
import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Test from '../models/Test.js';
import Admin from '../models/Admin.js';
import { dbConnection } from '../config/index.js';
import logger from '../utils/logger.js';

class RelationshipTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.createdIds = {
      admin: null,
      students: [],
      tests: [],
      batch: null
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

  async cleanup() {
    logger.info('🧹 Cleaning up test data...');
    
    try {
      if (this.createdIds.batch) {
        await Batch.findByIdAndDelete(this.createdIds.batch);
      }
      
      if (this.createdIds.students.length > 0) {
        await Student.deleteMany({ _id: { $in: this.createdIds.students } });
      }
      
      if (this.createdIds.tests.length > 0) {
        await Test.deleteMany({ _id: { $in: this.createdIds.tests } });
      }
      
      if (this.createdIds.admin) {
        await Admin.findByIdAndDelete(this.createdIds.admin);
      }
      
      logger.info('✅ Test data cleaned up');
    } catch (error) {
      logger.error('❌ Error during cleanup:', error);
    }
  }

  async createTestData() {
    logger.info('📋 Creating test data...');

    // Create test admin
    const admin = new Admin({
      firebaseUid: 'test-admin-uid',
      name: 'Test Admin',
      email: 'test-admin@example.com',
      role: 'admin'
    });
    await admin.save();
    this.createdIds.admin = admin._id;

    // Create test students
    for (let i = 1; i <= 3; i++) {
      const student = new Student({
        firebaseUid: `test-student-${i}-uid`,
        name: `Test Student ${i}`,
        email: `test-student-${i}@example.com`,
        isApproved: true,
        isBlocked: false,
        assignedBatches: []
      });
      await student.save();
      this.createdIds.students.push(student._id);
    }

    // Create test tests
    for (let i = 1; i <= 2; i++) {
      const test = new Test({
        title: `Test ${i}`,
        referenceText: `Reference text for test ${i}`,
        uploadedBy: admin._id,
        isActive: true,
        assignedBatches: []
      });
      await test.save();
      this.createdIds.tests.push(test._id);
    }

    logger.info('✅ Test data created');
  }

  async testBatchCreationWithAssignments() {
    logger.info('🧪 Testing batch creation with student and test assignments...');

    try {
      // Create batch with assigned students and tests
      const batch = new Batch({
        name: 'Test Batch with Assignments',
        description: 'Test batch for relationship validation',
        createdBy: this.createdIds.admin,
        students: this.createdIds.students,
        tests: this.createdIds.tests,
        maxStudents: 50
      });

      // This should trigger the bidirectional relationship logic
      await batch.save();
      this.createdIds.batch = batch._id;

      // Verify students have the batch in their assignedBatches
      const students = await Student.find({ _id: { $in: this.createdIds.students } });
      const studentsWithBatch = students.filter(s => 
        s.assignedBatches.some(batchId => batchId.toString() === batch._id.toString())
      );

      if (studentsWithBatch.length === this.createdIds.students.length) {
        logger.info('✅ All students have batch in assignedBatches');
        this.testResults.passed++;
      } else {
        logger.error(`❌ Only ${studentsWithBatch.length}/${this.createdIds.students.length} students have batch in assignedBatches`);
        this.testResults.failed++;
        this.testResults.errors.push('Batch creation: Student relationships not synced');
      }

      // Verify tests have the batch in their assignedBatches
      const tests = await Test.find({ _id: { $in: this.createdIds.tests } });
      const testsWithBatch = tests.filter(t => 
        t.assignedBatches.some(batchId => batchId.toString() === batch._id.toString())
      );

      if (testsWithBatch.length === this.createdIds.tests.length) {
        logger.info('✅ All tests have batch in assignedBatches');
        this.testResults.passed++;
      } else {
        logger.error(`❌ Only ${testsWithBatch.length}/${this.createdIds.tests.length} tests have batch in assignedBatches`);
        this.testResults.failed++;
        this.testResults.errors.push('Batch creation: Test relationships not synced');
      }

    } catch (error) {
      logger.error('❌ Error in batch creation test:', error);
      this.testResults.failed++;
      this.testResults.errors.push(`Batch creation error: ${error.message}`);
    }
  }

  async testBatchDeletion() {
    logger.info('🧪 Testing batch deletion cleanup...');

    try {
      if (!this.createdIds.batch) {
        throw new Error('No batch to delete');
      }

      // Delete the batch
      await Batch.findByIdAndDelete(this.createdIds.batch);

      // Verify students no longer have the batch in assignedBatches
      const students = await Student.find({ _id: { $in: this.createdIds.students } });
      const studentsWithBatch = students.filter(s => 
        s.assignedBatches.some(batchId => batchId.toString() === this.createdIds.batch.toString())
      );

      if (studentsWithBatch.length === 0) {
        logger.info('✅ All students cleaned up after batch deletion');
        this.testResults.passed++;
      } else {
        logger.error(`❌ ${studentsWithBatch.length} students still have deleted batch in assignedBatches`);
        this.testResults.failed++;
        this.testResults.errors.push('Batch deletion: Student references not cleaned up');
      }

      // Verify tests no longer have the batch in assignedBatches
      const tests = await Test.find({ _id: { $in: this.createdIds.tests } });
      const testsWithBatch = tests.filter(t => 
        t.assignedBatches.some(batchId => batchId.toString() === this.createdIds.batch.toString())
      );

      if (testsWithBatch.length === 0) {
        logger.info('✅ All tests cleaned up after batch deletion');
        this.testResults.passed++;
      } else {
        logger.error(`❌ ${testsWithBatch.length} tests still have deleted batch in assignedBatches`);
        this.testResults.failed++;
        this.testResults.errors.push('Batch deletion: Test references not cleaned up');
      }

      this.createdIds.batch = null; // Mark as deleted

    } catch (error) {
      logger.error('❌ Error in batch deletion test:', error);
      this.testResults.failed++;
      this.testResults.errors.push(`Batch deletion error: ${error.message}`);
    }
  }

  async generateReport() {
    logger.info('\n📋 === RELATIONSHIP TEST REPORT ===');
    logger.info(`Tests passed: ${this.testResults.passed}`);
    logger.info(`Tests failed: ${this.testResults.failed}`);
    
    if (this.testResults.errors.length > 0) {
      logger.info('\n❌ Errors encountered:');
      this.testResults.errors.forEach((error, index) => {
        logger.info(`  ${index + 1}. ${error}`);
      });
    }
    
    if (this.testResults.failed === 0) {
      logger.info('🎉 All relationship tests passed!');
    } else {
      logger.info('⚠️  Some relationship tests failed - check the errors above');
    }
    logger.info('=====================================\n');
  }

  async run() {
    try {
      await this.connect();
      await this.createTestData();
      
      // Note: These tests are for the current implementation
      // The new bidirectional logic is in createBatch service method
      // but needs to be tested with the actual service calls
      logger.info('⚠️  Note: This test uses direct model operations');
      logger.info('   For full testing, use the batch service methods');
      
      await this.testBatchCreationWithAssignments();
      await this.testBatchDeletion();
      await this.generateReport();
      
    } catch (error) {
      logger.error('💥 Test script failed:', error);
    } finally {
      await this.cleanup();
      await this.disconnect();
    }
  }
}

// Run the tests
const tester = new RelationshipTester();
tester.run().then(() => {
  logger.info('🏁 Test script completed');
  process.exit(0);
}).catch((error) => {
  logger.error('💥 Test script failed:', error);
  process.exit(1);
});
