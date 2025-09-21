# Shorthand Typing Test Backend

A comprehensive backend API for the Shorthand Typing Test application with Firebase authentication, role-based authorization, and scalable architecture.

## 🚀 Features

- **Firebase Authentication**: Secure user authentication with Firebase
- **Role-Based Authorization**: Student, Admin, and Super Admin roles
- **Comprehensive Logging**: Winston-based logging system with file and console outputs
- **Error Handling**: Centralized error handling with custom error classes
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Scalable Architecture**: Service layer pattern with proper separation of concerns
- **Request Logging**: Morgan-based HTTP request logging
- **Cookie-based Sessions**: Secure HTTP-only cookies for authentication

## 🏗️ Architecture

### Project Structure
```
src/
├── config/           # Configuration files
├── controllers/     # Request handlers
├── middlewares/     # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic layer
├── utils/           # Utility functions
└── views/           # Template files
```

### Key Components

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and database operations
- **Middleware**: Authentication, authorization, logging, and error handling
- **Models**: MongoDB schemas with Mongoose
- **Utils**: Reusable utility functions and error handling

## 🛠️ Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Firebase project with Authentication enabled

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Environment Configuration:**
Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/shorthand-typing-test

# Security
SECRET_KEY=your-secret-key-here
SESSION_SECRET=your-session-secret-here

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-firebase-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_CLIENT_ID=your-firebase-client-id
```

3. **Start the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔐 Authentication & Authorization

### Firebase Integration
- Users authenticate with Firebase ID tokens
- Tokens are verified server-side for security
- User data is stored in MongoDB for application-specific information

### Role System
- **Student**: Default role for new users
- **Admin**: Can manage students and view dashboard
- **Super Admin**: Full administrative access

### Middleware Stack
1. **Authentication**: Verifies Firebase tokens
2. **Authorization**: Checks user roles and permissions
3. **Approval**: Ensures students are approved before accessing tests
4. **Logging**: Records all requests and user actions

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/v1/auth/login     # Login with Firebase token
POST /api/v1/auth/logout    # Logout and clear session
GET  /api/v1/auth/me        # Get current user profile
GET  /api/v1/auth/verify    # Verify authentication token
```

### Admin Endpoints (Admin/Super Admin only)
```
GET  /api/v1/admin/students           # Get all students
GET  /api/v1/admin/students/:id       # Get student by ID
POST /api/v1/admin/students/approve   # Approve/disapprove student
POST /api/v1/admin/assign-shift        # Assign shift to student
POST /api/v1/admin/block              # Block/unblock student
GET  /api/v1/admin/dashboard          # Get dashboard statistics
```

### Student Endpoints (Student role + approval required for tests)
```
GET   /api/v1/student/profile         # Get student profile
PATCH /api/v1/student/profile         # Update student profile
GET   /api/v1/student/results         # Get test results
GET   /api/v1/student/shifts          # Get assigned shifts
GET   /api/v1/student/progress        # Get progress summary
GET   /api/v1/student/status           # Check approval status
GET   /api/v1/student/test/current     # Get current test
POST  /api/v1/student/test/submit     # Submit test result
```

## 🗄️ Database Models

### Student Model
```javascript
{
  firebaseUid: String,      // Firebase user ID
  name: String,             // Student name
  email: String,            // Student email
  role: String,            // User role (student/admin)
  isApproved: Boolean,     // Admin approval status
  isBlocked: Boolean,      // Block status
  assignedShifts: [ObjectId], // Assigned shifts
  results: [ObjectId],     // Test results
  lastLogin: Date,         // Last login timestamp
  createdAt: Date,         // Account creation date
  updatedAt: Date          // Last update date
}
```

### Admin Model
```javascript
{
  firebaseUid: String,      // Firebase user ID
  name: String,            // Admin name
  email: String,           // Admin email
  role: String,            // Admin role (admin/super_admin)
  isActive: Boolean,       // Active status
  lastLogin: Date,         // Last login timestamp
  createdAt: Date,        // Account creation date
  updatedAt: Date         // Last update date
}
```

## 🔒 Security Features

### Authentication Security
- Firebase token verification
- HTTP-only cookies
- Secure cookie settings for production
- Token expiration handling

### Application Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- SQL injection prevention through Mongoose

### Logging & Monitoring
- Comprehensive request logging
- Error tracking with stack traces
- User action logging
- Performance monitoring

## 🚨 Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "stack": "Error stack (development only)"
}
```

### Error Types
- **Validation Errors**: 400 Bad Request
- **Authentication Errors**: 401 Unauthorized
- **Authorization Errors**: 403 Forbidden
- **Not Found Errors**: 404 Not Found
- **Server Errors**: 500 Internal Server Error

## 📊 Logging System

### Log Levels
- **Error**: System errors and exceptions
- **Warn**: Warning messages
- **Info**: General information
- **HTTP**: HTTP request logs
- **Debug**: Debug information (development only)

### Log Files
- `logs/error.log`: Error logs only
- `logs/combined.log`: All logs
- Console output with colors

## 🧪 Development

### Scripts
```bash
npm run dev      # Development mode with nodemon
npm start        # Production mode
npm run seed     # Seed database with fake data
```

### Code Quality
- ESLint configuration
- Consistent error handling
- Service layer pattern
- Proper separation of concerns

## 🚀 Production Deployment

### Environment Variables
Ensure all production environment variables are set:
- `NODE_ENV=production`
- Secure `SECRET_KEY` and `SESSION_SECRET`
- Production MongoDB URI
- Firebase production credentials

### Security Checklist
- [ ] HTTPS enabled
- [ ] Secure cookies configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Logging configured for production

## 📝 Contributing

1. Follow the established architecture patterns
2. Use the service layer for business logic
3. Implement proper error handling
4. Add comprehensive logging
5. Write clear commit messages
6. Test all endpoints thoroughly

## 🐛 Troubleshooting

### Common Issues
1. **Firebase Authentication Errors**: Check Firebase configuration and credentials
2. **Database Connection Issues**: Verify MongoDB URI and network connectivity
3. **CORS Errors**: Ensure frontend URL is correctly configured
4. **Rate Limiting**: Check if requests exceed the rate limit

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and debug logging.
