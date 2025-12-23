# Admin Result Detail API Documentation

## Overview
This document describes the updated Admin Result Detail API endpoint that returns comprehensive result information including test content and student submitted text.

---

## Endpoint

### Get Result by ID
**GET** `/api/v1/admin/results/:id`

Retrieves detailed information about a specific test result, including:
- Result metrics and statistics
- Test content (reference text and audio)
- Student submitted text
- Session details
- Student and test information

---

## Authentication

**Required:** Admin authentication via Firebase token

**Headers:**
```
Authorization: Bearer <firebase_token>
```

---

## Request

### URL Parameters
- `id` (string, required): The result ID (MongoDB ObjectId)

### Example Request
```http
GET /api/v1/admin/results/692dcd199aad1ef4054682de
Authorization: Bearer <firebase_token>
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Result retrieved successfully",
  "data": {
    "result": {
      "_id": "692dcd199aad1ef4054682de",
      "studentId": {
        "_id": "student_id",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phoneNumber": "+1234567890",
        "rollNumber": "STU001"
      },
      "testId": {
        "_id": "test_id",
        "title": "Advanced Stenography Test",
        "category": "comprehensive",
        "difficulty": "advanced",
        "duration": 300,
        "maxRetakes": 3,
        "currentContent": "content_id"
      },
      "batchId": {
        "_id": "batch_id",
        "name": "Batch 2024",
        "description": "Spring 2024 Batch"
      },
      "wpm": 92.5,
      "accuracy": 97.2,
      "speed": 95.0,
      "totalWords": 380,
      "correctWords": 370,
      "incorrectWords": 10,
      "totalCharacters": 2050,
      "correctCharacters": 1980,
      "incorrectCharacters": 70,
      "timeTaken": 300,
      "timeStarted": "2024-01-15T10:00:00.000Z",
      "timeCompleted": "2024-01-15T10:05:00.000Z",
      "attemptNumber": 1,
      "isRetake": false,
      "mistakes": [
        {
          "word": "example",
          "expected": "example",
          "typed": "exmaple",
          "position": 124
        }
      ],
      "stenographyErrors": [
        {
          "type": "transposition",
          "original": "dr",
          "typed": "rd",
          "position": 45,
          "severity": "minor"
        }
      ],
      "typedText": "This is the text that the student actually typed during the test session.",
      "sessionId": "session_unique_id",
      "status": "completed",
      "isValid": true,
      "rank": 3,
      "percentile": 85.5,
      "submittedAt": "2024-01-15T10:05:00.000Z",
      "createdAt": "2024-01-15T10:05:00.000Z",
      "updatedAt": "2024-01-15T10:05:00.000Z",
      "sessionDetails": {
        "sessionId": "session_unique_id",
        "currentAttempt": 1,
        "totalAttempts": 1,
        "status": "completed",
        "timeStarted": "2024-01-15T10:00:00.000Z",
        "timeCompleted": "2024-01-15T10:05:00.000Z",
        "timeExpires": "2024-01-15T10:05:00.000Z",
        "maxRetakes": 3
      },
      "testContent": {
        "version": 1,
        "status": "published",
        "referenceText": "This is the reference text that the student was supposed to type. It contains the exact content that should have been transcribed during the test session.",
        "audio": {
          "url": "https://example.com/audio/test-audio.mp3",
          "duration": 300,
          "format": "mp3",
          "size": 5242880
        },
        "metadata": {
          "language": "en",
          "speaker": "male"
        },
        "publishedAt": "2024-01-10T08:00:00.000Z"
      },
      "submittedText": "This is the text that the student actually typed during the test session. It may contain errors and differences from the reference text."
    }
  }
}
```

**Note:** The `typedText` field may also be present directly in the result object. The `submittedText` field provides the same value for consistency and is the recommended field to use.
    }
  }
}
```

### Error Responses

#### Result Not Found (404)
```json
{
  "success": false,
  "message": "Result not found",
  "error": "Result with the provided ID does not exist"
}
```

#### Unauthorized (401)
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Invalid or missing authentication token"
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "message": "Forbidden",
  "error": "Admin access required"
}
```

---

## Response Fields

### Main Result Object
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Result ID |
| `studentId` | object | Student information (name, email, phoneNumber, rollNumber) |
| `testId` | object | Test information (title, category, difficulty, duration, maxRetakes) |
| `batchId` | object | Batch information (name, description) |
| `wpm` | number | Words per minute |
| `accuracy` | number | Accuracy percentage (0-100) |
| `speed` | number | Typing speed |
| `totalWords` | number | Total words in the test |
| `correctWords` | number | Number of correctly typed words |
| `incorrectWords` | number | Number of incorrectly typed words |
| `totalCharacters` | number | Total characters in the test |
| `correctCharacters` | number | Number of correctly typed characters |
| `incorrectCharacters` | number | Number of incorrectly typed characters |
| `timeTaken` | number | Time taken in seconds |
| `timeStarted` | string (ISO 8601) | Test start timestamp |
| `timeCompleted` | string (ISO 8601) | Test completion timestamp |
| `attemptNumber` | number | Attempt number (1, 2, 3, etc.) |
| `isRetake` | boolean | Whether this is a retake attempt |
| `mistakes` | array | Array of mistake objects |
| `stenographyErrors` | array | Array of stenography-specific errors |
| `sessionId` | string | Unique session identifier |
| `status` | string | Result status (in_progress, completed, abandoned) |
| `isValid` | boolean | Whether the result is valid |
| `rank` | number (optional) | Student's rank in the test |
| `percentile` | number (optional) | Student's percentile score |
| `submittedAt` | string (ISO 8601) | Submission timestamp |
| `createdAt` | string (ISO 8601) | Creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

### Test Content Object
| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Content version number |
| `status` | string | Content status (draft, published, archived) |
| `referenceText` | string | The reference text that should have been typed |
| `audio` | object (nullable) | Audio file information |
| `audio.url` | string | Audio file URL |
| `audio.duration` | number | Audio duration in seconds |
| `audio.format` | string | Audio file format (e.g., "mp3") |
| `audio.size` | number | Audio file size in bytes |
| `metadata` | object | Additional metadata about the test content |
| `publishedAt` | string (ISO 8601, nullable) | Publication timestamp |

### Submitted Text
| Field | Type | Description |
|-------|------|-------------|
| `submittedText` | string (nullable) | The actual text submitted by the student during the test |

**Note:** `submittedText` is extracted from:
1. The `typedText` field in the result object (primary source)
2. Session data fields: `submittedText`, `text`, `transcription`, `studentText`, or `typedText` (fallback)

`submittedText` may be `null` if:
- The submitted text was not saved when the result was created
- The test session data was not saved
- The test was completed before this feature was implemented

**Note:** The result object may also contain a `typedText` field directly, which is the same value as `submittedText`. The `submittedText` field is provided for consistency and clarity.

### Session Details Object
| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session identifier |
| `currentAttempt` | number | Current attempt number |
| `totalAttempts` | number | Total number of attempts |
| `status` | string | Session status |
| `timeStarted` | string (ISO 8601) | Session start time |
| `timeCompleted` | string (ISO 8601) | Session completion time |
| `timeExpires` | string (ISO 8601) | Session expiration time |
| `maxRetakes` | number | Maximum allowed retakes |

---

## Usage Examples

### JavaScript/TypeScript (Fetch API)
```javascript
async function getResultById(resultId) {
  const token = 'your-firebase-token';
  
  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/admin/results/${resultId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      const result = data.data.result;
      
      // Access test content
      console.log('Reference Text:', result.testContent?.referenceText);
      console.log('Audio URL:', result.testContent?.audio?.url);
      
      // Access submitted text
      console.log('Submitted Text:', result.submittedText);
      
      // Access result metrics
      console.log('WPM:', result.wpm);
      console.log('Accuracy:', result.accuracy);
      
      return result;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching result:', error);
    throw error;
  }
}

// Usage
getResultById('692dcd199aad1ef4054682de');
```

### Axios Example
```javascript
import axios from 'axios';

async function getResultById(resultId) {
  const token = 'your-firebase-token';
  
  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/admin/results/${resultId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.data.success) {
      const result = response.data.data.result;
      
      // Display test content and submitted text
      displayResultDetails(result);
      
      return result;
    }
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.data.message);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

function displayResultDetails(result) {
  // Display reference text
  const referenceTextElement = document.getElementById('reference-text');
  referenceTextElement.textContent = result.testContent?.referenceText || 'N/A';
  
  // Display submitted text
  const submittedTextElement = document.getElementById('submitted-text');
  submittedTextElement.textContent = result.submittedText || 'Not available';
  
  // Display audio player if audio exists
  if (result.testContent?.audio?.url) {
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.src = result.testContent.audio.url;
    audioPlayer.style.display = 'block';
  }
  
  // Display metrics
  document.getElementById('wpm').textContent = result.wpm;
  document.getElementById('accuracy').textContent = `${result.accuracy}%`;
}
```

### React Example
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ResultDetail({ resultId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchResult = async () => {
      try {
        const token = await getFirebaseToken(); // Your token retrieval logic
        const response = await axios.get(
          `/api/v1/admin/results/${resultId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.data.success) {
          setResult(response.data.data.result);
        }
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch result');
        setLoading(false);
      }
    };
    
    fetchResult();
  }, [resultId]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!result) return <div>Result not found</div>;
  
  return (
    <div className="result-detail">
      <h2>Result Details</h2>
      
      {/* Test Content Section */}
      <section className="test-content">
        <h3>Test Content</h3>
        <div className="reference-text">
          <h4>Reference Text:</h4>
          <p>{result.testContent?.referenceText || 'N/A'}</p>
        </div>
        
        {result.testContent?.audio?.url && (
          <div className="audio-player">
            <h4>Audio:</h4>
            <audio controls src={result.testContent.audio.url}>
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </section>
      
      {/* Submitted Text Section */}
      <section className="submitted-text">
        <h3>Submitted by Student</h3>
        <p>{result.submittedText || 'Not available'}</p>
      </section>
      
      {/* Metrics Section */}
      <section className="metrics">
        <h3>Performance Metrics</h3>
        <div className="metric">
          <span>WPM:</span>
          <span>{result.wpm}</span>
        </div>
        <div className="metric">
          <span>Accuracy:</span>
          <span>{result.accuracy}%</span>
        </div>
        <div className="metric">
          <span>Speed:</span>
          <span>{result.speed}</span>
        </div>
      </section>
      
      {/* Student Information */}
      <section className="student-info">
        <h3>Student Information</h3>
        <p><strong>Name:</strong> {result.studentId?.name}</p>
        <p><strong>Email:</strong> {result.studentId?.email}</p>
        <p><strong>Roll Number:</strong> {result.studentId?.rollNumber}</p>
      </section>
    </div>
  );
}

export default ResultDetail;
```

---

## Frontend Integration Notes

### 1. Handling Null Values
- Always check if `testContent` exists before accessing its properties
- `submittedText` may be `null` for older results or if session data wasn't saved
- Use optional chaining (`?.`) or null checks when accessing nested properties

### 2. Displaying Comparison
You can compare the reference text with the submitted text to highlight differences:
```javascript
function compareTexts(referenceText, submittedText) {
  // Implement text comparison logic
  // Highlight differences, calculate word-by-word accuracy, etc.
}
```

### 3. Audio Playback
- The audio URL in `testContent.audio.url` can be used directly in HTML5 audio elements
- Check if audio exists before rendering audio player components
- Handle audio loading errors gracefully

### 4. Error Handling
- Always handle 404 errors (result not found)
- Handle 401/403 errors (authentication/authorization issues)
- Display user-friendly error messages

### 5. Performance Considerations
- The response includes comprehensive data; consider caching if needed
- For large reference texts, consider pagination or truncation in the UI
- Lazy load audio files if not immediately needed

---

## Changelog

### Version 1.1.1 (Current)
- Fixed `submittedText` extraction to check `typedText` field in result object first
- Added fallback to session data if `typedText` is not found in result
- Improved reliability of submitted text retrieval

### Version 1.1.0
- Added `testContent` field with reference text and audio information
- Added `submittedText` field with student's submitted text
- Enhanced response to include published test content version

### Version 1.0.0
- Initial implementation with basic result details

---

## Support

For questions or issues regarding this API endpoint, please contact the backend development team or refer to the main API documentation.

