# Model Migration Guide - Prisma Schema Alignment

This document outlines the changes made to MongoDB models to align with the Prisma schema and provides guidance for updating services and controllers.

## Overview

The models have been updated from using embedded arrays to a normalized structure with join tables, matching the Prisma schema design.

## Model Changes Summary

### ✅ Updated Models

1. **Student Model**
   - ✅ Added: `approvedBy`, `approvedAt`, `managedBy` fields
   - ❌ Removed: `assignedBatches` array, `notes`, `settings` (now handled by join tables)

2. **Batch Model**
   - ❌ Removed: `students` and `tests` arrays (now handled by join tables)

3. **Test Model**
   - ❌ Removed: `assignedDays` array, `assignedBatches` array, `closedForBatches`, `rankingsGenerated` arrays
   - ✅ Simplified structure matching Prisma schema

4. **Result Model**
   - ❌ Removed: `shiftId` field (not in Prisma schema)
   - ✅ Changed: `mistakes` and `stenographyErrors` to Mixed/JSON type

5. **TestSession Model**
   - ✅ Changed: `sessionData` and `deviceInfo` to Mixed/JSON type

6. **TestContent Model**
   - ✅ Changed: `audio` to Mixed/JSON type

7. **StudentRanking Model**
   - ✅ Changed: `rankingCriteria` to Mixed/JSON type

8. **Admin Model**
   - ✅ Added collection name and indexes matching Prisma schema

### ✅ New Join Table Models

1. **StudentBatch** (`src/models/StudentBatch.js`)
   - Handles student-batch relationships
   - Fields: `studentId`, `batchId`, `enrolledBy`, `enrolledAt`, `status`, `enrolledUntil`, `notes`
   - Unique constraint: `(studentId, batchId)`

2. **BatchTestAssignment** (`src/models/BatchTestAssignment.js`)
   - Handles batch-test assignments with date/priority
   - Fields: `batchId`, `testId`, `assignedBy`, `assignedDate`, `dayNumber`, `priority`, `status`, `isActive`, `isClosed`, `closedBy`, `closedAt`, `rankingsGenerated`, etc.
   - Unique constraint: `(batchId, testId, assignedDate)`

## Migration Patterns

### Pattern 1: Getting Student Batches

**Old Way (Embedded Array):**
```javascript
const student = await Student.findById(studentId)
  .populate('assignedBatches', 'name startDate endDate');
const batches = student.assignedBatches;
```

**New Way (Join Table):**
```javascript
import StudentBatch from '../models/StudentBatch.js';

const studentBatches = await StudentBatch.find({ 
  studentId: studentId,
  status: 'active' 
})
  .populate('batchId', 'name startDate endDate')
  .populate('enrolledBy', 'name email');
  
const batches = studentBatches.map(sb => sb.batchId);
```

### Pattern 2: Assigning Students to Batch

**Old Way (Embedded Array):**
```javascript
// Update student
await Student.updateOne(
  { _id: studentId },
  { $addToSet: { assignedBatches: batchId } }
);

// Update batch
await Batch.updateOne(
  { _id: batchId },
  { $addToSet: { students: studentId } }
);
```

**New Way (Join Table):**
```javascript
import StudentBatch from '../models/StudentBatch.js';

// Create join table entry
await StudentBatch.create({
  studentId: studentId,
  batchId: batchId,
  enrolledBy: adminId,
  enrolledAt: new Date(),
  status: 'active'
});
```

### Pattern 3: Getting Batch Students

**Old Way (Embedded Array):**
```javascript
const batch = await Batch.findById(batchId)
  .populate('students', 'name email');
const students = batch.students;
```

**New Way (Join Table):**
```javascript
import StudentBatch from '../models/StudentBatch.js';

const studentBatches = await StudentBatch.find({ 
  batchId: batchId,
  status: 'active' 
})
  .populate('studentId', 'name email')
  .populate('enrolledBy', 'name email');

const students = studentBatches.map(sb => sb.studentId);
```

### Pattern 4: Test Assignments to Batches

**Old Way (Embedded Array in Test):**
```javascript
// Check if test is assigned
const test = await Test.findById(testId);
const isAssigned = test.assignedDays.some(ad => 
  ad.batchId.toString() === batchId && 
  ad.assignedDate.toDateString() === date.toDateString()
);
```

**New Way (Join Table):**
```javascript
import BatchTestAssignment from '../models/BatchTestAssignment.js';

const assignment = await BatchTestAssignment.findOne({
  batchId: batchId,
  testId: testId,
  assignedDate: {
    $gte: new Date(date.setHours(0,0,0,0)),
    $lt: new Date(date.setHours(23,59,59,999))
  },
  isActive: true,
  status: 'active'
});
```

### Pattern 5: Getting Tests for a Batch on a Date

**Old Way:**
```javascript
const tests = await Test.find({
  'assignedDays.batchId': batchId,
  'assignedDays.assignedDate': {
    $gte: startOfDay,
    $lt: endOfDay
  }
});
```

**New Way:**
```javascript
import BatchTestAssignment from '../models/BatchTestAssignment.js';

const assignments = await BatchTestAssignment.find({
  batchId: batchId,
  assignedDate: {
    $gte: startOfDay,
    $lt: endOfDay
  },
  isActive: true,
  status: 'active'
})
  .populate('testId')
  .sort({ priority: -1, dayNumber: 1 });

const tests = assignments.map(a => a.testId);
```

## Services That Need Updates

### High Priority

1. **batchService.js**
   - `createBatch()` - Create StudentBatch entries instead of updating arrays
   - `updateBatch()` - Update StudentBatch entries
   - `getBatchById()` - Query StudentBatch join table
   - `getAllBatches()` - Join StudentBatch for student counts
   - `addStudentsToBatch()` - Create StudentBatch entries
   - `removeStudentsFromBatch()` - Update StudentBatch status
   - `getBatchesForStudent()` - Query StudentBatch join table

2. **adminService.js**
   - `updateAssignedBatches()` - Replace with StudentBatch operations
   - Any queries using `student.assignedBatches`

3. **testService.js**
   - `assignTestToBatches()` - Create BatchTestAssignment entries
   - `removeTestFromBatches()` - Update BatchTestAssignment status
   - `updateTest()` - Remove assignedDays/assignedBatches handling
   - Queries checking test assignments

4. **studentService.js**
   - `getProfile()` - Query StudentBatch for batches
   - `getDashboard()` - Query StudentBatch
   - `getStudentBatches()` - Query StudentBatch join table
   - `getCurrentDayTest()` - Query BatchTestAssignment
   - `getUpcomingTests()` - Query BatchTestAssignment
   - Any references to `student.assignedBatches`

5. **adminStudentService.js**
   - Update any batch assignment operations

### Medium Priority

- **rankingService.js** - May reference batch-test relationships
- **resultService.js** - Remove shiftId references if any
- **dashboardService.js** - Update batch queries

## Helper Functions to Create

Consider creating utility functions in `src/services/utils/`:

```javascript
// studentBatchUtils.js
export const getStudentBatches = async (studentId, options = {}) => {
  const { status = 'active', populate = true } = options;
  
  const query = { studentId, status };
  let studentBatches = await StudentBatch.find(query);
  
  if (populate) {
    studentBatches = await StudentBatch.populate(studentBatches, [
      { path: 'batchId', select: 'name startDate endDate description' },
      { path: 'enrolledBy', select: 'name email' }
    ]);
  }
  
  return studentBatches;
};

export const enrollStudentInBatch = async (studentId, batchId, adminId, options = {}) => {
  const { status = 'active', enrolledUntil } = options;
  
  // Check if already enrolled
  const existing = await StudentBatch.findOne({ studentId, batchId });
  if (existing && existing.status === 'active') {
    throw new Error('Student already enrolled in batch');
  }
  
  // Check batch capacity
  const activeCount = await StudentBatch.countDocuments({ 
    batchId, 
    status: 'active' 
  });
  const batch = await Batch.findById(batchId);
  if (activeCount >= batch.maxStudents) {
    throw new Error('Batch capacity exceeded');
  }
  
  if (existing) {
    // Update existing enrollment
    existing.status = status;
    existing.enrolledAt = new Date();
    existing.enrolledBy = adminId;
    if (enrolledUntil) existing.enrolledUntil = enrolledUntil;
    return await existing.save();
  } else {
    // Create new enrollment
    return await StudentBatch.create({
      studentId,
      batchId,
      enrolledBy: adminId,
      status,
      enrolledUntil
    });
  }
};

// batchTestAssignmentUtils.js
export const getBatchTestAssignments = async (batchId, date, options = {}) => {
  const { includeInactive = false } = options;
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const query = {
    batchId,
    assignedDate: { $gte: startOfDay, $lt: endOfDay }
  };
  
  if (!includeInactive) {
    query.isActive = true;
    query.status = 'active';
  }
  
  return await BatchTestAssignment.find(query)
    .populate('testId')
    .populate('assignedBy', 'name email')
    .sort({ priority: -1, dayNumber: 1 });
};
```

## Backward Compatibility

If you need to maintain backward compatibility during migration:

1. Create virtual populate on Student model for `assignedBatches`
2. Create aggregation pipelines that simulate old structure
3. Run migration script to populate join tables from existing arrays

## Testing Checklist

- [ ] Student batch enrollment works
- [ ] Batch student listing works
- [ ] Test assignment to batches works
- [ ] Getting tests for a batch/date works
- [ ] Student dashboard shows correct batches
- [ ] Admin can assign/remove students from batches
- [ ] Batch capacity checks work
- [ ] Test assignment closure works
- [ ] Ranking generation references correct relationships

## Next Steps

1. Create helper utility functions for common join table operations
2. Update batchService.js methods one by one
3. Update studentService.js methods
4. Update testService.js methods
5. Update adminService.js methods
6. Test thoroughly
7. Remove old array-based code
8. Update API documentation

