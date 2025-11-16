# Student API Documentation

## Overview

This document describes the comprehensive student API system for the Shorthand Typing Test application. The system has been completely redesigned with a modular architecture that can scale to handle millions of users.

## Architecture

### Database Models

#### 1. Enhanced Result Model
- **Stenography-specific metrics**: WPM, accuracy, speed, character-level tracking
- **Detailed error tracking**: Word-level and character-level mistakes
- **Retake system**: Tracks attempt numbers and retake history
- **Ranking integration**: Automatic rank and percentile calculation
- **Session tracking**: Links to test sessions for complete audit trail

#### 2. TestSession Model
- **Session management**: Unique session IDs, time tracking, expiration
- **Retake control**: Tracks attempts and enforces retake limits
- **Pause/resume functionality**: Supports test interruption and resumption
- **Device tracking**: IP address, user agent, device information

#### 3. StudentRanking Model
- **Batch-specific rankings**: Rankings within specific batches
- **Test-specific rankings**: Rankings for individual tests
- **Historical tracking**: Previous ranks and rank changes
- **Percentile calculation**: Statistical ranking information

#### 4. Enhanced Test Model
- **Day-wise assignment**: Tests assigned to specific days for batches
- **Difficulty levels**: Beginner, intermediate, advanced, expert
- **Test categories**: Dictation, transcription, speed test, accuracy test, comprehensive
- **Advanced settings**: Pause control, timer display, progress tracking
- **Retake limits**: Configurable maximum retakes per test

## API Endpoints

### Base URL
```
/api/v1/students
```

### Authentication
All endpoints require Firebase authentication with student role authorization.

### Profile Management

#### GET /profile
Get student profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "student_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isApproved": true,
    "isBlocked": false,
    "assignedBatches": [...],
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PATCH /profile
Update student profile.

**Request Body:**
```json
{
  "name": "John Doe"
}
```

### Dashboard

#### GET /dashboard
Get comprehensive dashboard data including:
- Student information
- Current day's test
- Recent results
- Performance statistics
- Rankings
- Upcoming tests

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {...},
    "currentTest": {
      "test": {
        "id": "test_id",
        "title": "Test Title",
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
    },
    "recentResults": [...],
    "statistics": {
      "totalTests": 15,
      "averageWpm": 45.5,
      "averageAccuracy": 92.3,
      "bestWpm": 65.2,
      "bestAccuracy": 98.1,
      "totalTimeSpent": 4500,
      "improvementTrend": "improving"
    },
    "rankings": [...],
    "upcomingTests": [...]
  }
}
```

#### GET /statistics
Get detailed performance statistics.

### Test Management

#### GET /tests/current
Get the current day's test for the student.

#### GET /tests/upcoming
Get upcoming tests for the next 7 days.

#### GET /tests/:testId/access
Check if student can take a specific test.

**Response:**
```json
{
  "success": true,
  "data": {
    "canTake": true,
    "remainingAttempts": 2
  }
}
```

### Test Session Management

#### POST /tests/:testId/start
Start a new test session.

**Response:**
```json
{
  "success": true,
  "message": "Test session started successfully",
  "data": {
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
```

#### POST /sessions/:sessionId/end
End a test session and submit results.

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

#### POST /sessions/:sessionId/pause
Pause a test session.

#### POST /sessions/:sessionId/resume
Resume a paused test session.

### Results Management

#### GET /results
Get student's test results with pagination and filtering.

**Query Parameters:**
- `batchId`: Filter by batch ID
- `testId`: Filter by test ID
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `sortBy`: Sort field (default: submittedAt)
- `sortOrder`: Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": [
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
```

#### GET /results/:resultId
Get specific result details.

### Rankings and Leaderboards

#### GET /rankings
Get student's rankings across different tests and batches.

**Query Parameters:**
- `batchId`: Filter by batch ID
- `page`: Page number (default: 1)
- `limit`: Rankings per page (default: 20)

#### GET /batches/:batchId/leaderboard
Get batch leaderboard.

**Query Parameters:**
- `testId`: Filter by specific test ID

**Response:**
```json
{
  "success": true,
  "data": [
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
```

### Batch Management

#### GET /batches
Get student's assigned batches.

### Status and Health Check

#### GET /status
Get student status and approval information.

**Response:**
```json
{
  "success": true,
  "data": {
    "isApproved": true,
    "isBlocked": false,
    "status": "approved",
    "assignedBatches": 2,
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

## Key Features

### 1. Retake System
- Students can retake tests up to 3 times (configurable)
- Each attempt is tracked with attempt numbers
- Retake history is maintained for analysis
- Access control prevents exceeding retake limits

### 2. Ranking System
- Automatic ranking calculation after each test submission
- Batch-specific rankings for each test
- Percentile calculation for statistical analysis
- Historical ranking tracking with rank changes

### 3. Test Session Management
- Unique session IDs for each test attempt
- Time tracking with automatic expiration
- Pause/resume functionality
- Device and IP tracking for security

### 4. Stenography-Specific Metrics
- Words per minute (WPM)
- Character-level accuracy tracking
- Stenography-specific error categorization
- Detailed mistake analysis with timestamps

### 5. Day-wise Test Assignment
- Tests assigned to specific days for batches
- Automatic current test detection
- Upcoming test scheduling
- Batch-specific test access control

### 6. Comprehensive Dashboard
- Single endpoint for all dashboard data
- Performance statistics and trends
- Recent results and rankings
- Current and upcoming tests

## Error Handling

All endpoints return consistent error responses:

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

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `410`: Gone (deprecated endpoint)
- `500`: Internal Server Error

## Security Features

1. **Firebase Authentication**: All endpoints require valid Firebase tokens
2. **Role-based Authorization**: Student role required for all endpoints
3. **Approval System**: Most endpoints require student approval
4. **Session Tracking**: IP address and device information logging
5. **Rate Limiting**: Built-in rate limiting for API protection
6. **Input Validation**: Comprehensive request validation
7. **Audit Logging**: Detailed logging for all operations

## Performance Optimizations

1. **Database Indexing**: Optimized indexes for common queries
2. **Pagination**: All list endpoints support pagination
3. **Selective Population**: Only necessary fields are populated
4. **Caching Strategy**: Ready for Redis integration
5. **Connection Pooling**: MongoDB connection optimization
6. **Query Optimization**: Efficient aggregation pipelines

## Scalability Considerations

1. **Modular Architecture**: Easy to scale individual components
2. **Database Sharding**: Models designed for horizontal scaling
3. **Microservice Ready**: Service layer can be extracted to microservices
4. **Load Balancing**: Stateless design supports load balancing
5. **Caching Layer**: Ready for distributed caching
6. **Queue System**: Background job processing ready

## Monitoring and Logging

1. **Structured Logging**: Winston logger with structured data
2. **Performance Metrics**: Response time and throughput tracking
3. **Error Tracking**: Comprehensive error logging and monitoring
4. **Audit Trail**: Complete audit trail for all operations
5. **Health Checks**: Built-in health check endpoints

## Migration Guide

### From Legacy System

1. **Database Migration**: Run migration scripts to update existing data
2. **API Versioning**: Legacy endpoints marked as deprecated
3. **Gradual Migration**: New endpoints work alongside legacy ones
4. **Data Validation**: Ensure data integrity during migration

### Environment Setup

1. **Dependencies**: Install new dependencies (uuid package)
2. **Database**: Update MongoDB schemas
3. **Configuration**: Update environment variables if needed
4. **Testing**: Run comprehensive test suite

## Testing

The system includes comprehensive testing for:
- Unit tests for service layer
- Integration tests for API endpoints
- Database model validation
- Authentication and authorization
- Error handling scenarios
- Performance testing

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live updates
2. **Advanced Analytics**: Machine learning for performance prediction
3. **Mobile App Support**: Optimized endpoints for mobile applications
4. **Offline Support**: Offline test taking with sync capabilities
5. **Advanced Reporting**: Detailed performance reports and insights
6. **Gamification**: Points, badges, and achievement system

## Support and Maintenance

- **Documentation**: Comprehensive API documentation with Swagger
- **Versioning**: API versioning strategy for backward compatibility
- **Monitoring**: Built-in monitoring and alerting
- **Backup Strategy**: Automated database backups
- **Disaster Recovery**: Comprehensive disaster recovery plan

This student API system provides a robust, scalable foundation for the shorthand typing test application that can handle millions of users while maintaining excellent performance and user experience.
