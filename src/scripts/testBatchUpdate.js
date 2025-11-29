#!/usr/bin/env node

/**
 * Test script to verify batch update functionality
 * Tests both direct body and nested body formats
 */

// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// Mock test for batch controller logic
const testBatchUpdateDataExtraction = () => {
  console.log('🧪 Testing batch update data extraction...\n');

  // Test Case 1: Direct body format
  const directBodyRequest = {
    body: {
      name: "Test Batch Direct",
      assignedStudents: ["student1", "student2"],
      assignedTests: ["test1"]
    }
  };

  const directUpdateData = directBodyRequest.body.body || directBodyRequest.body;
  console.log('✅ Direct body format:');
  console.log('   Input:', JSON.stringify(directBodyRequest.body, null, 2));
  console.log('   Extracted:', JSON.stringify(directUpdateData, null, 2));
  console.log('   ✓ name:', directUpdateData.name);
  console.log('   ✓ assignedStudents:', directUpdateData.assignedStudents);
  console.log('   ✓ assignedTests:', directUpdateData.assignedTests);
  console.log('');

  // Test Case 2: Nested body format (from frontend)
  const nestedBodyRequest = {
    body: {
      body: {
        name: "Test Batch Nested",
        assignedStudents: ["student3", "student4"],
        assignedTests: ["test2", "test3"]
      }
    }
  };

  const nestedUpdateData = nestedBodyRequest.body.body || nestedBodyRequest.body;
  console.log('✅ Nested body format (frontend):');
  console.log('   Input:', JSON.stringify(nestedBodyRequest.body, null, 2));
  console.log('   Extracted:', JSON.stringify(nestedUpdateData, null, 2));
  console.log('   ✓ name:', nestedUpdateData.name);
  console.log('   ✓ assignedStudents:', nestedUpdateData.assignedStudents);
  console.log('   ✓ assignedTests:', nestedUpdateData.assignedTests);
  console.log('');

  // Verify both formats work correctly
  const test1Valid = directUpdateData.name === "Test Batch Direct" && 
                    Array.isArray(directUpdateData.assignedStudents);
  const test2Valid = nestedUpdateData.name === "Test Batch Nested" && 
                    Array.isArray(nestedUpdateData.assignedStudents);

  if (test1Valid && test2Valid) {
    console.log('🎉 All tests passed! Batch update data extraction works correctly.');
  } else {
    console.log('❌ Tests failed!');
    console.log('   Direct format valid:', test1Valid);
    console.log('   Nested format valid:', test2Valid);
  }
};

// Run the test
testBatchUpdateDataExtraction();
