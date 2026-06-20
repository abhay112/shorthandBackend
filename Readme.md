# Shorthand Typing Test Application

A web-based platform designed for shorthand typing practice, testing, and student assessment. The application allows typing institutes to manage students, configure tests, schedule batches, and analyze performance metrics like Words Per Minute (WPM) and accuracy.

## Key Features

### For Students
* **Interactive Testing:** Start, pause, resume, and submit shorthand typing tests.
* **Performance Metrics:** Real-time feedback on Words Per Minute (WPM), accuracy percentage, and error breakdown.
* **History & Analytics:** Access test submission history, 30-day performance trends, and progress charts.
* **Leaderboards:** Batch-level rankings to encourage competitive improvement.

### For Admins
* **Student Management:** Review registration requests, approve/block student accounts, and view student progress profiles.
* **Test Configurations:** Upload reference text transcripts, configure duration, and manage test options.
* **Batch & Shift Management:** Group students into batches, assign specific tests, and schedule daily time shifts.
* **Analytics & Reports:** Visual representation of overall WPM averages, active student counts, hourly activity peaks, and category distributions.
* **PDF & Certificates:** Generate batch performance statistics, audit activity logs, and issue certificates.

## Technical Architecture

### Backend Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB with Mongoose ODM
* **Security:** Helmet (headers security), CORS, cookie-based session management, and Express-Rate-Limit
* **Documentation:** Swagger UI at `/api-docs`

### Frontend Stack
* **Framework:** React with Vite
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Charts:** Recharts (visualization of performance trends)
