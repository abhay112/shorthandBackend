# 🚀 Smart API Documentation - Shorthand Stenography Platform

## 🎯 System Overview

**Shorthand Stenography Test Platform** is a comprehensive educational assessment system designed for stenography training institutions. The platform enables:

- **Real-time stenography testing** with audio dictation
- **Detailed performance analytics** (WPM, accuracy, error tracking)
- **Batch-based student management** with role-based access
- **Progressive skill assessment** with retake capabilities
- **Administrative dashboard** for comprehensive oversight

---

## 🏗️ Architecture & Design Patterns

### **Service Layer Pattern**
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic and data operations
- **Models**: MongoDB schemas with Mongoose ODM
- **Middleware**: Authentication, authorization, logging, error handling

### **Security Architecture**
- **Firebase Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Student, Admin, Super Admin roles
- **Request Rate Limiting**: 100 requests per 15 minutes
- **Security Headers**: Helmet.js implementation
- **Input Validation**: Comprehensive data validation

### **Database Design**
- **MongoDB**: NoSQL database for flexibility
- **Indexing Strategy**: Optimized queries for performance
- **Relationship Management**: Population-based references
- **Audit Trail**: Timestamps and change tracking

---

## 🔐 Authentication System

### **Firebase Integration**
The system uses Firebase for authentication with custom role management:

```javascript
// Authentication Flow
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### **Role Hierarchy**
1. **Student**: Default role, requires approval for test access
2. **Admin**: Can manage students and batches
3. **Super Admin**: Full system access

### **Session Management**
- **HTTP-only cookies** for secure session storage
- **24-hour session expiry** with automatic refresh
- **Device tracking** for security monitoring

---

## 📊 Core API Endpoints

### **🎓 Student Management**

#### **Profile & Dashboard**
```http
GET    /api/v1/students/profile          # Get student profile
PATCH  /api/v1/students/profile          # Update profile
GET    /api/v1/students/dashboard        # Student dashboard
GET    /api/v1/students/statistics       # Performance statistics
GET    /api/v1/students/status           # Approval/block status
```

#### **Test Management**
```http
GET    /api/v1/students/test/current     # Get current day's test
GET    /api/v1/students/test/upcoming    # Get upcoming tests
GET    /api/v1/students/test/:id/access  # Check test access
POST   /api/v1/students/test/:id/start   # Start test session
POST   /api/v1/students/test/:sessionId/end    # Submit test results
POST   /api/v1/students/test/:sessionId/pause  # Pause test session
POST   /api/v1/students/test/:sessionId/resume # Resume test session
```

#### **Results & Rankings**
```http
GET    /api/v1/students/results          # Get test results (paginated)
GET    /api/v1/students/results/:id      # Get specific result
GET    /api/v1/students/rankings         # Personal rankings
GET    /api/v1/students/batch/:id/leaderboard # Batch leaderboard
```

### **👨‍💼 Admin Management**

#### **Student Administration**
```http
GET    /api/v1/admin/students            # List all students
GET    /api/v1/admin/students/:id        # Get student details
POST   /api/v1/admin/students/approve    # Approve/disapprove student
POST   /api/v1/admin/students/block      # Block/unblock student
POST   /api/v1/admin/students/assign-batch # Assign student to batch
```

#### **Test Administration**
```http
POST   /api/v1/admin/tests               # Create new test
GET    /api/v1/admin/tests               # List all tests
GET    /api/v1/admin/tests/:id           # Get test details
PUT    /api/v1/admin/tests/:id           # Update test
DELETE /api/v1/admin/tests/:id           # Delete test
POST   /api/v1/admin/tests/:id/assign-batches # Assign test to batches
```

#### **Batch Management**
```http
POST   /api/v1/admin/batches             # Create batch
GET    /api/v1/admin/batches             # List batches
GET    /api/v1/admin/batches/:id         # Get batch details
PUT    /api/v1/admin/batches/:id         # Update batch
DELETE /api/v1/admin/batches/:id         # Delete batch
```

#### **Analytics & Reporting**
```http
GET    /api/v1/admin/dashboard           # Admin dashboard
GET    /api/v1/admin/analytics/overview # System overview
GET    /api/v1/admin/reports/performance # Performance reports
GET    /api/v1/admin/reports/batch/:id  # Batch-specific reports
```

---

## 📋 Data Models

### **Student Model**
```javascript
{
  firebaseUid: "unique_firebase_id",
  name: "Student Name",
  email: "student@example.com",
  role: "student",
  isApproved: false,        // Requires admin approval
  isBlocked: false,         // Admin can block access
  isOnlineMode: true,       // Online/offline test mode
  assignedBatches: [ObjectId],
  results: [ObjectId],
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **Test Model**
```javascript
{
  title: "Test Title",
  description: "Test Description",
  audioURL: "path/to/audio.mp3",
  referenceText: "Expected stenography text",
  
  // Test Configuration
  difficulty: "intermediate",    // beginner|intermediate|advanced|expert
  category: "comprehensive",     // dictation|transcription|speed_test|accuracy_test|comprehensive
  duration: 300,                // seconds
  maxRetakes: 3,
  
  // Day-wise Assignment
  assignedDays: [{
    batchId: ObjectId,
    day: 1,                     // Day number in batch
    date: Date,
    isActive: true
  }],
  
  // Test Settings
  settings: {
    allowPause: true,
    maxPauses: 3,
    showTimer: true,
    showProgress: true,
    autoSubmit: true
  },
  
  // Statistics
  statistics: {
    totalAttempts: 0,
    averageWpm: 0,
    averageAccuracy: 0,
    completionRate: 0
  },
  
  uploadedBy: ObjectId,         // Admin who created
  isActive: true,
  isPublished: false,
  availableFrom: Date,
  availableUntil: Date
}
```

### **Result Model**
```javascript
{
  studentId: ObjectId,
  batchId: ObjectId,
  testId: ObjectId,
  
  // Performance Metrics
  wpm: 45,                      // Words per minute
  accuracy: 92.5,               // Percentage accuracy
  speed: 180,                   // Characters per minute
  
  // Detailed Metrics
  totalWords: 150,
  correctWords: 139,
  incorrectWords: 11,
  totalCharacters: 750,
  correctCharacters: 694,
  incorrectCharacters: 56,
  
  // Time Tracking
  timeTaken: 300,               // seconds
  timeStarted: Date,
  timeCompleted: Date,
  
  // Retake Information
  attemptNumber: 1,
  isRetake: false,
  
  // Error Analysis
  mistakes: [{
    word: "expected",
    typed: "expectd",
    position: 15,
    timestamp: Date
  }],
  
  stenographyErrors: [{
    type: "omission",           // substitution|omission|insertion|transposition|punctuation
    original: "expected",
    typed: "expectd",
    position: 15,
    severity: "minor"           // minor|major|critical
  }],
  
  // Session & Status
  sessionId: "unique_session_id",
  status: "completed",          // in_progress|completed|abandoned
  isValid: true,
  
  // Ranking
  rank: 5,
  percentile: 85.2,
  
  submittedAt: Date
}
```

### **Batch Model**
```javascript
{
  name: "Batch 2024-A",
  description: "Morning batch for beginners",
  createdBy: ObjectId,          // Admin who created
  students: [ObjectId],         // Assigned students
  tests: [ObjectId],            // Assigned tests
  isActive: true,
  startDate: Date,
  endDate: Date,
  maxStudents: 50,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔄 API Request/Response Patterns

### **Standard Response Format**
```javascript
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {              // For paginated responses
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### **Error Response Format**
```javascript
{
  "success": false,
  "message": "Error description",
  "stack": "Error stack trace (development only)"
}
```

### **Authentication Headers**
```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

---

## 🧪 Test Session Workflow

### **1. Session Initialization**
```http
POST /api/v1/students/test/:testId/start
```
**Response:**
```javascript
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "uuid-session-id",
      "testId": "test_id",
      "studentId": "student_id",
      "startTime": "2024-01-15T10:00:00Z",
      "expiresAt": "2024-01-15T10:05:00Z",
      "attemptNumber": 1,
      "maxRetakes": 3,
      "canPause": true,
      "maxPauses": 3
    }
  }
}
```

### **2. Session Management**
```http
POST /api/v1/students/test/:sessionId/pause
POST /api/v1/students/test/:sessionId/resume
```

### **3. Test Submission**
```http
POST /api/v1/students/test/:sessionId/end
```
**Request Body:**
```javascript
{
  "wpm": 45,
  "accuracy": 92.5,
  "speed": 180,
  "totalWords": 150,
  "correctWords": 139,
  "incorrectWords": 11,
  "totalCharacters": 750,
  "correctCharacters": 694,
  "incorrectCharacters": 56,
  "mistakes": [
    {
      "word": "expected",
      "typed": "expectd",
      "position": 15,
      "timestamp": "2024-01-15T10:02:30Z"
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
```

---

## 📈 Performance & Scalability Features

### **Database Optimization**
- **Compound Indexes**: Optimized for common query patterns
- **Aggregation Pipelines**: Efficient data processing
- **Connection Pooling**: MongoDB connection optimization
- **Selective Population**: Only necessary fields loaded

### **Caching Strategy** (Ready for Implementation)
- **Redis Integration**: Session and frequently accessed data
- **Query Result Caching**: Reduce database load
- **Static Asset Caching**: Improved response times

### **Monitoring & Logging**
- **Winston Logger**: Structured logging with multiple transports
- **Request Tracking**: Comprehensive request/response logging
- **Performance Metrics**: Response time and throughput monitoring
- **Error Tracking**: Detailed error logging and stack traces

---

## 🔒 Security Implementation

### **Authentication Security**
- **Firebase Token Verification**: Server-side token validation
- **Session Management**: Secure HTTP-only cookies
- **Token Expiration**: Automatic session management
- **Device Tracking**: Security monitoring capabilities

### **Application Security**
- **Helmet.js**: Security headers implementation
- **CORS Configuration**: Cross-origin request management
- **Rate Limiting**: DDoS protection (100 req/15min)
- **Input Validation**: Comprehensive data sanitization
- **SQL Injection Prevention**: Mongoose ODM protection

### **Data Protection**
- **Sensitive Data Filtering**: Firebase UIDs excluded from responses
- **Role-Based Access**: Granular permission system
- **Audit Logging**: Complete operation tracking
- **Secure File Uploads**: Audio file validation and storage

---

## 🚀 Advanced Features

### **Real-time Capabilities** (Ready for WebSocket)
- **Live Test Monitoring**: Real-time progress tracking
- **Instant Notifications**: Test reminders and updates
- **Live Leaderboards**: Dynamic ranking updates

### **Analytics & Reporting**
- **Performance Trends**: Historical analysis
- **Batch Comparisons**: Comparative analytics
- **Error Pattern Analysis**: Learning insights
- **Progress Tracking**: Individual and group progress

### **Mobile Optimization**
- **Responsive API Design**: Mobile-friendly endpoints
- **Optimized Payloads**: Minimal data transfer
- **Offline Capability**: Ready for offline test mode

---

## 🔧 Environment Configuration

### **Development Setup**
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/shorthand-test
SECRET_KEY=your-secret-key
SESSION_SECRET=your-session-secret

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=client-id
```

### **Production Considerations**
- **HTTPS Enforcement**: Secure cookie settings
- **Environment Variables**: Secure credential management
- **Database Clustering**: MongoDB replica sets
- **Load Balancing**: Multiple server instances
- **CDN Integration**: Static asset delivery

---

## 📚 API Usage Examples

### **Student Registration & Login**
```javascript
// Register new student
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: firebaseIdToken,
    role: 'student'
  })
});

// Login existing student
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: firebaseIdToken
  })
});
```

### **Starting a Test Session**
```javascript
const startTestResponse = await fetch('/api/v1/students/test/test_id/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  }
});

const { session } = await startTestResponse.json();
```

### **Submitting Test Results**
```javascript
const submitResponse = await fetch(`/api/v1/students/test/${sessionId}/end`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    wpm: 45,
    accuracy: 92.5,
    speed: 180,
    totalWords: 150,
    correctWords: 139,
    incorrectWords: 11,
    totalCharacters: 750,
    correctCharacters: 694,
    incorrectCharacters: 56,
    mistakes: [/* mistake objects */],
    stenographyErrors: [/* error objects */]
  })
});
```

### **Admin Operations**
```javascript
// Approve student
const approveResponse = await fetch('/api/v1/admin/students/approve', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studentId: 'student_id',
    isApproved: true
  })
});

// Create new test
const createTestResponse = await fetch('/api/v1/admin/tests', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'multipart/form-data'
  },
  body: formData // Contains title, referenceText, audioFile, duration
});
```

---

## 🔄 Migration & Deployment

### **Database Migration**
```javascript
// Run migration scripts for existing data
npm run migrate

// Seed database with sample data
npm run seed
```

### **Deployment Commands**
```bash
# Development
npm run dev

# Production
npm start

# With PM2 (recommended)
pm2 start src/app.js --name "shorthand-api"
```

---

## 📊 Monitoring & Health Checks

### **Health Check Endpoints**
```http
GET /                          # Basic health check
GET /api/v1/health            # Detailed system health
GET /api/v1/auth/verify       # Authentication health
```

### **Logging Levels**
- **Error**: System errors and exceptions
- **Warn**: Warning messages and deprecated usage
- **Info**: General application information
- **HTTP**: Request/response logging
- **Debug**: Detailed debugging information (development)

---

This documentation provides a comprehensive overview of your Shorthand Stenography Platform API. The system is well-architected with modern patterns and ready for production deployment with additional improvements as outlined in the suggestions below.
