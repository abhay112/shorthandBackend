# 📚 Complete API Documentation - Shorthand Stenography Platform

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000/api/v1`  
**Production URL**: `https://your-domain.com/api/v1`

---

## 📋 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Student APIs](#student-apis)
3. [Admin APIs](#admin-apis)
4. [Test Management APIs](#test-management-apis)
5. [Batch Management APIs](#batch-management-apis)
6. [Result & Ranking APIs](#result--ranking-apis)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication & Authorization

### Authentication Methods

All authenticated endpoints require a Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

### User Roles

- **student** - Regular student user (requires approval to take tests)
- **admin** - Administrator (can manage students, tests, batches)
- **super_admin** - Super administrator (full system access)

---

## 1️⃣ Authentication APIs

### 1.1 Register User

**POST** `/auth/register`

Register a new user in the system.

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2YjU4...",
  "role": "student"
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Firebase ID token from frontend authentication |
| role | string | No | User role (default: "student"). Options: "student", "admin" |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "firebaseUid": "5shzguDRZASrDjSKLENlknxn90B2",
      "email": "student@example.com",
      "name": "John Doe",
      "role": "student",
      "isApproved": false,
      "isBlocked": false,
      "assignedBatches": [],
      "createdAt": "2025-10-10T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

```json
// 400 - Invalid token
{
  "success": false,
  "message": "Invalid Firebase token"
}

// 409 - User already exists
{
  "success": false,
  "message": "User already exists with this email"
}
```

---

### 1.2 Login User

**POST** `/auth/login`

Login an existing user.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2YjU4..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "email": "student@example.com",
      "name": "John Doe",
      "role": "student",
      "isApproved": true,
      "isBlocked": false,
      "assignedBatches": ["68d3fefdd3c7803f67fc9598"],
      "lastLogin": "2025-10-10T12:30:00.000Z"
    }
  }
}
```

---

### 1.3 Logout User

**POST** `/auth/logout`

Logout the current user and clear session.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 1.4 Get Current User

**GET** `/auth/me`

Get the current authenticated user's profile.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "user": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "email": "student@example.com",
      "name": "John Doe",
      "role": "student",
      "isApproved": true,
      "isBlocked": false,
      "assignedBatches": [
        {
          "_id": "68d3fefdd3c7803f67fc9598",
          "name": "Batch 2024-A",
          "startDate": "2025-09-03T00:00:00.000Z",
          "endDate": "2025-10-02T00:00:00.000Z"
        }
      ],
      "lastLogin": "2025-10-10T12:30:00.000Z"
    }
  }
}
```

---

## 2️⃣ Student APIs

### 2.1 Get Student Dashboard

**GET** `/students/dashboard`

Get comprehensive dashboard data for the logged-in student.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student dashboard fetched successfully",
  "data": {
    "dashboard": {
      "student": {
        "id": "68c6acb61d1e6a2919b50af9",
        "name": "John Doe",
        "email": "student@example.com",
        "isApproved": true,
        "isBlocked": false,
        "assignedBatches": [
          {
            "_id": "68d3fefdd3c7803f67fc9598",
            "name": "Batch 2024-A",
            "description": "Morning batch for beginners",
            "isActive": true,
            "startDate": "2025-09-03T00:00:00.000Z",
            "endDate": "2025-10-02T00:00:00.000Z"
          }
        ]
      },
      "currentTest": {
        "primaryTest": {
          "test": {
            "id": "68e967ddf1ee339dd762bc77",
            "title": "Speed Test - Level 1",
            "description": "Basic speed typing test",
            "testType": "practice",
            "difficulty": "beginner",
            "category": "speed_test",
            "duration": 300,
            "maxRetakes": 3,
            "settings": {
              "allowPause": true,
              "maxPauses": 3,
              "showTimer": true,
              "showProgress": true,
              "autoSubmit": true
            },
            "isBlocked": false,
            "status": "available"
          },
          "canTakeTest": true,
          "canViewContent": true,
          "assignedBatch": {
            "_id": "68d3fefdd3c7803f67fc9598",
            "name": "Batch 2024-A"
          },
          "priority": 1,
          "attemptInfo": {
            "totalAttempts": 1,
            "maxRetakes": 3,
            "remainingAttempts": 2,
            "hasCompleted": true,
            "completedToday": false,
            "lastAttemptDate": "2025-10-09T15:10:47.657Z",
            "lastAttemptScore": {
              "wpm": 45,
              "accuracy": 92.5,
              "rank": 3,
              "percentile": 85.2
            }
          }
        },
        "allTestsForToday": [
          {
            "test": { /* ... same structure as above ... */ },
            "canTakeTest": true,
            "attemptInfo": { /* ... */ }
          }
        ],
        "totalTestsAvailable": 2
      },
      "recentResults": [
        {
          "_id": "68e96847f1ee339dd762bd36",
          "studentId": "68c6acb61d1e6a2919b50af9",
          "batchId": {
            "_id": "68d3fefdd3c7803f67fc9598",
            "name": "Batch 2024-A"
          },
          "testId": {
            "_id": "68e967ddf1ee339dd762bc77",
            "title": "Speed Test - Level 1",
            "difficulty": "beginner",
            "category": "speed_test"
          },
          "wpm": 45,
          "accuracy": 92.5,
          "speed": 180,
          "totalWords": 150,
          "correctWords": 139,
          "incorrectWords": 11,
          "totalCharacters": 750,
          "correctCharacters": 694,
          "incorrectCharacters": 56,
          "timeTaken": 300,
          "timeStarted": "2025-10-09T15:00:00.000Z",
          "timeCompleted": "2025-10-09T15:05:00.000Z",
          "attemptNumber": 1,
          "isRetake": false,
          "mistakes": [
            {
              "word": "expected",
              "typed": "expectd",
              "position": 15
            }
          ],
          "stenographyErrors": [
            {
              "type": "omission",
              "original": "expected",
              "typed": "expectd",
              "position": 15,
              "severity": "minor"
            }
          ],
          "sessionId": "92bac3b0-a87d-4ef0-9474-3f8709c94b1e",
          "status": "completed",
          "isValid": true,
          "rank": 3,
          "percentile": 85.2,
          "submittedAt": "2025-10-09T15:05:00.657Z"
        }
      ],
      "statistics": {
        "totalTests": 15,
        "averageWpm": 42.3,
        "averageAccuracy": 88.5,
        "bestWpm": 55,
        "bestAccuracy": 95.8,
        "totalTimeSpent": 4500,
        "improvementTrend": "improving"
      },
      "rankings": [
        {
          "_id": "68e9684748cffc424c53fbe1",
          "studentId": "68c6acb61d1e6a2919b50af9",
          "batchId": {
            "_id": "68d3fefdd3c7803f67fc9598",
            "name": "Batch 2024-A"
          },
          "testId": {
            "_id": "68e967ddf1ee339dd762bc77",
            "title": "Speed Test - Level 1"
          },
          "rank": 3,
          "percentile": 85.2,
          "wpm": 45,
          "accuracy": 92.5,
          "speed": 180,
          "totalStudents": 25,
          "totalAttempts": 1,
          "previousRank": 5,
          "rankChange": 2,
          "testDate": "2025-10-09T15:05:00.000Z",
          "rankingCalculatedAt": "2025-10-09T15:05:01.000Z"
        }
      ],
      "upcomingTests": [
        {
          "id": "68e967ddf1ee339dd762bc88",
          "title": "Advanced Dictation Test",
          "difficulty": "advanced",
          "category": "dictation",
          "duration": 600,
          "assignedDate": "2025-10-11T00:00:00.000Z",
          "assignedBatch": {
            "_id": "68d3fefdd3c7803f67fc9598",
            "name": "Batch 2024-A"
          }
        }
      ]
    }
  }
}
```

---

### 2.2 Get Student Profile

**GET** `/students/profile`

Get detailed profile information for the logged-in student.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student profile fetched successfully",
  "data": {
    "profile": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "name": "John Doe",
      "email": "student@example.com",
      "role": "student",
      "isApproved": true,
      "isBlocked": false,
      "isOnlineMode": true,
      "assignedBatches": [
        {
          "_id": "68d3fefdd3c7803f67fc9598",
          "name": "Batch 2024-A",
          "description": "Morning batch",
          "startDate": "2025-09-03T00:00:00.000Z",
          "endDate": "2025-10-02T00:00:00.000Z"
        }
      ],
      "lastLogin": "2025-10-10T12:30:00.000Z",
      "createdAt": "2025-09-01T08:00:00.000Z",
      "updatedAt": "2025-10-10T12:30:00.000Z"
    }
  }
}
```

---

### 2.3 Update Student Profile

**PATCH** `/students/profile`

Update student profile information.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Smith"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "name": "John Smith",
      "email": "student@example.com",
      "updatedAt": "2025-10-10T13:00:00.000Z"
    }
  }
}
```

---

### 2.4 Start Test Session

**POST** `/students/sessions/:testId/start`

Start a new test session for a specific test.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| testId | string | MongoDB ObjectId of the test |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test session started successfully",
  "data": {
    "session": {
      "_id": "68e96900f1ee339dd762bd50",
      "sessionId": "92bac3b0-a87d-4ef0-9474-3f8709c94b1e",
      "studentId": "68c6acb61d1e6a2919b50af9",
      "testId": "68e967ddf1ee339dd762bc77",
      "batchId": "68d3fefdd3c7803f67fc9598",
      "startTime": "2025-10-10T14:00:00.000Z",
      "expiresAt": "2025-10-10T14:10:00.000Z",
      "attemptNumber": 2,
      "isRetake": true,
      "maxRetakes": 3,
      "status": "active",
      "pauseCount": 0,
      "maxPauses": 3,
      "canPause": true,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  }
}
```

**Error Responses:**
```json
// 403 - Cannot take test
{
  "success": false,
  "message": "Maximum retakes exceeded"
}

// 404 - Test not found
{
  "success": false,
  "message": "Test not found"
}

// 403 - Test blocked
{
  "success": false,
  "message": "Test is currently blocked by admin"
}
```

---

### 2.5 End Test Session & Submit Results

**POST** `/students/sessions/:sessionId/end`

Submit test results and end the session.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string | UUID session identifier |

**Request Body:**
```json
{
  "results": {
    "wpm": 45,
    "accuracy": 92.5,
    "speed": 180,
    "totalWords": 150,
    "correctWords": 139,
    "incorrectWords": 11,
    "totalCharacters": 750,
    "correctCharacters": 694,
    "incorrectCharacters": 56,
    "timeTaken": 300,
    "mistakes": [
      {
        "word": "expected",
        "expected": "expected",
        "typed": "expectd",
        "position": 15,
        "timestamp": "2025-10-10T14:02:30.000Z"
      }
    ],
    "stenographyErrors": [
      {
        "type": "omission",
        "original": "expected",
        "typed": "expectd",
        "position": 15,
        "severity": "minor"
      }
    ]
  }
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| wpm | number | Yes | Words per minute |
| accuracy | number | Yes | Accuracy percentage (0-100) |
| speed | number | Yes | Characters per minute |
| totalWords | number | Yes | Total words in reference text |
| correctWords | number | Yes | Number of correctly typed words |
| incorrectWords | number | Yes | Number of incorrectly typed words |
| totalCharacters | number | Yes | Total characters in reference text |
| correctCharacters | number | Yes | Number of correctly typed characters |
| incorrectCharacters | number | Yes | Number of incorrectly typed characters |
| timeTaken | number | Yes | Time taken in seconds |
| mistakes | array | Yes | Array of mistake objects |
| stenographyErrors | array | Yes | Array of stenography error objects |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test completed successfully",
  "data": {
    "result": {
      "_id": "68e96950f1ee339dd762bd60",
      "studentId": "68c6acb61d1e6a2919b50af9",
      "batchId": "68d3fefdd3c7803f67fc9598",
      "testId": "68e967ddf1ee339dd762bc77",
      "wpm": 45,
      "accuracy": 92.5,
      "speed": 180,
      "totalWords": 150,
      "correctWords": 139,
      "incorrectWords": 11,
      "totalCharacters": 750,
      "correctCharacters": 694,
      "incorrectCharacters": 56,
      "timeTaken": 300,
      "timeStarted": "2025-10-10T14:00:00.000Z",
      "timeCompleted": "2025-10-10T14:05:00.000Z",
      "attemptNumber": 2,
      "isRetake": true,
      "mistakes": [
        {
          "word": "expected",
          "expected": "expected",
          "typed": "expectd",
          "position": 15,
          "timestamp": "2025-10-10T14:02:30.000Z"
        }
      ],
      "stenographyErrors": [
        {
          "type": "omission",
          "original": "expected",
          "typed": "expectd",
          "position": 15,
          "severity": "minor"
        }
      ],
      "sessionId": "92bac3b0-a87d-4ef0-9474-3f8709c94b1e",
      "status": "completed",
      "isValid": true,
      "rank": 3,
      "percentile": 85.2,
      "submittedAt": "2025-10-10T14:05:00.500Z",
      "createdAt": "2025-10-10T14:05:00.500Z"
    }
  }
}
```

---

### 2.6 Get Student Results

**GET** `/students/results`

Get paginated list of student's test results.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| batchId | string | - | Filter by batch ID |
| testId | string | - | Filter by test ID |
| sortBy | string | submittedAt | Sort field |
| sortOrder | string | desc | Sort order (asc/desc) |

**Example Request:**
```http
GET /api/v1/students/results?page=1&limit=10&sortBy=wpm&sortOrder=desc
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student results fetched successfully",
  "data": {
    "results": [
      {
        "_id": "68e96950f1ee339dd762bd60",
        "testId": {
          "_id": "68e967ddf1ee339dd762bc77",
          "title": "Speed Test - Level 1",
          "difficulty": "beginner",
          "category": "speed_test"
        },
        "batchId": {
          "_id": "68d3fefdd3c7803f67fc9598",
          "name": "Batch 2024-A"
        },
        "wpm": 45,
        "accuracy": 92.5,
        "speed": 180,
        "attemptNumber": 2,
        "rank": 3,
        "percentile": 85.2,
        "submittedAt": "2025-10-10T14:05:00.500Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 3,
      "total": 45,
      "limit": 20
    }
  }
}
```

---

### 2.7 Get Result Details

**GET** `/students/results/:resultId`

Get detailed information about a specific test result.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Result details fetched successfully",
  "data": {
    "result": {
      "_id": "68e96950f1ee339dd762bd60",
      "studentId": {
        "_id": "68c6acb61d1e6a2919b50af9",
        "name": "John Doe",
        "email": "student@example.com"
      },
      "testId": {
        "_id": "68e967ddf1ee339dd762bc77",
        "title": "Speed Test - Level 1",
        "description": "Basic speed typing test",
        "difficulty": "beginner",
        "category": "speed_test",
        "duration": 300,
        "referenceText": "The quick brown fox jumps..."
      },
      "batchId": {
        "_id": "68d3fefdd3c7803f67fc9598",
        "name": "Batch 2024-A",
        "description": "Morning batch"
      },
      "wpm": 45,
      "accuracy": 92.5,
      "speed": 180,
      "totalWords": 150,
      "correctWords": 139,
      "incorrectWords": 11,
      "totalCharacters": 750,
      "correctCharacters": 694,
      "incorrectCharacters": 56,
      "timeTaken": 300,
      "mistakes": [
        {
          "word": "expected",
          "expected": "expected",
          "typed": "expectd",
          "position": 15
        }
      ],
      "stenographyErrors": [
        {
          "type": "omission",
          "original": "expected",
          "typed": "expectd",
          "position": 15,
          "severity": "minor"
        }
      ],
      "rank": 3,
      "percentile": 85.2,
      "rankingContext": {
        "rank": 3,
        "percentile": 85.2,
        "totalParticipants": 25
      },
      "errorStats": {
        "totalErrors": 5,
        "errorsByType": {
          "omission": 2,
          "substitution": 3
        },
        "errorsBySeverity": {
          "minor": 4,
          "major": 1
        }
      },
      "comparison": {
        "wpmDiff": 5.2,
        "accuracyDiff": -2.3,
        "speedDiff": 10.5,
        "studentAverage": {
          "wpm": 39.8,
          "accuracy": 94.8,
          "speed": 169.5
        }
      }
    }
  }
}
```

---

### 2.8 Get Student Statistics

**GET** `/students/statistics`

Get overall performance statistics for the student.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student statistics fetched successfully",
  "data": {
    "statistics": {
      "totalTests": 45,
      "averageWpm": 42.3,
      "averageAccuracy": 88.5,
      "bestWpm": 55,
      "bestAccuracy": 95.8,
      "totalTimeSpent": 13500,
      "improvementTrend": "improving"
    }
  }
}
```

---

### 2.9 Get Batch Leaderboard

**GET** `/students/batch/:batchId/leaderboard`

Get leaderboard for a specific batch.

**Request Headers:**
```http
Authorization: Bearer <firebase_token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| testId | string | Filter by specific test (optional) |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Batch leaderboard fetched successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "studentId": "68c6acb61d1e6a2919b50af0",
        "studentName": "Jane Smith",
        "wpm": 65,
        "accuracy": 97.5,
        "speed": 260,
        "totalTests": 20,
        "averageWpm": 62.3,
        "bestWpm": 68
      },
      {
        "rank": 2,
        "studentId": "68c6acb61d1e6a2919b50af1",
        "studentName": "Mike Johnson",
        "wpm": 58,
        "accuracy": 95.2,
        "speed": 232,
        "totalTests": 18,
        "averageWpm": 55.1,
        "bestWpm": 61
      },
      {
        "rank": 3,
        "studentId": "68c6acb61d1e6a2919b50af9",
        "studentName": "John Doe",
        "wpm": 45,
        "accuracy": 92.5,
        "speed": 180,
        "totalTests": 15,
        "averageWpm": 42.3,
        "bestWpm": 55
      }
    ]
  }
}
```

---

## 3️⃣ Admin APIs

### 3.1 Get All Students

**GET** `/admin/students`

Get list of all students with pagination.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Students per page |
| isApproved | boolean | - | Filter by approval status |
| isBlocked | boolean | - | Filter by blocked status |
| batchId | string | - | Filter by batch ID |
| search | string | - | Search by name or email |

**Example Request:**
```http
GET /api/v1/admin/students?page=1&limit=10&isApproved=false
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Students fetched successfully",
  "data": {
    "students": [
      {
        "_id": "68c6acb61d1e6a2919b50af9",
        "name": "John Doe",
        "email": "student@example.com",
        "role": "student",
        "isApproved": false,
        "isBlocked": false,
        "assignedBatches": [
          {
            "_id": "68d3fefdd3c7803f67fc9598",
            "name": "Batch 2024-A"
          }
        ],
        "lastLogin": "2025-10-10T12:30:00.000Z",
        "createdAt": "2025-09-01T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 125,
      "pages": 13
    }
  }
}
```

---

### 3.2 Get Student by ID

**GET** `/admin/students/:studentId`

Get detailed information about a specific student.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student details fetched successfully",
  "data": {
    "student": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "name": "John Doe",
      "email": "student@example.com",
      "role": "student",
      "isApproved": true,
      "isBlocked": false,
      "assignedBatches": [
        {
          "_id": "68d3fefdd3c7803f67fc9598",
          "name": "Batch 2024-A",
          "description": "Morning batch",
          "startDate": "2025-09-03T00:00:00.000Z",
          "endDate": "2025-10-02T00:00:00.000Z",
          "studentsCount": 25
        }
      ],
      "statistics": {
        "totalTests": 15,
        "averageWpm": 42.3,
        "averageAccuracy": 88.5,
        "bestWpm": 55,
        "totalTimeSpent": 4500
      },
      "recentActivity": [
        {
          "testId": "68e967ddf1ee339dd762bc77",
          "testTitle": "Speed Test - Level 1",
          "wpm": 45,
          "accuracy": 92.5,
          "rank": 3,
          "submittedAt": "2025-10-10T14:05:00.000Z"
        }
      ],
      "lastLogin": "2025-10-10T12:30:00.000Z",
      "createdAt": "2025-09-01T08:00:00.000Z"
    }
  }
}
```

---

### 3.3 Approve/Disapprove Student

**POST** `/admin/students/approve`

Approve or disapprove a student for taking tests.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "68c6acb61d1e6a2919b50af9",
  "isApproved": true,
  "reason": "Profile verified and batch assigned"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student approved successfully",
  "data": {
    "student": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "name": "John Doe",
      "email": "student@example.com",
      "isApproved": true,
      "approvedAt": "2025-10-10T15:00:00.000Z",
      "approvedBy": "68c6acb61d1e6a2919b50af0"
    }
  }
}
```

---

### 3.4 Block/Unblock Student

**POST** `/admin/students/block`

Block or unblock a student from accessing the system.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "68c6acb61d1e6a2919b50af9",
  "isBlocked": true,
  "reason": "Violation of test-taking policies"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student blocked successfully",
  "data": {
    "student": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "name": "John Doe",
      "email": "student@example.com",
      "isBlocked": true,
      "blockReason": "Violation of test-taking policies",
      "blockedAt": "2025-10-10T15:30:00.000Z",
      "blockedBy": "68c6acb61d1e6a2919b50af0"
    }
  }
}
```

---

### 3.5 Assign Student to Batch

**POST** `/admin/students/assign-batch`

Assign a student to one or more batches.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "68c6acb61d1e6a2919b50af9",
  "batchIds": ["68d3fefdd3c7803f67fc9598", "68d3fefdd3c7803f67fc9599"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student assigned to batches successfully",
  "data": {
    "student": {
      "_id": "68c6acb61d1e6a2919b50af9",
      "name": "John Doe",
      "assignedBatches": [
        {
          "_id": "68d3fefdd3c7803f67fc9598",
          "name": "Batch 2024-A"
        },
        {
          "_id": "68d3fefdd3c7803f67fc9599",
          "name": "Batch 2024-B"
        }
      ]
    }
  }
}
```

---

### 3.6 Get Admin Dashboard

**GET** `/admin/dashboard`

Get comprehensive dashboard statistics for administrators.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Admin dashboard fetched successfully",
  "data": {
    "dashboard": {
      "overview": {
        "totalStudents": 125,
        "approvedStudents": 98,
        "pendingApproval": 27,
        "blockedStudents": 3,
        "totalBatches": 8,
        "activeBatches": 6,
        "totalTests": 45,
        "activeTests": 38
      },
      "recentActivity": [
        {
          "type": "test_submitted",
          "student": "John Doe",
          "test": "Speed Test - Level 1",
          "wpm": 45,
          "timestamp": "2025-10-10T14:05:00.000Z"
        },
        {
          "type": "student_registered",
          "student": "Jane Smith",
          "timestamp": "2025-10-10T13:00:00.000Z"
        }
      ],
      "performanceMetrics": {
        "averageWpmAllStudents": 38.5,
        "averageAccuracyAllStudents": 85.2,
        "testsCompletedToday": 45,
        "testsCompletedThisWeek": 289,
        "testsCompletedThisMonth": 1234
      },
      "topPerformers": [
        {
          "studentId": "68c6acb61d1e6a2919b50af0",
          "name": "Jane Smith",
          "averageWpm": 65,
          "averageAccuracy": 97.5,
          "totalTests": 20
        }
      ],
      "pendingApprovals": [
        {
          "studentId": "68c6acb61d1e6a2919b50af9",
          "name": "New Student",
          "email": "new@example.com",
          "registeredAt": "2025-10-10T10:00:00.000Z"
        }
      ]
    }
  }
}
```

---

## 4️⃣ Test Management APIs

### 4.1 Create Test

**POST** `/test`

Create a new test with optional audio file.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
title: "Speed Test - Level 2"
description: "Intermediate level speed typing test"
referenceText: "The quick brown fox jumps over the lazy dog..."
difficulty: "intermediate"
category: "speed_test"
duration: 600
maxRetakes: 3
audioFile: <file>
testType: "practice"
settings[allowPause]: true
settings[maxPauses]: 3
settings[showTimer]: true
settings[showProgress]: true
settings[autoSubmit]: true
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Test title |
| description | string | No | Test description |
| referenceText | string | Yes | Expected text for typing |
| difficulty | string | No | beginner, intermediate, advanced, expert |
| category | string | No | dictation, transcription, speed_test, accuracy_test, comprehensive |
| duration | number | No | Duration in seconds (default: 300) |
| maxRetakes | number | No | Maximum retake attempts (default: 3) |
| audioFile | file | No | Audio file for dictation tests |
| testType | string | No | practice, assessment, exam |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Test created successfully",
  "data": {
    "test": {
      "_id": "68e967ddf1ee339dd762bc77",
      "title": "Speed Test - Level 2",
      "description": "Intermediate level speed typing test",
      "audioURL": "/uploads/audio-1697890123456.mp3",
      "referenceText": "The quick brown fox jumps...",
      "difficulty": "intermediate",
      "category": "speed_test",
      "duration": 600,
      "maxRetakes": 3,
      "testType": "practice",
      "settings": {
        "allowPause": true,
        "maxPauses": 3,
        "showTimer": true,
        "showProgress": true,
        "autoSubmit": true
      },
      "isActive": true,
      "isPublished": false,
      "uploadedBy": "68c6acb61d1e6a2919b50af0",
      "createdAt": "2025-10-10T16:00:00.000Z"
    }
  }
}
```

---

### 4.2 Get All Tests

**GET** `/test`

Get list of all tests with pagination and filters.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Tests per page (default: 20) |
| difficulty | string | Filter by difficulty |
| category | string | Filter by category |
| isActive | boolean | Filter by active status |
| isPublished | boolean | Filter by published status |
| search | string | Search by title |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Tests retrieved successfully",
  "data": {
    "tests": [
      {
        "_id": "68e967ddf1ee339dd762bc77",
        "title": "Speed Test - Level 2",
        "description": "Intermediate level test",
        "difficulty": "intermediate",
        "category": "speed_test",
        "duration": 600,
        "maxRetakes": 3,
        "isActive": true,
        "isPublished": true,
        "assignedBatches": [
          {
            "_id": "68d3fefdd3c7803f67fc9598",
            "name": "Batch 2024-A"
          }
        ],
        "statistics": {
          "totalAttempts": 145,
          "averageWpm": 42.5,
          "averageAccuracy": 88.2
        },
        "uploadedBy": {
          "_id": "68c6acb61d1e6a2919b50af0",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "createdAt": "2025-10-10T16:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### 4.3 Get Test by ID

**GET** `/test/:id`

Get detailed information about a specific test.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test retrieved successfully",
  "data": {
    "test": {
      "_id": "68e967ddf1ee339dd762bc77",
      "title": "Speed Test - Level 2",
      "description": "Intermediate level speed typing test",
      "audioURL": "/uploads/audio-1697890123456.mp3",
      "referenceText": "The quick brown fox jumps over the lazy dog...",
      "difficulty": "intermediate",
      "category": "speed_test",
      "duration": 600,
      "maxRetakes": 3,
      "testType": "practice",
      "settings": {
        "allowPause": true,
        "maxPauses": 3,
        "showTimer": true,
        "showProgress": true,
        "autoSubmit": true
      },
      "assignedBatches": [
        {
          "_id": "68d3fefdd3c7803f67fc9598",
          "name": "Batch 2024-A",
          "description": "Morning batch",
          "students": ["68c6acb61d1e6a2919b50af9"]
        }
      ],
      "assignedDays": [
        {
          "batchId": "68d3fefdd3c7803f67fc9598",
          "day": 15,
          "assignedDate": "2025-10-10T00:00:00.000Z",
          "isActive": true,
          "priority": 1
        }
      ],
      "statistics": {
        "totalAttempts": 145,
        "averageWpm": 42.5,
        "averageAccuracy": 88.2,
        "completionRate": 94.5
      },
      "isActive": true,
      "isPublished": true,
      "isBlocked": false,
      "uploadedBy": {
        "_id": "68c6acb61d1e6a2919b50af0",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "createdAt": "2025-10-10T16:00:00.000Z",
      "updatedAt": "2025-10-10T16:30:00.000Z"
    }
  }
}
```

---

### 4.4 Update Test

**PUT** `/test/:id`

Update test information.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Speed Test - Level 2",
  "description": "Updated description",
  "duration": 900,
  "isActive": true,
  "isPublished": true,
  "difficulty": "advanced"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test updated successfully",
  "data": {
    "test": {
      "_id": "68e967ddf1ee339dd762bc77",
      "title": "Updated Speed Test - Level 2",
      "description": "Updated description",
      "duration": 900,
      "difficulty": "advanced",
      "isActive": true,
      "isPublished": true,
      "updatedAt": "2025-10-10T17:00:00.000Z"
    }
  }
}
```

---

### 4.5 Delete Test

**DELETE** `/test/:id`

Delete a test from the system.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test deleted successfully"
}
```

---

### 4.6 Assign Test to Batches

**POST** `/test/:id/assign-batches`

Assign a test to one or more batches.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "batchIds": ["68d3fefdd3c7803f67fc9598", "68d3fefdd3c7803f67fc9599"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test assigned to batches successfully",
  "data": {
    "test": {
      "_id": "68e967ddf1ee339dd762bc77",
      "title": "Speed Test - Level 2",
      "assignedBatches": [
        {
          "_id": "68d3fefdd3c7803f67fc9598",
          "name": "Batch 2024-A"
        },
        {
          "_id": "68d3fefdd3c7803f67fc9599",
          "name": "Batch 2024-B"
        }
      ]
    }
  }
}
```

---

### 4.7 Assign Test to Specific Dates

**POST** `/test/:id/assign-dates`

Assign a test to specific dates for batches (day-wise assignment).

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "assignments": [
    {
      "batchId": "68d3fefdd3c7803f67fc9598",
      "assignedDate": "2025-10-15T00:00:00.000Z",
      "priority": 1
    },
    {
      "batchId": "68d3fefdd3c7803f67fc9599",
      "assignedDate": "2025-10-16T00:00:00.000Z",
      "priority": 2
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test assigned to dates successfully",
  "data": {
    "test": {
      "_id": "68e967ddf1ee339dd762bc77",
      "title": "Speed Test - Level 2",
      "assignedDays": [
        {
          "batchId": "68d3fefdd3c7803f67fc9598",
          "assignedDate": "2025-10-15T00:00:00.000Z",
          "day": 15,
          "isActive": true,
          "priority": 1
        },
        {
          "batchId": "68d3fefdd3c7803f67fc9599",
          "assignedDate": "2025-10-16T00:00:00.000Z",
          "day": 16,
          "isActive": true,
          "priority": 2
        }
      ]
    }
  }
}
```

---

### 4.8 Block/Unblock Test

**POST** `/test/:id/block`

Block or unblock a test from being taken by students.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "isBlocked": true,
  "blockReason": "Test content under review"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test blocked successfully",
  "data": {
    "test": {
      "_id": "68e967ddf1ee339dd762bc77",
      "title": "Speed Test - Level 2",
      "isBlocked": true,
      "blockReason": "Test content under review",
      "blockedAt": "2025-10-10T18:00:00.000Z"
    }
  }
}
```

---

## 5️⃣ Batch Management APIs

### 5.1 Create Batch

**POST** `/batch`

Create a new batch for organizing students.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Batch 2024-C",
  "description": "Evening batch for intermediate students",
  "startDate": "2025-11-01T00:00:00.000Z",
  "endDate": "2025-12-31T00:00:00.000Z",
  "maxStudents": 30
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "batch": {
      "_id": "68d3fefdd3c7803f67fc9600",
      "name": "Batch 2024-C",
      "description": "Evening batch for intermediate students",
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "maxStudents": 30,
      "isActive": true,
      "students": [],
      "tests": [],
      "createdBy": "68c6acb61d1e6a2919b50af0",
      "createdAt": "2025-10-10T19:00:00.000Z"
    }
  }
}
```

---

### 5.2 Get All Batches

**GET** `/batch`

Get list of all batches.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Batches per page |
| isActive | boolean | Filter by active status |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Batches fetched successfully",
  "data": {
    "batches": [
      {
        "_id": "68d3fefdd3c7803f67fc9598",
        "name": "Batch 2024-A",
        "description": "Morning batch",
        "startDate": "2025-09-03T00:00:00.000Z",
        "endDate": "2025-10-02T00:00:00.000Z",
        "maxStudents": 30,
        "isActive": true,
        "students": ["68c6acb61d1e6a2919b50af9"],
        "tests": ["68e967ddf1ee339dd762bc77"],
        "studentsCount": 25,
        "testsCount": 12,
        "createdBy": {
          "_id": "68c6acb61d1e6a2919b50af0",
          "name": "Admin User"
        },
        "createdAt": "2025-09-01T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1
    }
  }
}
```

---

### 5.3 Get Batch by ID

**GET** `/batch/:id`

Get detailed information about a specific batch.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Batch fetched successfully",
  "data": {
    "batch": {
      "_id": "68d3fefdd3c7803f67fc9598",
      "name": "Batch 2024-A",
      "description": "Morning batch for beginners",
      "startDate": "2025-09-03T00:00:00.000Z",
      "endDate": "2025-10-02T00:00:00.000Z",
      "maxStudents": 30,
      "isActive": true,
      "students": [
        {
          "_id": "68c6acb61d1e6a2919b50af9",
          "name": "John Doe",
          "email": "student@example.com",
          "isApproved": true
        }
      ],
      "tests": [
        {
          "_id": "68e967ddf1ee339dd762bc77",
          "title": "Speed Test - Level 2",
          "difficulty": "intermediate"
        }
      ],
      "statistics": {
        "totalStudents": 25,
        "approvedStudents": 23,
        "averageWpm": 38.5,
        "averageAccuracy": 85.2,
        "totalTestsCompleted": 289
      },
      "createdBy": {
        "_id": "68c6acb61d1e6a2919b50af0",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "createdAt": "2025-09-01T08:00:00.000Z"
    }
  }
}
```

---

### 5.4 Update Batch

**PUT** `/batch/:id`

Update batch information.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Batch 2024-A",
  "description": "Updated description",
  "endDate": "2025-11-02T00:00:00.000Z",
  "maxStudents": 35,
  "isActive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {
    "batch": {
      "_id": "68d3fefdd3c7803f67fc9598",
      "name": "Updated Batch 2024-A",
      "description": "Updated description",
      "endDate": "2025-11-02T00:00:00.000Z",
      "maxStudents": 35,
      "isActive": true,
      "updatedAt": "2025-10-10T20:00:00.000Z"
    }
  }
}
```

---

### 5.5 Delete Batch

**DELETE** `/batch/:id`

Delete a batch from the system.

**Request Headers:**
```http
Authorization: Bearer <admin_firebase_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Batch deleted successfully"
}
```

---

## 6️⃣ Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "stack": "Error stack trace (development only)"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Examples

#### 400 - Bad Request
```json
{
  "success": false,
  "message": "Invalid test ID format. Please provide a valid test ID.",
  "errorCode": "INVALID_ID_FORMAT"
}
```

#### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Authentication token is invalid or expired",
  "errorCode": "UNAUTHORIZED"
}
```

#### 403 - Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to perform this action",
  "errorCode": "FORBIDDEN"
}
```

#### 404 - Not Found
```json
{
  "success": false,
  "message": "Test not found",
  "errorCode": "NOT_FOUND"
}
```

#### 429 - Rate Limit Exceeded
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

---

## 7️⃣ Rate Limiting

### Global Rate Limit
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All `/api/*` endpoints
- **Headers Included**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

### Endpoint-Specific Limits
- **Authentication**: 10 requests per 15 minutes
- **Test Submission**: 5 requests per minute
- **Admin Operations**: 200 requests per 15 minutes

---

## 8️⃣ CORS Configuration

### Allowed Origins
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5173`
- `http://localhost:5174`
- Production frontend URL from environment variable

### Allowed Methods
- GET, POST, PUT, PATCH, DELETE, OPTIONS

### Allowed Headers
- Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie

---

## 📝 Additional Notes

### Date Format
All dates are in ISO 8601 format (UTC):
```
2025-10-10T14:05:00.000Z
```

### MongoDB ObjectId Format
24 hexadecimal characters:
```
68e967ddf1ee339dd762bc77
```

### File Upload
- **Supported formats**: MP3, WAV, M4A for audio files
- **Max file size**: 10MB
- **Storage**: `/uploads/` directory

### Pagination
All paginated endpoints follow the same structure:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## 🔗 Useful Links

- **Swagger Documentation**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/`
- **GitHub Repository**: [Your Repo URL]

---

**Last Updated**: October 10, 2025  
**API Version**: 1.0.0  
**Documentation Version**: 1.0.0

For support or questions, contact: [your-email@example.com]
