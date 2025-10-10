# Test Management System Modifications

## 📋 **Overview**

This document outlines all modifications made to the test management system to support multiple tests per day, date-based assignments, and admin blocking functionality.

---

## 🔧 **Files Modified**

### **1. Core Model Changes**
- `src/models/Test.js` - Enhanced with new fields and methods
- `src/controllers/testController.js` - Updated with new API endpoints
- `src/services/testService.js` - Added new service methods
- `src/routes/testRoutes.js` - Added new routes
- `src/services/studentService.js` - Updated student dashboard logic

---

## 🆕 **New API Endpoints**

### **1. Enhanced Test Creation**

**Endpoint:** `POST /api/v1/test`

**Description:** Create a test with enhanced features including date assignments and test types.

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>",
  "Content-Type": "multipart/form-data"
}
```

**Payload (Form Data):**
```javascript
{
  // Required fields
  "title": "Daily Typing Practice",
  "referenceText": "The quick brown fox jumps over the lazy dog...",
  
  // Optional basic fields
  "description": "Morning typing practice session",
  "testType": "curriculum", // curriculum|practice|assessment|special
  "difficulty": "intermediate", // beginner|intermediate|advanced|expert
  "category": "comprehensive", // dictation|transcription|speed_test|accuracy_test|comprehensive
  "duration": 300, // seconds
  "maxRetakes": 3,
  
  // Optional time bounds
  "availableFrom": "2024-01-15T09:00:00Z",
  "availableUntil": "2024-01-15T17:00:00Z",
  
  // Date assignments (JSON string)
  "assignedDays": JSON.stringify([
    {
      "batchId": "60f1b2e4c8d4f20015a1b2c3",
      "assignedDate": "2024-01-15",
      "priority": 8,
      "availableFrom": "2024-01-15T09:00:00Z",
      "availableUntil": "2024-01-15T17:00:00Z"
    },
    {
      "batchId": "60f1b2e4c8d4f20015a1b2c4",
      "assignedDate": "2024-01-16",
      "priority": 5
    }
  ]),
  
  // General batch assignments (JSON string)
  "assignedBatches": JSON.stringify([
    "60f1b2e4c8d4f20015a1b2c5",
    "60f1b2e4c8d4f20015a1b2c6"
  ]),
  
  // Optional audio file
  "audioFile": "<binary-file-data>"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Test created successfully",
  "data": {
    "test": {
      "_id": "60f1b2e4c8d4f20015a1b2c7",
      "title": "Daily Typing Practice",
      "description": "Morning typing practice session",
      "referenceText": "The quick brown fox...",
      "testType": "curriculum",
      "difficulty": "intermediate",
      "category": "comprehensive",
      "duration": 300,
      "maxRetakes": 3,
      "audioURL": "/uploads/audios/1640995300000-audio.mp3",
      "availableFrom": "2024-01-15T09:00:00Z",
      "availableUntil": "2024-01-15T17:00:00Z",
      "assignedDays": [
        {
          "_id": "60f1b2e4c8d4f20015a1b2c8",
          "batchId": {
            "_id": "60f1b2e4c8d4f20015a1b2c3",
            "name": "Morning Batch",
            "description": "Morning typing class"
          },
          "assignedDate": "2024-01-15T00:00:00.000Z",
          "priority": 8,
          "isActive": true,
          "availableFrom": "2024-01-15T09:00:00Z",
          "availableUntil": "2024-01-15T17:00:00Z",
          "assignedBy": {
            "_id": "60f1b2e4c8d4f20015a1b2c9",
            "name": "Admin User",
            "email": "admin@example.com"
          },
          "assignedAt": "2024-01-14T10:30:00.000Z"
        }
      ],
      "assignedBatches": [
        {
          "_id": "60f1b2e4c8d4f20015a1b2c5",
          "name": "Practice Batch",
          "description": "General practice sessions"
        }
      ],
      "uploadedBy": {
        "_id": "60f1b2e4c8d4f20015a1b2c9",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "isActive": true,
      "isPublished": true,
      "isBlocked": false,
      "publishedAt": "2024-01-14T10:30:00.000Z",
      "createdAt": "2024-01-14T10:30:00.000Z",
      "updatedAt": "2024-01-14T10:30:00.000Z"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Title and referenceText are required"
}
```

---

### **2. Block Test**

**Endpoint:** `POST /api/v1/test/:id/block`

**Description:** Block a test so students cannot take it but can still view content.

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>",
  "Content-Type": "application/json"
}
```

**Payload:**
```json
{
  "reason": "Content under review for accuracy"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test blocked successfully",
  "data": {
    "test": {
      "_id": "60f1b2e4c8d4f20015a1b2c7",
      "title": "Daily Typing Practice",
      "isBlocked": true,
      "blockedBy": {
        "_id": "60f1b2e4c8d4f20015a1b2c9",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "blockedAt": "2024-01-14T15:30:00.000Z",
      "blockReason": "Content under review for accuracy",
      "allowViewWhenBlocked": true,
      "status": "blocked"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Test is already blocked"
}
```

---

### **3. Unblock Test**

**Endpoint:** `POST /api/v1/test/:id/unblock`

**Description:** Unblock a previously blocked test.

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>",
  "Content-Type": "application/json"
}
```

**Payload:** None required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test unblocked successfully",
  "data": {
    "test": {
      "_id": "60f1b2e4c8d4f20015a1b2c7",
      "title": "Daily Typing Practice",
      "isBlocked": false,
      "blockedBy": null,
      "blockedAt": null,
      "blockReason": null,
      "status": "available"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Test is not blocked"
}
```

---

### **4. Assign Test to Dates**

**Endpoint:** `POST /api/v1/test/:id/assign-dates`

**Description:** Assign an existing test to specific dates for batches.

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>",
  "Content-Type": "application/json"
}
```

**Payload:**
```json
{
  "dateAssignments": [
    {
      "batchId": "60f1b2e4c8d4f20015a1b2c3",
      "assignedDate": "2024-01-20",
      "priority": 7,
      "availableFrom": "2024-01-20T08:00:00Z",
      "availableUntil": "2024-01-20T18:00:00Z"
    },
    {
      "batchId": "60f1b2e4c8d4f20015a1b2c4",
      "assignedDate": "2024-01-21",
      "priority": 5
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
      "_id": "60f1b2e4c8d4f20015a1b2c7",
      "title": "Daily Typing Practice",
      "assignedDays": [
        {
          "_id": "60f1b2e4c8d4f20015a1b2d0",
          "batchId": {
            "_id": "60f1b2e4c8d4f20015a1b2c3",
            "name": "Morning Batch"
          },
          "assignedDate": "2024-01-20T00:00:00.000Z",
          "priority": 7,
          "isActive": true,
          "availableFrom": "2024-01-20T08:00:00Z",
          "availableUntil": "2024-01-20T18:00:00Z",
          "assignedBy": {
            "_id": "60f1b2e4c8d4f20015a1b2c9",
            "name": "Admin User",
            "email": "admin@example.com"
          },
          "assignedAt": "2024-01-14T16:00:00.000Z"
        }
      ]
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Each assignment must have batchId and assignedDate"
}
```

---

### **5. Remove Test from Dates**

**Endpoint:** `DELETE /api/v1/test/:id/remove-dates`

**Description:** Remove test from specific date assignments.

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>",
  "Content-Type": "application/json"
}
```

**Payload:**
```json
{
  "assignmentIds": [
    "60f1b2e4c8d4f20015a1b2d0",
    "60f1b2e4c8d4f20015a1b2d1"
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test removed from dates successfully",
  "data": {
    "test": {
      "_id": "60f1b2e4c8d4f20015a1b2c7",
      "title": "Daily Typing Practice",
      "assignedDays": [
        // Remaining assignments after removal
      ]
    }
  }
}
```

---

## 🔄 **Modified API Endpoints**

### **1. Student Dashboard**

**Endpoint:** `GET /api/v1/students/dashboard`

**Description:** Get student dashboard with enhanced multiple tests per day support.

**Headers:**
```json
{
  "Authorization": "Bearer <student-token>",
  "Content-Type": "application/json"
}
```

**Payload:** None (GET request)

**Success Response (200) - BEFORE:**
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "currentDayTest": {
      "test": {
        "id": "60f1b2e4c8d4f20015a1b2c7",
        "title": "Daily Practice",
        "duration": 300
      },
      "canTakeTest": true,
      "assignedBatch": {
        "_id": "60f1b2e4c8d4f20015a1b2c3",
        "name": "Morning Batch"
      }
    }
  }
}
```

**Success Response (200) - AFTER (Enhanced):**
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "currentDayTest": {
      "primaryTest": {
        "test": {
          "id": "60f1b2e4c8d4f20015a1b2c7",
          "title": "Morning Practice",
          "description": "High priority morning session",
          "testType": "curriculum",
          "difficulty": "intermediate",
          "category": "comprehensive",
          "duration": 300,
          "maxRetakes": 3,
          "settings": {
            "allowPause": true,
            "maxPauses": 3,
            "showTimer": true
          },
          "isBlocked": false,
          "status": "available"
        },
        "canTakeTest": true,
        "canViewContent": true,
        "assignedBatch": {
          "_id": "60f1b2e4c8d4f20015a1b2c3",
          "name": "Morning Batch"
        },
        "priority": 8,
        "isBlocked": false
      },
      "allTestsForToday": [
        {
          "test": {
            "id": "60f1b2e4c8d4f20015a1b2c7",
            "title": "Morning Practice",
            "testType": "curriculum",
            "difficulty": "intermediate",
            "duration": 300,
            "isBlocked": false,
            "status": "available"
          },
          "canTakeTest": true,
          "canViewContent": true,
          "assignedBatch": {
            "_id": "60f1b2e4c8d4f20015a1b2c3",
            "name": "Morning Batch"
          },
          "priority": 8,
          "isBlocked": false
        },
        {
          "test": {
            "id": "60f1b2e4c8d4f20015a1b2c8",
            "title": "Afternoon Assessment",
            "testType": "assessment",
            "difficulty": "advanced",
            "duration": 600,
            "isBlocked": false,
            "status": "available"
          },
          "canTakeTest": false,
          "canViewContent": true,
          "assignedBatch": {
            "_id": "60f1b2e4c8d4f20015a1b2c4",
            "name": "Advanced Batch"
          },
          "priority": 6,
          "isBlocked": false
        },
        {
          "test": {
            "id": "60f1b2e4c8d4f20015a1b2c9",
            "title": "Blocked Test Example",
            "testType": "practice",
            "difficulty": "beginner",
            "duration": 180,
            "isBlocked": true,
            "blockReason": "Content under review",
            "status": "blocked"
          },
          "canTakeTest": false,
          "canViewContent": true,
          "assignedBatch": {
            "_id": "60f1b2e4c8d4f20015a1b2c3",
            "name": "Morning Batch"
          },
          "priority": 3,
          "isBlocked": true,
          "blockReason": "Content under review"
        }
      ],
      "totalTestsAvailable": 3
    },
    "statistics": {
      // ... existing statistics
    }
  }
}
```

**No Tests Available Response (200):**
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "currentDayTest": {
      "primaryTest": null,
      "allTestsForToday": [],
      "totalTestsAvailable": 0
    },
    "statistics": {
      // ... existing statistics
    }
  }
}
```

---

## 🗄️ **Database Schema Changes**

### **Test Model Enhancements**

**New Fields Added:**
```javascript
{
  // Test classification
  testType: {
    type: String,
    enum: ['curriculum', 'practice', 'assessment', 'special'],
    default: 'practice'
  },

  // Enhanced day assignments
  assignedDays: [{
    batchId: { type: ObjectId, ref: 'Batch', required: true },
    assignedDate: { type: Date, required: true, index: true },
    dayNumber: { type: Number, min: 1, max: 365 },
    priority: { type: Number, default: 1, min: 1, max: 10 },
    isActive: { type: Boolean, default: true },
    availableFrom: { type: Date },
    availableUntil: { type: Date },
    assignedBy: { type: ObjectId, ref: 'Admin' },
    assignedAt: { type: Date, default: Date.now }
  }],

  // Admin blocking
  isBlocked: { type: Boolean, default: false, index: true },
  blockedBy: { type: ObjectId, ref: 'Admin' },
  blockedAt: { type: Date },
  blockReason: { type: String, trim: true },
  allowViewWhenBlocked: { type: Boolean, default: true }
}
```

**New Indexes:**
```javascript
// Performance indexes
{ "testType": 1 }
{ "isActive": 1, "isPublished": 1, "isBlocked": 1 }
{ "assignedDays.batchId": 1, "assignedDays.assignedDate": 1 }
{ "assignedDays.dayNumber": 1, "assignedDays.priority": -1 }
```

**New Virtual Properties:**
```javascript
// Virtual properties for computed values
test.isCurrentlyAvailable  // Boolean - can test be taken now
test.canViewContent       // Boolean - can content be viewed
test.status              // String - current test status
```

**New Instance Methods:**
```javascript
// Check availability for specific date/batch
test.isAvailableOnDate(date, batchId) // Boolean
```

---

## 🔧 **Service Method Changes**

### **New TestService Methods**

```javascript
// Blocking functionality
testService.blockTest(testId, adminId, reason)
testService.unblockTest(testId, adminId)

// Date assignment management
testService.assignTestToDates(testId, dateAssignments, adminId)
testService.removeTestFromDates(testId, assignmentIds)
testService.getTestsForDate(date, batchId)

// Enhanced creation
testService.createTest(title, audioURL, referenceText, adminId, options)
```

### **Updated StudentService Methods**

```javascript
// Enhanced current day test retrieval
studentService.getCurrentDayTest(studentId)
// Returns: { primaryTest, allTestsForToday, totalTestsAvailable }
```

---

## 📊 **Usage Examples**

### **Frontend Integration Example**

```javascript
// React component for multiple tests display
const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const response = await fetch('/api/v1/students/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setDashboardData(data.data);
  };

  if (!dashboardData?.currentDayTest?.totalTestsAvailable) {
    return <div>No tests available for today</div>;
  }

  const { currentDayTest } = dashboardData;

  return (
    <div className="dashboard">
      <h2>Today's Tests ({currentDayTest.totalTestsAvailable})</h2>
      
      {/* Primary Test */}
      <div className="primary-test">
        <h3>🎯 Recommended Test</h3>
        <TestCard test={currentDayTest.primaryTest} isPrimary={true} />
      </div>

      {/* All Tests */}
      <div className="all-tests">
        <h3>📚 All Available Tests</h3>
        {currentDayTest.allTestsForToday.map(testData => (
          <TestCard key={testData.test.id} test={testData} />
        ))}
      </div>
    </div>
  );
};

const TestCard = ({ test, isPrimary = false }) => (
  <div className={`test-card ${isPrimary ? 'primary' : ''} ${test.isBlocked ? 'blocked' : ''}`}>
    <div className="test-header">
      <h4>{test.test.title}</h4>
      <span className="priority">Priority: {test.priority}/10</span>
      <span className={`status ${test.test.status}`}>{test.test.status}</span>
    </div>
    
    <div className="test-details">
      <p>Type: {test.test.testType}</p>
      <p>Difficulty: {test.test.difficulty}</p>
      <p>Duration: {test.test.duration}s</p>
      <p>Batch: {test.assignedBatch?.name}</p>
    </div>

    {test.isBlocked && (
      <div className="blocked-notice">
        🚫 Test Blocked: {test.blockReason}
      </div>
    )}

    <div className="test-actions">
      {test.canTakeTest ? (
        <button className="btn-primary">Take Test</button>
      ) : (
        <button className="btn-disabled" disabled>Cannot Take</button>
      )}
      
      {test.canViewContent && (
        <button className="btn-secondary">View Content</button>
      )}
    </div>
  </div>
);
```

### **Admin Test Management Example**

```javascript
// Create test with date assignments
const createTestWithDates = async (testData, dateAssignments) => {
  const formData = new FormData();
  
  // Basic test data
  formData.append('title', testData.title);
  formData.append('referenceText', testData.referenceText);
  formData.append('testType', testData.testType);
  formData.append('difficulty', testData.difficulty);
  
  // Date assignments
  formData.append('assignedDays', JSON.stringify(dateAssignments));
  
  const response = await fetch('/api/v1/test', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: formData
  });
  
  return response.json();
};

// Block test
const blockTest = async (testId, reason) => {
  const response = await fetch(`/api/v1/test/${testId}/block`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });
  
  return response.json();
};

// Assign test to additional dates
const assignTestToDates = async (testId, dateAssignments) => {
  const response = await fetch(`/api/v1/test/${testId}/assign-dates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dateAssignments })
  });
  
  return response.json();
};
```

---

## 🚨 **Breaking Changes**

### **Student Dashboard API Response**

**BEFORE:**
```javascript
{
  currentDayTest: {
    test: { /* single test object */ },
    canTakeTest: boolean,
    assignedBatch: object
  }
}
```

**AFTER:**
```javascript
{
  currentDayTest: {
    primaryTest: { /* recommended test with metadata */ },
    allTestsForToday: [ /* array of all available tests */ ],
    totalTestsAvailable: number
  }
}
```

### **Migration Guide for Frontend**

```javascript
// Backward compatibility wrapper
const adaptDashboardData = (newData) => {
  const { currentDayTest } = newData;
  
  // For legacy code expecting single test
  const legacyFormat = {
    test: currentDayTest.primaryTest?.test || null,
    canTakeTest: currentDayTest.primaryTest?.canTakeTest || false,
    assignedBatch: currentDayTest.primaryTest?.assignedBatch || null
  };
  
  // New format with all tests
  const enhancedFormat = {
    primaryTest: currentDayTest.primaryTest,
    allTests: currentDayTest.allTestsForToday,
    totalCount: currentDayTest.totalTestsAvailable
  };
  
  return { legacy: legacyFormat, enhanced: enhancedFormat };
};
```

---

## ✅ **Testing Checklist**

### **API Testing**
- [ ] Test creation with date assignments
- [ ] Test blocking/unblocking
- [ ] Date assignment management
- [ ] Student dashboard with multiple tests
- [ ] Error handling for all endpoints

### **Database Testing**
- [ ] Verify new schema fields
- [ ] Test indexes performance
- [ ] Validate virtual properties
- [ ] Check instance methods

### **Integration Testing**
- [ ] Frontend displays multiple tests
- [ ] Admin can manage test blocking
- [ ] Priority ordering works correctly
- [ ] Blocked test behavior is correct

### **Edge Cases**
- [ ] No tests available for student
- [ ] All tests blocked for a day
- [ ] Multiple tests with same priority
- [ ] Invalid date assignments
- [ ] Batch capacity exceeded

---

This modification document provides a comprehensive overview of all changes made to support the enhanced test management system with multiple tests per day, admin blocking, and flexible date-based assignments.
