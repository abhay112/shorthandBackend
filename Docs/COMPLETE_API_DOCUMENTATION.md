# Complete API Documentation for Shorthand Stenography Application

## Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Student APIs](#student-apis)
3. [Admin APIs](#admin-apis)
4. [Batch Management APIs](#batch-management-apis)
5. [Test Management APIs](#test-management-apis)
6. [Response Format](#response-format)
7. [Error Handling](#error-handling)
8. [Authentication](#authentication)

---

## Authentication APIs

### Base URL: `/api/v1/auth`

### 1. Register User
**POST** `/register`

Register a new user (student or admin).

**Request Body:**
```json
{
  "token": "firebase_id_token",
  "role": "student" // optional: "student", "admin", "super_admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "user_id",
    "firebaseUid": "firebase_uid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "student"
  }
}
```

### 2. Login User
**POST** `/login`

Login an existing user.

**Request Body:**
```json
{
  "token": "firebase_id_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "student",
      "isApproved": true,
      "isBlocked": false
    }
  }
}
```

### 3. Logout User
**POST** `/logout`

Logout the current user.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 4. Get Current User Profile
**GET** `/me`

Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "User profile fetched",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "student",
      "isApproved": true,
      "isBlocked": false,
      "assignedBatches": [...],
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 5. Verify Token
**GET** `/verify`

Verify if the current token is valid.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "student"
    }
  }
}
```

### 6. Verify Email
**POST** `/verify-email`

Check if an email is already registered.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verification successful",
  "data": {
    "exists": true
  }
}
```

---

## Student APIs

### Base URL: `/api/v1/students`

**Authentication Required:** All student endpoints require Firebase authentication with student role.

### Profile Management

#### 1. Get Student Profile
**GET** `/profile`

Get student's profile information.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Student profile fetched successfully",
  "data": {
    "profile": {
      "_id": "student_id",
      "name": "Student Name",
      "email": "student@example.com",
      "isApproved": true,
      "isBlocked": false,
      "assignedBatches": [
        {
          "_id": "batch_id",
          "name": "Batch Name",
          "description": "Batch Description",
          "startDate": "2024-01-01T00:00:00.000Z",
          "endDate": "2024-12-31T23:59:59.000Z"
        }
      ],
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 2. Update Student Profile
**PATCH** `/profile`

Update student's profile information.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "name": "Updated Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      "_id": "student_id",
      "name": "Updated Name",
      "email": "student@example.com",
      "isApproved": true,
      "isBlocked": false
    }
  }
}
```

### Dashboard

#### 3. Get Student Dashboard
**GET** `/dashboard`

Get comprehensive dashboard data including current test, statistics, rankings, and upcoming tests.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Student dashboard fetched successfully",
  "data": {
    "dashboard": {
      "student": {
        "id": "student_id",
        "name": "Student Name",
        "email": "student@example.com",
        "isApproved": true,
        "isBlocked": false,
        "assignedBatches": [...]
      },
      "currentTest": {
        "test": {
          "id": "test_id",
          "title": "Test Title",
          "description": "Test Description",
          "difficulty": "intermediate",
          "category": "comprehensive",
          "duration": 300,
          "maxRetakes": 3,
          "settings": {
            "allowPause": true,
            "maxPauses": 3,
            "showTimer": true,
            "showProgress": true,
            "autoSubmit": true
          }
        },
        "canTakeTest": {
          "canTake": true,
          "remainingAttempts": 2
        },
        "assignedBatch": {
          "_id": "batch_id",
          "name": "Batch Name"
        }
      },
      "recentResults": [
        {
          "_id": "result_id",
          "wpm": 45.5,
          "accuracy": 95.2,
          "speed": 42.1,
          "rank": 3,
          "percentile": 85,
          "testId": {
            "title": "Test Title",
            "difficulty": "intermediate",
            "category": "comprehensive"
          },
          "batchId": {
            "name": "Batch Name"
          },
          "submittedAt": "2024-01-01T00:05:00.000Z"
        }
      ],
      "statistics": {
        "totalTests": 15,
        "averageWpm": 45.5,
        "averageAccuracy": 92.3,
        "bestWpm": 65.2,
        "bestAccuracy": 98.1,
        "totalTimeSpent": 4500,
        "improvementTrend": "improving"
      },
      "rankings": [
        {
          "_id": "ranking_id",
          "rank": 3,
          "percentile": 85,
          "wpm": 45.5,
          "accuracy": 95.2,
          "testId": {
            "title": "Test Title"
          },
          "batchId": {
            "name": "Batch Name"
          },
          "testDate": "2024-01-01T00:00:00.000Z"
        }
      ],
      "upcomingTests": [
        {
          "id": "test_id",
          "title": "Upcoming Test",
          "difficulty": "advanced",
          "category": "speed_test",
          "duration": 300,
          "assignedDate": "2024-01-02T00:00:00.000Z",
          "assignedBatch": {
            "_id": "batch_id",
            "name": "Batch Name"
          }
        }
      ]
    }
  }
}
```

#### 4. Get Student Statistics
**GET** `/statistics`

Get detailed performance statistics.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Student statistics fetched successfully",
  "data": {
    "statistics": {
      "totalTests": 15,
      "averageWpm": 45.5,
      "averageAccuracy": 92.3,
      "bestWpm": 65.2,
      "bestAccuracy": 98.1,
      "totalTimeSpent": 4500,
      "improvementTrend": "improving"
    }
  }
}
```

### Test Management

#### 5. Get Current Day Test
**GET** `/tests/current`

Get the current day's test for the student.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Current day test fetched successfully",
  "data": {
    "currentTest": {
      "test": {
        "id": "test_id",
        "title": "Test Title",
        "description": "Test Description",
        "difficulty": "intermediate",
        "category": "comprehensive",
        "duration": 300,
        "maxRetakes": 3,
        "settings": {...}
      },
      "canTakeTest": {
        "canTake": true,
        "remainingAttempts": 2
      },
      "assignedBatch": {...}
    }
  }
}
```

#### 6. Get Upcoming Tests
**GET** `/tests/upcoming`

Get upcoming tests for the next 7 days.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Upcoming tests fetched successfully",
  "data": {
    "upcomingTests": [
      {
        "id": "test_id",
        "title": "Upcoming Test",
        "difficulty": "advanced",
        "category": "speed_test",
        "duration": 300,
        "assignedDate": "2024-01-02T00:00:00.000Z",
        "assignedBatch": {
          "_id": "batch_id",
          "name": "Batch Name"
        }
      }
    ]
  }
}
```

#### 7. Check Test Access
**GET** `/tests/:testId/access`

Check if student can take a specific test.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Test access checked successfully",
  "data": {
    "accessCheck": {
      "canTake": true,
      "remainingAttempts": 2
    }
  }
}
```

### Test Session Management

#### 8. Start Test Session
**POST** `/tests/:testId/start`

Start a new test session.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Test session started successfully",
  "data": {
    "session": {
      "sessionId": "unique_session_id",
      "test": {
        "id": "test_id",
        "title": "Test Title",
        "duration": 300,
        "settings": {...}
      },
      "attemptNumber": 1,
      "timeExpires": "2024-01-01T00:05:00.000Z"
    }
  }
}
```

#### 9. End Test Session
**POST** `/sessions/:sessionId/end`

End a test session and submit results.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "wpm": 45.5,
  "accuracy": 95.2,
  "speed": 42.1,
  "totalWords": 150,
  "correctWords": 143,
  "incorrectWords": 7,
  "totalCharacters": 750,
  "correctCharacters": 715,
  "incorrectCharacters": 35,
  "mistakes": [
    {
      "word": "example",
      "expected": "example",
      "typed": "exampel",
      "position": 25,
      "timestamp": "2024-01-01T00:02:30.000Z"
    }
  ],
  "stenographyErrors": [
    {
      "type": "substitution",
      "original": "l",
      "typed": "k",
      "position": 125,
      "severity": "minor"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test completed successfully",
  "data": {
    "result": {
      "_id": "result_id",
      "wpm": 45.5,
      "accuracy": 95.2,
      "speed": 42.1,
      "rank": 3,
      "percentile": 85,
      "attemptNumber": 1,
      "isRetake": false,
      "timeTaken": 300,
      "submittedAt": "2024-01-01T00:05:00.000Z"
    }
  }
}
```

#### 10. Pause Test Session
**POST** `/sessions/:sessionId/pause`

Pause a test session.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Test session paused"
}
```

#### 11. Resume Test Session
**POST** `/sessions/:sessionId/resume`

Resume a paused test session.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Test session resumed"
}
```

### Results Management

#### 12. Get Student Results
**GET** `/results`

Get student's test results with pagination and filtering.

**Headers:** `Authorization: Bearer <firebase_token>`

**Query Parameters:**
- `batchId` (optional): Filter by batch ID
- `testId` (optional): Filter by test ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `sortBy` (optional): Sort field (default: submittedAt)
- `sortOrder` (optional): Sort order - asc/desc (default: desc)

**Response:**
```json
{
  "success": true,
  "message": "Student results fetched successfully",
  "data": {
    "results": [
      {
        "_id": "result_id",
        "wpm": 45.5,
        "accuracy": 95.2,
        "speed": 42.1,
        "rank": 3,
        "percentile": 85,
        "attemptNumber": 1,
        "isRetake": false,
        "timeTaken": 300,
        "testId": {
          "title": "Test Title",
          "difficulty": "intermediate",
          "category": "comprehensive"
        },
        "batchId": {
          "name": "Batch Name"
        },
        "submittedAt": "2024-01-01T00:05:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 100,
      "limit": 20
    }
  }
}
```

#### 13. Get Student Result by ID
**GET** `/results/:resultId`

Get specific result details.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Result details endpoint - to be implemented"
}
```

### Rankings and Leaderboards

#### 14. Get Student Rankings
**GET** `/rankings`

Get student's rankings across different tests and batches.

**Headers:** `Authorization: Bearer <firebase_token>`

**Query Parameters:**
- `batchId` (optional): Filter by batch ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Rankings per page (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Student rankings fetched successfully",
  "data": {
    "rankings": [
      {
        "_id": "ranking_id",
        "rank": 3,
        "percentile": 85,
        "wpm": 45.5,
        "accuracy": 95.2,
        "speed": 42.1,
        "totalStudents": 25,
        "totalAttempts": 30,
        "previousRank": 5,
        "rankChange": 2,
        "testId": {
          "title": "Test Title",
          "difficulty": "intermediate",
          "category": "comprehensive"
        },
        "batchId": {
          "name": "Batch Name"
        },
        "testDate": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 3,
      "total": 50,
      "limit": 20
    }
  }
}
```

#### 15. Get Batch Leaderboard
**GET** `/batches/:batchId/leaderboard`

Get batch leaderboard.

**Headers:** `Authorization: Bearer <firebase_token>`

**Query Parameters:**
- `testId` (optional): Filter by specific test ID

**Response:**
```json
{
  "success": true,
  "message": "Batch leaderboard fetched successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "percentile": 100,
        "wpm": 65.2,
        "accuracy": 98.1,
        "studentId": {
          "name": "Top Student",
          "email": "top@example.com"
        },
        "testId": {
          "title": "Test Title"
        }
      }
    ]
  }
}
```

### Batch Management

#### 16. Get Student Batches
**GET** `/batches`

Get student's assigned batches.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Student batches fetched successfully",
  "data": {
    "batches": [
      {
        "_id": "batch_id",
        "name": "Batch Name",
        "description": "Batch Description",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-12-31T23:59:59.000Z",
        "isActive": true,
        "maxStudents": 50
      }
    ]
  }
}
```

### Status and Health Check

#### 17. Get Student Status
**GET** `/status`

Get student status and approval information.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Student status checked successfully",
  "data": {
    "status": {
      "isApproved": true,
      "isBlocked": false,
      "status": "approved",
      "assignedBatches": 2,
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Admin APIs

### Base URL: `/api/v1/admin`

**Authentication Required:** All admin endpoints require Firebase authentication with admin role.

### Student Management

#### 1. Get All Students
**GET** `/students`

Get all students with pagination and filtering.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "All students fetched",
  "data": {
    "students": [
      {
        "_id": "student_id",
        "name": "Student Name",
        "email": "student@example.com",
        "isApproved": true,
        "isBlocked": false,
        "assignedBatches": [...],
        "lastLogin": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 25
  }
}
```

#### 2. Get Student by ID
**GET** `/students/:id`

Get a specific student by ID.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Student fetched by ID",
  "data": {
    "student": {
      "_id": "student_id",
      "name": "Student Name",
      "email": "student@example.com",
      "isApproved": true,
      "isBlocked": false,
      "assignedBatches": [...],
      "assignedTests": [...],
      "assignedShifts": [...],
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 3. Update Student
**PUT** `/students/:id`

Update student information.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "isApproved": true,
  "isOnlineMode": true,
  "assignedBatches": ["batch_id_1", "batch_id_2"],
  "assignedTests": ["test_id_1", "test_id_2"],
  "assignedShifts": ["shift_id_1", "shift_id_2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student updated",
  "data": {
    "student": {
      "_id": "student_id",
      "name": "Updated Name",
      "email": "student@example.com",
      "isApproved": true,
      "isOnlineMode": true,
      "assignedBatches": [...],
      "assignedTests": [...],
      "assignedShifts": [...]
    }
  }
}
```

#### 4. Approve/Disapprove Student
**POST** `/students/approve`

Approve or disapprove a student.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "email": "student@example.com",
  "status": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student approved successfully",
  "data": {
    "result": {
      "email": "student@example.com",
      "isApproved": true
    }
  }
}
```

#### 5. Assign Batch to Student
**POST** `/assign-batch`

Assign a batch to a student.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "studentId": "student_id",
  "batchId": "batch_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch assigned successfully",
  "data": {
    "result": {
      "studentId": "student_id",
      "batchId": "batch_id"
    }
  }
}
```

#### 6. Remove Batch from Student
**DELETE** `/remove-batch`

Remove a batch from a student.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "studentId": "student_id",
  "batchId": "batch_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch removed successfully",
  "data": {
    "result": {
      "studentId": "student_id",
      "batchId": "batch_id"
    }
  }
}
```

#### 7. Block/Unblock Student
**POST** `/block`

Block or unblock a student.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "studentId": "student_id",
  "block": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student blocked successfully",
  "data": {
    "result": {
      "studentId": "student_id",
      "isBlocked": true
    }
  }
}
```

### Dashboard

#### 8. Get Dashboard Statistics
**GET** `/dashboard`

Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Dashboard stats fetched",
  "data": {
    "data": {
      "totalStudents": 150,
      "totalBatches": 10,
      "totalTests": 50,
      "activeStudents": 120,
      "pendingApprovals": 5,
      "blockedStudents": 2,
      "recentActivity": [...],
      "performanceMetrics": {...}
    }
  }
}
```

---

## Batch Management APIs

### Base URL: `/api/v1/batches`

**Authentication Required:** All batch endpoints require Firebase authentication with admin role.

#### 1. Create Batch
**POST** `/`

Create a new batch.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "name": "Batch Name",
  "description": "Batch Description",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "maxStudents": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "batch": {
      "_id": "batch_id",
      "name": "Batch Name",
      "description": "Batch Description",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.000Z",
      "maxStudents": 50,
      "isActive": true,
      "createdBy": "admin_id",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 2. Get All Batches
**GET** `/`

Get all batches.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Batches fetched successfully",
  "data": {
    "batches": [
      {
        "_id": "batch_id",
        "name": "Batch Name",
        "description": "Batch Description",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-12-31T23:59:59.000Z",
        "maxStudents": 50,
        "isActive": true,
        "students": [...],
        "tests": [...],
        "createdBy": "admin_id"
      }
    ]
  }
}
```

#### 3. Get My Batches
**GET** `/my-batches`

Get batches created by the current admin.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "My batches fetched successfully",
  "data": {
    "batches": [...]
  }
}
```

#### 4. Get Batch by ID
**GET** `/:id`

Get a specific batch by ID.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Batch fetched successfully",
  "data": {
    "batch": {
      "_id": "batch_id",
      "name": "Batch Name",
      "description": "Batch Description",
      "students": [...],
      "tests": [...],
      "createdBy": "admin_id"
    }
  }
}
```

#### 5. Update Batch
**PUT** `/:id`

Update batch information.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "name": "Updated Batch Name",
  "description": "Updated Description",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "maxStudents": 60,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {
    "batch": {...}
  }
}
```

#### 6. Delete Batch
**DELETE** `/:id`

Delete a batch.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Batch deleted successfully"
}
```

#### 7. Assign Students to Batch
**POST** `/:id/students`

Assign students to a batch.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "studentIds": ["student_id_1", "student_id_2", "student_id_3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Students assigned to batch successfully",
  "data": {
    "batch": {...},
    "assignedStudents": [...]
  }
}
```

#### 8. Remove Students from Batch
**DELETE** `/:id/students`

Remove students from a batch.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "studentIds": ["student_id_1", "student_id_2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Students removed from batch successfully",
  "data": {
    "batch": {...},
    "removedStudents": [...]
  }
}
```

#### 9. Assign Tests to Batch
**POST** `/:id/tests`

Assign tests to a batch.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "testIds": ["test_id_1", "test_id_2", "test_id_3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tests assigned to batch successfully",
  "data": {
    "batch": {...},
    "assignedTests": [...]
  }
}
```

#### 10. Remove Tests from Batch
**DELETE** `/:id/tests`

Remove tests from a batch.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "testIds": ["test_id_1", "test_id_2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tests removed from batch successfully",
  "data": {
    "batch": {...},
    "removedTests": [...]
  }
}
```

---

## Test Management APIs

### Base URL: `/api/v1/test`

**Authentication Required:** All test endpoints require Firebase authentication with admin role.

#### 1. Get All Tests
**GET** `/`

Get all tests.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Tests fetched successfully",
  "data": {
    "tests": [
      {
        "_id": "test_id",
        "title": "Test Title",
        "description": "Test Description",
        "audioURL": "path/to/audio/file",
        "referenceText": "Reference text for typing",
        "difficulty": "intermediate",
        "category": "comprehensive",
        "duration": 300,
        "maxRetakes": 3,
        "isActive": true,
        "isPublished": true,
        "assignedBatches": [...],
        "assignedDays": [...],
        "uploadedBy": "admin_id",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### 2. Get Test by ID
**GET** `/:id`

Get a specific test by ID.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Test fetched successfully",
  "data": {
    "test": {
      "_id": "test_id",
      "title": "Test Title",
      "description": "Test Description",
      "audioURL": "path/to/audio/file",
      "referenceText": "Reference text for typing",
      "difficulty": "intermediate",
      "category": "comprehensive",
      "duration": 300,
      "maxRetakes": 3,
      "settings": {
        "allowPause": true,
        "maxPauses": 3,
        "showTimer": true,
        "showProgress": true,
        "autoSubmit": true
      },
      "assignedBatches": [...],
      "assignedDays": [...],
      "uploadedBy": "admin_id"
    }
  }
}
```

#### 3. Create Test
**POST** `/`

Create a new test with audio file upload.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:** `multipart/form-data`
- `title`: Test title
- `description`: Test description
- `referenceText`: Reference text for typing
- `difficulty`: Difficulty level (beginner, intermediate, advanced, expert)
- `category`: Test category (dictation, transcription, speed_test, accuracy_test, comprehensive)
- `duration`: Duration in seconds
- `maxRetakes`: Maximum retakes allowed
- `audioFile`: Audio file upload

**Response:**
```json
{
  "success": true,
  "message": "Test created successfully",
  "data": {
    "test": {
      "_id": "test_id",
      "title": "Test Title",
      "description": "Test Description",
      "audioURL": "path/to/uploaded/audio/file",
      "referenceText": "Reference text for typing",
      "difficulty": "intermediate",
      "category": "comprehensive",
      "duration": 300,
      "maxRetakes": 3,
      "isActive": true,
      "isPublished": false,
      "uploadedBy": "admin_id",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 4. Update Test
**PUT** `/:id`

Update test information.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "title": "Updated Test Title",
  "description": "Updated Description",
  "referenceText": "Updated reference text",
  "difficulty": "advanced",
  "category": "speed_test",
  "duration": 600,
  "maxRetakes": 5,
  "isActive": true,
  "isPublished": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test updated successfully",
  "data": {
    "test": {...}
  }
}
```

#### 5. Delete Test
**DELETE** `/:id`

Delete a test.

**Headers:** `Authorization: Bearer <firebase_token>`

**Response:**
```json
{
  "success": true,
  "message": "Test deleted successfully"
}
```

#### 6. Assign Test to Batches
**POST** `/:id/assign-batches`

Assign a test to multiple batches.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "batchIds": ["batch_id_1", "batch_id_2", "batch_id_3"],
  "assignedDays": [
    {
      "batchId": "batch_id_1",
      "day": 1,
      "date": "2024-01-01T00:00:00.000Z",
      "isActive": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test assigned to batches successfully",
  "data": {
    "test": {...},
    "assignedBatches": [...],
    "assignedDays": [...]
  }
}
```

#### 7. Remove Test from Batches
**DELETE** `/:id/remove-batches`

Remove a test from batches.

**Headers:** `Authorization: Bearer <firebase_token>`

**Request Body:**
```json
{
  "batchIds": ["batch_id_1", "batch_id_2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test removed from batches successfully",
  "data": {
    "test": {...},
    "removedBatches": [...]
  }
}
```

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

---

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `410`: Gone (deprecated endpoint)
- `500`: Internal Server Error

### Common Error Messages
- `"Firebase ID token is required"` - Missing authentication token
- `"User not found"` - User doesn't exist
- `"Student not found"` - Student doesn't exist
- `"Test not found"` - Test doesn't exist
- `"Batch not found"` - Batch doesn't exist
- `"Access denied"` - Insufficient permissions
- `"Student not approved or blocked"` - Student access denied
- `"Maximum retakes exceeded"` - No more attempts allowed
- `"Test not available"` - Test not accessible

---

## Authentication

### Firebase Authentication
All protected endpoints require Firebase authentication:

1. **Get Firebase ID Token** from your Firebase client
2. **Include in Authorization header**: `Authorization: Bearer <firebase_token>`
3. **Token validation** happens automatically on the server

### Role-Based Access Control
- **Student endpoints**: Require `student` role
- **Admin endpoints**: Require `admin` or `super_admin` role
- **Authentication endpoints**: No role required

### Token Expiration
- Firebase tokens have expiration times
- Implement token refresh logic in your frontend
- Handle 401 responses by redirecting to login

---

## Frontend Integration Examples

### JavaScript/React Example
```javascript
// API Base URL
const API_BASE = 'http://localhost:3000/api/v1';

// Authentication helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('firebase_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Student Dashboard
const getStudentDashboard = async () => {
  try {
    const response = await fetch(`${API_BASE}/students/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    throw error;
  }
};

// Start Test Session
const startTestSession = async (testId) => {
  try {
    const response = await fetch(`${API_BASE}/students/tests/${testId}/start`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error starting test session:', error);
    throw error;
  }
};

// Submit Test Results
const submitTestResults = async (sessionId, results) => {
  try {
    const response = await fetch(`${API_BASE}/students/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(results)
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting results:', error);
    throw error;
  }
};
```

### TypeScript Interfaces
```typescript
// Student Types
interface Student {
  _id: string;
  name: string;
  email: string;
  isApproved: boolean;
  isBlocked: boolean;
  assignedBatches: Batch[];
  lastLogin: string;
}

interface TestResult {
  _id: string;
  wpm: number;
  accuracy: number;
  speed: number;
  rank: number;
  percentile: number;
  attemptNumber: number;
  isRetake: boolean;
  timeTaken: number;
  testId: Test;
  batchId: Batch;
  submittedAt: string;
}

interface TestSession {
  sessionId: string;
  test: Test;
  attemptNumber: number;
  timeExpires: string;
}

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedResponse<T> {
  results: T[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}
```

This comprehensive API documentation provides everything your frontend team needs to integrate with the shorthand stenography application. All endpoints are documented with request/response examples, authentication requirements, and error handling information.
