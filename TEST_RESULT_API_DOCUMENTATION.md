# Test Result API Documentation

This document describes the APIs for submitting test results and retrieving test result details. All calculations are performed on the backend based on the typed text provided by the frontend.

---

## Table of Contents

1. [End Test Session API](#end-test-session-api)
2. [Get Result Details API](#get-result-details-api)
3. [Data Models](#data-models)
4. [Error Responses](#error-responses)

---

## End Test Session API

### Endpoint
```
POST /api/v1/user/sessions/:sessionId/end
```

### Description
Submits a completed test session. The backend calculates all metrics (WPM, accuracy, speed, word counts, mistakes, etc.) based on the typed text and reference text from the test.

### Authentication
- Required: Yes
- Type: Firebase Authentication
- Role: Student

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | The test session ID (UUID) |

### Request Body

#### Required Fields
| Field | Type | Required | Description |
|--------|------|----------|-------------|
| `typedText` | string | Yes | The complete text typed by the student |

#### Optional Fields
| Field | Type | Required | Description |
|--------|------|----------|-------------|
| `timeTaken` | number | No | Time taken in seconds. If not provided, calculated from session start/end time |
| `rawInput` | string | No | Alternative field name for `typedText` (for backward compatibility) |
| `elapsedSeconds` | number | No | Alternative field name for `timeTaken` (for backward compatibility) |

#### Request Body Example
```json
{
  "typedText": "hey show me result"
}
```

Or with optional time:
```json
{
  "typedText": "hey show me result",
  "timeTaken": 9
}
```

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Test completed successfully",
  "data": {}
}
```

**Note**: The result data is saved to the database but not returned in the response. To retrieve the result details, use the [Get Result Details API](#get-result-details-api) with the result ID.

### Backend Calculations

The backend performs the following calculations:

1. **Word Statistics**:
   - `totalWords`: Number of words in reference text
   - `writtenWords`: Number of words in typed text
   - `correctWords`: Number of correctly typed words
   - `incorrectWords`: Number of incorrectly typed words
   - `totalMistakes`: Total number of mistakes (using alignment algorithm)

2. **Character Statistics**:
   - `totalCharacters`: Total characters in reference text
   - `correctCharacters`: Number of correctly typed characters
   - `incorrectCharacters`: Number of incorrectly typed characters

3. **Performance Metrics**:
   - `wpm` (Words Per Minute): `(correctCharacters / 5) / (timeTaken / 60)`
   - `accuracy`: `(correctCharacters / totalCharacters) * 100`
   - `speed`: Same as WPM

4. **Mistakes Array**:
   - Detailed array of all mistakes with word, expected, typed, and position

### Error Responses

#### 400 Bad Request - Missing typedText
```json
{
  "success": false,
  "message": "Missing required field: typedText (or rawInput)"
}
```

#### 404 Not Found - Session not found
```json
{
  "success": false,
  "message": "Active test session not found"
}
```

#### 404 Not Found - Test not found
```json
{
  "success": false,
  "message": "Test not found"
}
```

---

## Get Result Details API

### Endpoint
```
GET /api/v1/user/results/:resultId
```

### Description
Retrieves detailed information about a specific test result, including all calculated metrics, word statistics, and comparison data.

### Authentication
- Required: Yes
- Type: Firebase Authentication
- Role: Student

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resultId` | string | Yes | The result ID (MongoDB ObjectId) |

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Result details fetched successfully",
  "data": {
    "result": {
      "_id": "692da9db04c9c731be122ed9",
      "studentId": {
        "_id": "69118a48a05e0de4127e9adf",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "batchId": {
        "_id": "692871f6b35c5e46ef5c30b2",
        "name": "Batch 1",
        "description": "First batch"
      },
      "testId": {
        "_id": "692ac21eea1b873e4c90dc06",
        "title": "Speed Test 1",
        "description": "Basic speed test",
        "difficulty": "beginner",
        "category": "speed_test",
        "duration": 1200,
        "referenceText": "hey show me result"
      },
      
      // Performance Metrics
      "wpm": 20.5,
      "accuracy": 85.5,
      "speed": 20.5,
      
      // Word Statistics
      "totalWords": 4,
      "correctWords": 3,
      "incorrectWords": 1,
      "totalCharacters": 18,
      "correctCharacters": 15,
      "incorrectCharacters": 3,
      
      // Word Statistics for Frontend Display
      "wordStatistics": {
        "totalWords": 4,
        "writtenWords": 3,
        "totalMistakes": 1
      },
      
      // Mistakes
      "totalMistakes": 1,
      "mistakes": [
        {
          "word": "me",
          "expected": "me",
          "typed": "me",
          "position": 2
        }
      ],
      "stenographyErrors": [],
      
      // Text Data
      "typedText": "hey show me result",
      
      // Time Information
      "timeTaken": 9,
      "timeStarted": "2025-12-01T14:44:33.970Z",
      "timeCompleted": "2025-12-01T14:44:43.285Z",
      
      // Attempt Information
      "attemptNumber": 1,
      "isRetake": false,
      
      // Ranking Context
      "rankingContext": {
        "rank": 1,
        "percentile": 100,
        "totalParticipants": 10
      },
      
      // Error Statistics
      "errorStats": {
        "totalErrors": 0,
        "errorsByType": {},
        "errorsBySeverity": {}
      },
      
      // Comparison with Student Average
      "comparison": {
        "wpmDiff": 5.2,
        "accuracyDiff": 10.5,
        "speedDiff": 5.2,
        "studentAverage": {
          "wpm": 15.3,
          "accuracy": 75.0,
          "speed": 15.3
        }
      },
      
      // Status
      "status": "completed",
      "isValid": true,
      
      // Timestamps
      "submittedAt": "2025-12-01T14:44:43.327Z",
      "createdAt": "2025-12-01T14:44:43.327Z",
      "updatedAt": "2025-12-01T14:44:43.632Z"
    }
  }
}
```

### Error Responses

#### 404 Not Found - Result not found
```json
{
  "success": false,
  "message": "Result not found or you do not have access to it"
}
```

---

## Data Models

### Result Object

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Result ID (MongoDB ObjectId) |
| `studentId` | string/Object | Student ID or populated student object |
| `batchId` | string/Object | Batch ID or populated batch object |
| `testId` | string/Object | Test ID or populated test object |
| `sessionId` | string | Test session ID (UUID) |
| `wpm` | number | Words per minute (calculated) |
| `accuracy` | number | Accuracy percentage (0-100) |
| `speed` | number | Speed (same as WPM) |
| `totalWords` | number | Total words in reference text |
| `correctWords` | number | Number of correct words |
| `incorrectWords` | number | Number of incorrect words |
| `totalCharacters` | number | Total characters in reference text |
| `correctCharacters` | number | Number of correct characters |
| `incorrectCharacters` | number | Number of incorrect characters |
| `totalMistakes` | number | Total number of mistakes |
| `mistakes` | array | Array of mistake objects |
| `typedText` | string | The text typed by the student |
| `timeTaken` | number | Time taken in seconds |
| `timeStarted` | string | ISO 8601 timestamp |
| `timeCompleted` | string | ISO 8601 timestamp |
| `attemptNumber` | number | Attempt number (1, 2, 3, etc.) |
| `isRetake` | boolean | Whether this is a retake |
| `status` | string | Result status: "completed", "in_progress", "abandoned" |
| `rank` | number | Student's rank in the batch/test |
| `percentile` | number | Student's percentile (0-100) |

### Mistake Object

| Field | Type | Description |
|-------|------|-------------|
| `word` | string | The word from reference text |
| `expected` | string | Expected word (same as word) |
| `typed` | string | The word that was typed |
| `position` | number | Position of the word in the text |

### Word Statistics Object

| Field | Type | Description |
|-------|------|-------------|
| `totalWords` | number | Total words in reference text |
| `writtenWords` | number | Total words in typed text |
| `totalMistakes` | number | Total number of mistakes |

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message description"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request data or missing required fields
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Frontend Integration Guide

### Submitting Test Results

1. **Start a test session** using `POST /api/v1/user/tests/:testId/start`
2. **Collect typed text** from the user during the test
3. **End the test session** with only the typed text:

```javascript
const submitTestResult = async (sessionId, typedText, timeTaken) => {
  const response = await fetch(`${API_URL}/api/v1/user/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      typedText: typedText,
      timeTaken: timeTaken // Optional
    })
  });
  
  const result = await response.json();
  
  // Response only contains success status
  // To get result details, you need to query the results list or use the result ID
  // The result ID can be obtained from the session or from listing results
  return result;
};
```

**Note**: After submitting, you'll need to retrieve the result using the results list endpoint or by storing the result ID from the session.

### Retrieving Result Details

```javascript
const getResultDetails = async (resultId) => {
  const response = await fetch(`${API_URL}/api/v1/user/results/${resultId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

### Using Word Statistics

The `wordStatistics` object in the result response can be used directly in the frontend:

```javascript
const { wordStatistics, typedText, testId } = result.data.result;

// Display statistics
console.log(`Total words: ${wordStatistics.totalWords}`);
console.log(`Written words: ${wordStatistics.writtenWords}`);
console.log(`Total mistakes: ${wordStatistics.totalMistakes}`);

// Use typedText and referenceText for comparison display
const referenceText = testId.referenceText;
// Display comparison using typedText and referenceText
```

---

## Notes

1. **Backend Calculation**: All metrics are calculated on the backend. The frontend should only send the `typedText`.

2. **Time Calculation**: If `timeTaken` is not provided, it's calculated from the session start and end times.

3. **Mistake Detection**: The backend uses a dynamic programming algorithm to align reference and typed text, then identifies mistakes.

4. **WPM Calculation**: WPM is calculated as `(correctCharacters / 5) / (timeTaken / 60)`, where 5 is the average characters per word.

5. **Accuracy Calculation**: Accuracy is `(correctCharacters / totalCharacters) * 100`.

6. **Backward Compatibility**: The API accepts both `typedText`/`rawInput` and `timeTaken`/`elapsedSeconds` for backward compatibility.

---

## Version History

- **v1.0.0** (2025-12-01): Initial version with backend calculation of all metrics

