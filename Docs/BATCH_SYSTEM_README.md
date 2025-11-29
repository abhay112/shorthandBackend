# Batch System Implementation

## Overview

The Shorthand Typing Test API has been refactored from a shift-based system to a more scalable batch-based system. This document outlines the new architecture and API endpoints.

## System Architecture

### Core Models

1. **Batch Model** (`src/models/Batch.js`)
   - Replaces the old Shift model
   - Supports multiple students and tests
   - Has capacity limits and date ranges
   - Created and managed by admins

2. **Student Model** (Updated)
   - `assignedBatches` array replaces `assignedShifts`
   - Students can be in multiple batches
   - Must be approved by admin before batch assignment

3. **Test Model** (Updated)
   - `assignedBatches` array for batch assignment
   - Tests can be assigned to multiple batches
   - Duration and active status management

4. **Admin Model** (Unchanged)
   - Manages students, batches, and tests
   - Approves students and assigns them to batches

### Workflow

1. **Student Registration**: Students register and wait for admin approval
2. **Admin Approval**: Admin approves verified students
3. **Batch Creation**: Admin creates batches with capacity limits
4. **Student Assignment**: Admin assigns approved students to batches
5. **Test Creation**: Admin creates tests
6. **Test Assignment**: Admin assigns tests to batches
7. **Student Access**: Students can access tests through their assigned batches

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user profile
- `GET /verify` - Verify token validity
- `POST /verify-email` - Check if email is registered

### Batch Management (`/api/v1/batches`) - Admin Only
- `POST /` - Create new batch
- `GET /` - Get all batches (with pagination)
- `GET /my-batches` - Get batches created by current admin
- `GET /:id` - Get batch by ID
- `PUT /:id` - Update batch
- `DELETE /:id` - Delete batch
- `POST /:id/students` - Assign students to batch
- `DELETE /:id/students` - Remove students from batch
- `POST /:id/tests` - Assign tests to batch
- `DELETE /:id/tests` - Remove tests from batch

### Test Management (`/api/v1/test`) - Admin Only
- `GET /` - Get all tests
- `GET /:id` - Get test by ID
- `POST /` - Create new test (with file upload)
- `PUT /:id` - Update test
- `DELETE /:id` - Delete test
- `POST /:id/assign-batches` - Assign test to batches
- `DELETE /:id/remove-batches` - Remove test from batches

### Admin Operations (`/api/v1/admin`) - Admin Only
- `GET /students` - Get all students
- `GET /students/:id` - Get student by ID
- `POST /students/approve` - Approve/disapprove student
- `POST /assign-batch` - Assign batch to student
- `DELETE /remove-batch` - Remove batch from student
- `POST /block` - Block/unblock student
- `GET /dashboard` - Get dashboard statistics

### Student Operations (`/api/v1/student`) - Student Only
- `GET /my-batches` - Get student's assigned batches
- `GET /my-tests` - Get tests available through batches
- `GET /batch/:batchId/tests` - Get tests for specific batch

## Swagger Documentation

The API is fully documented with Swagger UI available at:
- **URL**: `http://localhost:3000/api-docs`
- **Features**: Interactive API testing, comprehensive documentation, authentication support

## Key Features

### Batch System Benefits
1. **Scalability**: No time-based constraints like shifts
2. **Flexibility**: Students can be in multiple batches
3. **Capacity Management**: Configurable student limits per batch
4. **Date Ranges**: Optional start/end dates for batches
5. **Test Assignment**: Tests can be assigned to multiple batches

### Security Features
1. **Firebase Authentication**: Secure token-based auth
2. **Role-based Access**: Admin/Student role separation
3. **Approval Workflow**: Students must be approved before batch assignment
4. **Capacity Limits**: Prevents batch overcrowding
5. **Input Validation**: Comprehensive request validation

### Error Handling
1. **Consistent Error Format**: Standardized error responses
2. **HTTP Status Codes**: Proper status code usage
3. **Detailed Messages**: Clear error descriptions
4. **Logging**: Comprehensive request/error logging

## Database Schema

### Batch Collection
```javascript
{
  name: String (unique, required),
  description: String,
  createdBy: ObjectId (ref: Admin),
  students: [ObjectId] (ref: Student),
  tests: [ObjectId] (ref: Test),
  isActive: Boolean (default: true),
  maxStudents: Number (default: 50),
  startDate: Date,
  endDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Updated Student Collection
```javascript
{
  // ... existing fields ...
  assignedBatches: [ObjectId] (ref: Batch), // replaces assignedShifts
  // ... rest unchanged ...
}
```

### Updated Test Collection
```javascript
{
  // ... existing fields ...
  assignedBatches: [ObjectId] (ref: Batch), // new field
  isActive: Boolean (default: true), // new field
  duration: Number (default: 300), // new field
  // ... rest unchanged ...
}
```

## Usage Examples

### Creating a Batch
```bash
curl -X POST http://localhost:3000/api/v1/batches \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beginner Typing Course",
    "description": "Introduction to typing skills",
    "maxStudents": 30,
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  }'
```

### Assigning Students to Batch
```bash
curl -X POST http://localhost:3000/api/v1/batches/{batchId}/students \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": ["student1", "student2", "student3"]
  }'
```

### Assigning Tests to Batch
```bash
curl -X POST http://localhost:3000/api/v1/batches/{batchId}/tests \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "testIds": ["test1", "test2"]
  }'
```

## Migration Notes

### From Shift System
- `assignedShifts` → `assignedBatches`
- Shift model removed
- Time-based constraints removed
- More flexible student-test relationships

### Backward Compatibility
- Existing student data needs migration
- Old shift references should be updated
- Test assignments need to be reconfigured

## Testing

Use the Swagger UI at `http://localhost:3000/api-docs` to:
1. Test all API endpoints
2. View request/response schemas
3. Authenticate with Firebase tokens
4. Validate API behavior

## Future Enhancements

1. **Batch Analytics**: Performance metrics per batch
2. **Automated Assignment**: Smart student-batch matching
3. **Batch Templates**: Predefined batch configurations
4. **Progress Tracking**: Student progress within batches
5. **Notification System**: Batch-related notifications
