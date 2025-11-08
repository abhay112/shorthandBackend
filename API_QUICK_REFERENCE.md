# 🚀 API Quick Reference Guide

## Base URL
```
Development: http://localhost:3000/api/v1
Production:  https://your-domain.com/api/v1
```

## Authentication
All protected endpoints require:
```http
Authorization: Bearer <firebase_id_token>
```

---

## 📌 Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Authentication** |
| POST | `/auth/register` | Register new student |
| POST | `/auth/login` | Student login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user |
| **Dashboard & Profile** |
| GET | `/students/dashboard` | Get complete dashboard |
| GET | `/students/profile` | Get profile |
| PATCH | `/students/profile` | Update profile |
| GET | `/students/statistics` | Get statistics |
| GET | `/students/status` | Check approval status |
| **Tests** |
| GET | `/students/test/current` | Get today's test |
| GET | `/students/test/upcoming` | Get upcoming tests |
| GET | `/students/test/:id/access` | Check test access |
| POST | `/students/sessions/:testId/start` | Start test session |
| POST | `/students/sessions/:sessionId/end` | Submit test & end session |
| POST | `/students/sessions/:sessionId/pause` | Pause test |
| POST | `/students/sessions/:sessionId/resume` | Resume test |
| **Results** |
| GET | `/students/results` | Get all results (paginated) |
| GET | `/students/results/:id` | Get result details |
| **Rankings** |
| GET | `/students/rankings` | Get personal rankings |
| GET | `/students/batch/:batchId/leaderboard` | Get batch leaderboard |
| **Batches** |
| GET | `/students/batches` | Get assigned batches |

---

## 👨‍💼 Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Dashboard** |
| GET | `/admin/dashboard` | Get admin dashboard |
| **Student Management** |
| GET | `/admin/students` | List all students |
| GET | `/admin/students/:id` | Get student details |
| POST | `/admin/students/approve` | Approve/disapprove student |
| POST | `/admin/students/block` | Block/unblock student |
| POST | `/admin/students/assign-batch` | Assign to batch |
| POST | `/admin/students/remove-batch` | Remove from batch |
| **Test Management** |
| POST | `/test` | Create test |
| GET | `/test` | List all tests |
| GET | `/test/:id` | Get test details |
| PUT | `/test/:id` | Update test |
| DELETE | `/test/:id` | Delete test |
| POST | `/test/:id/assign-batches` | Assign to batches |
| DELETE | `/test/:id/remove-batches` | Remove from batches |
| POST | `/test/:id/assign-dates` | Assign to specific dates |
| DELETE | `/test/:id/remove-dates` | Remove date assignments |
| POST | `/test/:id/block` | Block test |
| POST | `/test/:id/unblock` | Unblock test |
| **Batch Management** |
| POST | `/batch` | Create batch |
| GET | `/batch` | List all batches |
| GET | `/batch/:id` | Get batch details |
| PUT | `/batch/:id` | Update batch |
| DELETE | `/batch/:id` | Delete batch |
| POST | `/batch/:id/add-students` | Add students to batch |
| POST | `/batch/:id/remove-students` | Remove students from batch |
| **Analytics** |
| GET | `/admin/analytics/overview` | System overview |
| GET | `/admin/reports/performance` | Performance reports |
| GET | `/admin/reports/batch/:id` | Batch report |

---

## 📊 Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Filtering
```
?isApproved=true
?isBlocked=false
?batchId=68d3fefdd3c7803f67fc9598
?testId=68e967ddf1ee339dd762bc77
?difficulty=intermediate
?category=speed_test
```

### Sorting
```
?sortBy=wpm&sortOrder=desc
?sortBy=submittedAt&sortOrder=asc
```

### Search
```
?search=john
```

### Date Range
```
?startDate=2025-10-01&endDate=2025-10-31
```

---

## 🎯 Common Request Examples

### Student: Start Test
```bash
curl -X POST http://localhost:3000/api/v1/students/sessions/68e967ddf1ee339dd762bc77/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Student: Submit Test
```bash
curl -X POST http://localhost:3000/api/v1/students/sessions/SESSION_ID/end \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
      "mistakes": [],
      "stenographyErrors": []
    }
  }'
```

### Admin: Approve Student
```bash
curl -X POST http://localhost:3000/api/v1/admin/students/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "68c6acb61d1e6a2919b50af9",
    "isApproved": true
  }'
```

### Admin: Create Test
```bash
curl -X POST http://localhost:3000/api/v1/test \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "title=Speed Test Level 1" \
  -F "referenceText=The quick brown fox..." \
  -F "duration=300" \
  -F "difficulty=beginner" \
  -F "audioFile=@/path/to/audio.mp3"
```

---

## 🔢 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limit |
| 500 | Server Error |

---

## 🎨 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

## 🔐 Role-Based Access

| Role | Access Level |
|------|-------------|
| **student** | Dashboard, Tests, Results, Rankings |
| **admin** | Student Management, Test Management, Batch Management |
| **super_admin** | Full System Access + Audit Logs |

---

## ⚡ Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 req / 15 min |
| Authentication | 10 req / 15 min |
| Test Submission | 5 req / minute |
| Admin Operations | 200 req / 15 min |

---

## 📱 Mobile App Notes

- Mobile apps don't send `Origin` header - automatically allowed
- Use same Firebase authentication
- All endpoints support mobile clients
- Response formats are identical

---

## 🧪 Testing Tools

### Postman Collection
Import the API into Postman using:
```
http://localhost:3000/api-docs/swagger.json
```

### cURL Examples
See full documentation for detailed cURL examples for each endpoint.

---

## 🔗 Useful Endpoints

| URL | Description |
|-----|-------------|
| `/` | Health check |
| `/api-docs` | Swagger UI documentation |
| `/api/v1/auth/me` | Verify authentication |

---

## 💡 Tips

1. **Always include Authorization header** for protected endpoints
2. **Use pagination** for large datasets
3. **Handle rate limits** gracefully in your frontend
4. **Validate data** before sending to API
5. **Check error responses** for detailed error information
6. **Use appropriate HTTP methods** (GET for reading, POST for creating, etc.)

---

For detailed information, see: `FINAL_COMPLETE_API_DOCUMENTATION.md`

