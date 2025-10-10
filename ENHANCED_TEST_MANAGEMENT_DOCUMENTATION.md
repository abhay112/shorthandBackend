# Enhanced Test Management System Documentation

## 🚀 **Major System Enhancement: Multi-Test Daily Assignment & Admin Blocking**

This document outlines the comprehensive enhancement made to the test management system to support multiple tests per day, date-based assignments, and admin blocking functionality.

---

## 📋 **Overview of Changes**

### **Core Features Added:**
1. **✅ Multiple Tests Per Day**: Students can now have multiple tests assigned for the same day
2. **✅ Date-Based Test Assignment**: Tests can be assigned to specific dates with priority levels
3. **✅ Admin Test Blocking**: Admins can block tests while allowing content viewing
4. **✅ Enhanced Test Types**: Support for curriculum, practice, assessment, and special test types
5. **✅ Priority System**: Tests can be prioritized (1-10 scale) for better organization
6. **✅ Time Windows**: Specific availability windows for individual test assignments

---

## 🔧 **Technical Implementation**

### **1. Enhanced Test Model (`src/models/Test.js`)**

#### **New Fields Added:**

```javascript
// Test type classification
testType: {
  type: String,
  enum: ['curriculum', 'practice', 'assessment', 'special'],
  default: 'practice'
}

// Enhanced day assignments with multiple tests support
assignedDays: [{
  batchId: ObjectId,           // Required: Which batch
  assignedDate: Date,          // Required: Specific date
  dayNumber: Number,           // Optional: Day number (1-365)
  priority: Number,            // Priority level (1-10, higher = more important)
  isActive: Boolean,           // Can be disabled individually
  availableFrom: Date,         // Optional: Specific start time
  availableUntil: Date,        // Optional: Specific end time
  assignedBy: ObjectId,        // Admin who made the assignment
  assignedAt: Date             // When assignment was made
}]

// Admin blocking functionality
isBlocked: Boolean,            // Whether test is blocked
blockedBy: ObjectId,           // Admin who blocked it
blockedAt: Date,               // When it was blocked
blockReason: String,           // Reason for blocking
allowViewWhenBlocked: Boolean  // Can students view content when blocked
```

#### **New Virtual Properties:**

```javascript
// Check if test is available for taking
test.isCurrentlyAvailable  // Boolean

// Check if content can be viewed (even when blocked)
test.canViewContent        // Boolean

// Get current status
test.status               // 'available', 'blocked', 'inactive', 'draft', 'unavailable'
```

#### **New Methods:**

```javascript
// Check if test is available on a specific date for a batch
test.isAvailableOnDate(date, batchId)  // Boolean
```

### **2. Enhanced Test Controller (`src/controllers/testController.js`)**

#### **Updated Create Test API:**

```javascript
POST /api/v1/test

// New parameters supported:
{
  "title": "Test Title",
  "referenceText": "Test content",
  "description": "Optional description",
  "testType": "curriculum|practice|assessment|special",
  "difficulty": "beginner|intermediate|advanced|expert",
  "category": "dictation|transcription|speed_test|accuracy_test|comprehensive",
  "duration": 300,
  "maxRetakes": 3,
  "availableFrom": "2024-01-15T09:00:00Z",
  "availableUntil": "2024-01-15T17:00:00Z",
  "assignedDays": "[{\"batchId\":\"...\",\"assignedDate\":\"2024-01-15\",\"priority\":5}]",
  "assignedBatches": "[\"batch1\",\"batch2\"]"
}
```

#### **New API Endpoints:**

```javascript
// Block/Unblock Tests
POST   /api/v1/test/:id/block      // Block test with optional reason
POST   /api/v1/test/:id/unblock    // Unblock test

// Date Assignment Management
POST   /api/v1/test/:id/assign-dates    // Assign test to specific dates
DELETE /api/v1/test/:id/remove-dates    // Remove test from specific dates
```

### **3. Enhanced Test Service (`src/services/testService.js`)**

#### **New Service Methods:**

```javascript
// Blocking functionality
testService.blockTest(testId, adminId, reason)
testService.unblockTest(testId, adminId)

// Date assignment management
testService.assignTestToDates(testId, dateAssignments, adminId)
testService.removeTestFromDates(testId, assignmentIds)
testService.getTestsForDate(date, batchId)
```

### **4. Enhanced Student Service (`src/services/studentService.js`)**

#### **Updated `getCurrentDayTest` Method:**

**Before (Single Test):**
```javascript
return {
  test: { /* single test */ },
  canTakeTest: boolean,
  assignedBatch: batch
}
```

**After (Multiple Tests Support):**
```javascript
return {
  primaryTest: { /* highest priority test */ },
  allTestsForToday: [
    {
      test: { /* test details */ },
      canTakeTest: boolean,
      canViewContent: boolean,
      assignedBatch: batch,
      priority: number,
      isBlocked: boolean,
      blockReason: string
    }
  ],
  totalTestsAvailable: number
}
```

---

## 📊 **Usage Examples**

### **1. Creating a Test with Date Assignments**

```javascript
// Frontend form data
const formData = new FormData();
formData.append('title', 'Daily Typing Practice');
formData.append('referenceText', 'Quick brown fox...');
formData.append('testType', 'curriculum');
formData.append('difficulty', 'intermediate');

// Multiple date assignments
const dateAssignments = [
  {
    batchId: "batch123",
    assignedDate: "2024-01-15",
    priority: 5,
    availableFrom: "2024-01-15T09:00:00Z",
    availableUntil: "2024-01-15T17:00:00Z"
  },
  {
    batchId: "batch456", 
    assignedDate: "2024-01-16",
    priority: 3
  }
];

formData.append('assignedDays', JSON.stringify(dateAssignments));

// API call
fetch('/api/v1/test', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: formData
});
```

### **2. Blocking a Test**

```javascript
// Block test with reason
fetch('/api/v1/test/test123/block', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Test content needs review'
  })
});
```

### **3. Assigning Test to Multiple Dates**

```javascript
// Add test to additional dates
fetch('/api/v1/test/test123/assign-dates', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dateAssignments: [
      {
        batchId: "batch789",
        assignedDate: "2024-01-20",
        priority: 8,
        availableFrom: "2024-01-20T10:00:00Z",
        availableUntil: "2024-01-20T16:00:00Z"
      }
    ]
  })
});
```

### **4. Student Dashboard - Multiple Tests**

```javascript
// Student gets multiple tests for today
const response = await fetch('/api/v1/students/dashboard');
const data = await response.json();

console.log(data.currentDayTest);
// Output:
{
  primaryTest: {
    test: { id: "test1", title: "Morning Practice", priority: 8 },
    canTakeTest: true,
    canViewContent: true,
    isBlocked: false
  },
  allTestsForToday: [
    {
      test: { id: "test1", title: "Morning Practice", priority: 8 },
      canTakeTest: true,
      canViewContent: true,
      isBlocked: false
    },
    {
      test: { id: "test2", title: "Afternoon Assessment", priority: 5 },
      canTakeTest: false,  // Maybe already taken
      canViewContent: true,
      isBlocked: false
    },
    {
      test: { id: "test3", title: "Blocked Test", priority: 3 },
      canTakeTest: false,  // Blocked by admin
      canViewContent: true, // Can still view content
      isBlocked: true,
      blockReason: "Under review"
    }
  ],
  totalTestsAvailable: 3
}
```

---

## 🔄 **Database Migration Required**

### **Existing Data Compatibility**

The enhanced system is **backward compatible** with existing data:

1. **Existing `assignedDays`**: Old format will continue to work
2. **New fields have defaults**: No data corruption
3. **Gradual migration**: Can update tests incrementally

### **Migration Script**

```javascript
// Optional: Convert old assignedDays format to new format
db.tests.updateMany(
  { "assignedDays.date": { $exists: true } },
  [{
    $set: {
      "assignedDays": {
        $map: {
          input: "$assignedDays",
          as: "day",
          in: {
            batchId: "$$day.batchId",
            assignedDate: "$$day.date",
            dayNumber: "$$day.day",
            priority: 1,
            isActive: { $ifNull: ["$$day.isActive", true] },
            assignedAt: new Date()
          }
        }
      }
    }
  }]
);
```

---

## 🎯 **Frontend Integration Guide**

### **1. Admin Test Management Interface**

```javascript
// Test creation form
<form onSubmit={handleCreateTest}>
  <input name="title" placeholder="Test Title" required />
  <textarea name="referenceText" placeholder="Test Content" required />
  
  <select name="testType">
    <option value="practice">Practice</option>
    <option value="curriculum">Curriculum</option>
    <option value="assessment">Assessment</option>
    <option value="special">Special</option>
  </select>
  
  {/* Date assignments */}
  <div className="date-assignments">
    {dateAssignments.map((assignment, index) => (
      <div key={index}>
        <select name={`batch-${index}`} value={assignment.batchId}>
          {batches.map(batch => (
            <option key={batch.id} value={batch.id}>{batch.name}</option>
          ))}
        </select>
        <input 
          type="date" 
          name={`date-${index}`}
          value={assignment.assignedDate}
        />
        <input 
          type="number" 
          name={`priority-${index}`}
          min="1" max="10"
          value={assignment.priority}
          placeholder="Priority"
        />
      </div>
    ))}
    <button type="button" onClick={addDateAssignment}>
      Add Date Assignment
    </button>
  </div>
  
  <button type="submit">Create Test</button>
</form>
```

### **2. Student Dashboard Interface**

```javascript
// Display multiple tests for today
const StudentDashboard = ({ currentDayTest }) => {
  if (!currentDayTest || currentDayTest.totalTestsAvailable === 0) {
    return <div>No tests available for today</div>;
  }

  return (
    <div className="student-dashboard">
      <h2>Today's Tests ({currentDayTest.totalTestsAvailable})</h2>
      
      {/* Primary test - highest priority */}
      <div className="primary-test">
        <h3>🎯 Recommended Test</h3>
        <TestCard 
          test={currentDayTest.primaryTest}
          isPrimary={true}
        />
      </div>

      {/* All tests for today */}
      <div className="all-tests">
        <h3>📚 All Available Tests</h3>
        {currentDayTest.allTestsForToday.map((testData, index) => (
          <TestCard 
            key={testData.test.id}
            test={testData}
            isPrimary={index === 0}
          />
        ))}
      </div>
    </div>
  );
};

const TestCard = ({ test, isPrimary }) => (
  <div className={`test-card ${isPrimary ? 'primary' : ''} ${test.isBlocked ? 'blocked' : ''}`}>
    <h4>{test.test.title}</h4>
    <p>Priority: {test.priority}/10</p>
    <p>Duration: {test.test.duration}s</p>
    
    {test.isBlocked && (
      <div className="blocked-notice">
        🚫 Test Blocked: {test.blockReason}
      </div>
    )}
    
    <div className="test-actions">
      {test.canTakeTest ? (
        <button className="btn-primary">Take Test</button>
      ) : (
        <button disabled>Cannot Take</button>
      )}
      
      {test.canViewContent && (
        <button className="btn-secondary">View Content</button>
      )}
    </div>
  </div>
);
```

### **3. Admin Test Blocking Interface**

```javascript
const TestManagement = ({ tests }) => (
  <div className="test-management">
    {tests.map(test => (
      <div key={test.id} className="test-item">
        <h4>{test.title}</h4>
        <span className={`status ${test.status}`}>{test.status}</span>
        
        <div className="test-actions">
          {test.isBlocked ? (
            <button onClick={() => unblockTest(test.id)}>
              Unblock Test
            </button>
          ) : (
            <button onClick={() => showBlockDialog(test.id)}>
              Block Test
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
);

const BlockTestDialog = ({ testId, onBlock }) => {
  const [reason, setReason] = useState('');
  
  const handleBlock = () => {
    onBlock(testId, reason);
  };
  
  return (
    <dialog>
      <h3>Block Test</h3>
      <textarea 
        placeholder="Reason for blocking (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div>
        <button onClick={handleBlock}>Block Test</button>
        <button onClick={closeDialog}>Cancel</button>
      </div>
    </dialog>
  );
};
```

---

## 🔒 **Security & Permissions**

### **Admin-Only Operations:**
- ✅ Create tests with date assignments
- ✅ Block/unblock tests
- ✅ Manage date assignments
- ✅ View all test statuses

### **Student Permissions:**
- ✅ View available tests (respects blocking)
- ✅ Take tests (only if not blocked and conditions met)
- ✅ View test content (if `allowViewWhenBlocked` is true)
- ❌ Cannot see admin-only metadata (block reasons, etc.)

---

## 📈 **Performance Considerations**

### **Database Indexes Added:**
```javascript
// Test collection indexes
{ "testType": 1 }
{ "isActive": 1, "isPublished": 1, "isBlocked": 1 }
{ "assignedDays.batchId": 1, "assignedDays.assignedDate": 1 }
{ "assignedDays.dayNumber": 1, "assignedDays.priority": -1 }
```

### **Query Optimization:**
- **Compound queries** for efficient test discovery
- **Lean queries** for better memory usage
- **Proper sorting** by priority and date
- **Indexed fields** for fast lookups

---

## 🧪 **Testing Scenarios**

### **1. Multiple Tests Per Day**
```bash
# Test: Student gets multiple tests for same date
1. Create 3 tests assigned to same batch and date
2. Call /api/v1/students/dashboard
3. Verify all 3 tests returned in allTestsForToday
4. Verify highest priority test is primaryTest
```

### **2. Test Blocking**
```bash
# Test: Blocked test behavior
1. Create and assign test to student
2. Block test with reason
3. Call student dashboard
4. Verify canTakeTest = false, canViewContent = true
5. Verify blockReason is present
```

### **3. Priority Ordering**
```bash
# Test: Tests sorted by priority
1. Create tests with priorities: 3, 8, 5
2. Assign all to same date/batch
3. Call student dashboard
4. Verify tests ordered: 8, 5, 3
```

### **4. Date Assignment Management**
```bash
# Test: Add/remove date assignments
1. Create test
2. Assign to multiple dates using /assign-dates
3. Verify assignments created
4. Remove some assignments using /remove-dates
5. Verify assignments removed
```

---

## 🚨 **Breaking Changes**

### **API Response Changes:**

#### **Student Dashboard Response:**
**Before:**
```javascript
{
  currentDayTest: {
    test: { /* single test */ },
    canTakeTest: boolean,
    assignedBatch: batch
  }
}
```

**After:**
```javascript
{
  currentDayTest: {
    primaryTest: { /* recommended test */ },
    allTestsForToday: [/* array of tests */],
    totalTestsAvailable: number
  }
}
```

### **Migration Guide for Frontend:**

```javascript
// Update frontend code to handle new response format
const handleDashboardData = (data) => {
  const { currentDayTest } = data;
  
  if (!currentDayTest) return;
  
  // For backward compatibility, use primaryTest as main test
  const mainTest = currentDayTest.primaryTest;
  
  // New feature: Show all tests available
  const allTests = currentDayTest.allTestsForToday;
  
  // Display logic here...
};
```

---

## 📚 **API Documentation Summary**

### **New Endpoints:**
```
POST   /api/v1/test                    # Enhanced with date assignments
POST   /api/v1/test/:id/block          # Block test
POST   /api/v1/test/:id/unblock        # Unblock test
POST   /api/v1/test/:id/assign-dates   # Assign to dates
DELETE /api/v1/test/:id/remove-dates   # Remove from dates
```

### **Updated Endpoints:**
```
GET    /api/v1/students/dashboard      # Now returns multiple tests
```

---

## 🎉 **Benefits Achieved**

1. **✅ Flexibility**: Multiple tests per day support
2. **✅ Control**: Admin blocking with content viewing
3. **✅ Organization**: Priority-based test ordering
4. **✅ Scheduling**: Date-specific assignments with time windows
5. **✅ Scalability**: Supports various test types and strategies
6. **✅ User Experience**: Students see all available options
7. **✅ Admin Power**: Granular control over test availability

---

## 🔮 **Future Enhancements**

### **Potential Additions:**
1. **Conditional Tests**: Tests that unlock based on previous results
2. **Test Sequences**: Ordered test progressions
3. **Time-based Auto-blocking**: Automatic test blocking based on schedules
4. **Student Preferences**: Let students choose from available tests
5. **Group Tests**: Tests assigned to student groups within batches
6. **Analytics**: Detailed reporting on test assignments and blocking

---

This enhanced test management system provides a robust foundation for flexible, scalable test administration while maintaining backward compatibility and providing powerful new features for both administrators and students.
