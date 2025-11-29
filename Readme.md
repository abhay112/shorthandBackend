# Shorthnd LMS Backend – Unified Test & Result Management Guide

This repository powers a shorthand-focused learning management system (LMS) that delivers daily practice, timed assessments, and detailed leaderboards.  
The backend is built with Node.js, Express, MongoDB (via Mongoose), and Firebase authentication.  
This single document consolidates every previous markdown note into one authoritative guide for developers, product managers, and frontend teammates.

---

## Quick Start

- **Install dependencies:** `npm install`
- **Environment:** copy `.env.example` (or see variables below) and configure Firebase + MongoDB.
- **Run in development:** `npm run dev`
- **Run in production:** `npm start`

Minimal `.env` variables:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/shorthand-typing-test
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FRONTEND_URL=http://localhost:3000
SECRET_KEY=...
SESSION_SECRET=...
```

---

## Domain Overview

- **Admin users** create, update, publish, schedule, block, and retire typing tests. They also monitor performance, rankings, and batches.
- **Students** consume the scheduled tests, run controlled test sessions, and receive ranked results.
- **Batches** group students. Tests can be assigned either to batches or to specific batch/date pairs with prioritisation and open/close windows.
- **Test sessions** guarantee regulated attempts (duration, pauses, max retries) and drive result persistence.
- **Results** feed ranking tables, dashboard summaries, and individual student progress analytics.

---

## Core Data Models (Highlights)

### `Test`
- Metadata: `title`, `description`, `referenceText`, optional `audioURL`.
- Taxonomy: `testType` (`curriculum|practice|assessment|special`), `difficulty`, `category`.
- Access rules: `duration`, `maxRetakes`, `availableFrom/Until`, `settings` (pause counts, timers, auto-submit).
- Scheduling:
  - `assignedBatches`: legacy batch-level availability.
  - `assignedDays[]`: fine-grained batch/date assignments with `priority`, `availableFrom/Until`, `assignedBy`, `assignedAt`, `isActive`.
- Moderation: `isPublished`, `isActive`, `isBlocked`, `allowViewWhenBlocked`, `blockReason`, `blockedBy`.
- Analytics: `statistics.totalAttempts`, `statistics.averageWpm`, `statistics.averageAccuracy`, `statistics.completionRate`.

### `TestSession`
- Linked to `studentId`, `batchId`, `testId`.
- Tracks `sessionId`, `currentAttempt`, `totalAttempts`, `status`, `timeStarted`, `timeCompleted`, `timeExpires`.
- Stores pause metadata and accumulated `results[]`.

### `Result`
- Linked to `studentId`, `batchId`, `testId`, optional `shiftId`, `sessionId`.
- Metrics: `wpm`, `accuracy`, `speed`, totals/correct/incorrect words & characters.
- Attempts: `attemptNumber`, `isRetake`, `status`, `isValid`.
- Error detail arrays: `mistakes[]`, `stenographyErrors[]`.
- Ranking metadata: `rank`, `percentile`, `submittedAt`.
- Indexed for quick leaderboard queries.

### `StudentRanking`
- Unique per `(studentId, batchId, testId)`.
- Stores `rank`, `percentile`, last `wpm/accuracy/speed`, `previousRank`, `rankChange`, `totalStudents`, `totalAttempts`, `testDate`.
- Powers batch and test leaderboards plus individual trend views.

---

## Admin Workflows & APIs

| Capability | Method | Path | Auth | Notes |
|------------|--------|------|------|-------|
| Create test (with audio, schedule metadata) | `POST` | `/api/v1/test` | Admin | `multipart/form-data`; accepts JSON strings for `assignedDays`, `assignedBatches`, `settings`. |
| Update test | `PUT` | `/api/v1/test/:id` | Admin | **Now also accepts `multipart/form-data`**. Supports partial updates, replacement of schedule arrays, audio upload/removal. |
| Fetch tests (filterable) | `GET` | `/api/v1/test` | Admin | Query by `testType`, `difficulty`, `category`, `isActive`, `page`, `limit`. |
| Fetch test detail | `GET` | `/api/v1/test/:id` | Admin | Returns populated metadata and assignments. |
| Delete test | `DELETE` | `/api/v1/test/:id` | Admin | Cleans up batch references. |
| Assign batches | `POST` | `/api/v1/test/:id/assign-batches` | Admin | Adds to both test and batch docs. |
| Remove batches | `DELETE` | `/api/v1/test/:id/remove-batches` | Admin | Removes bidirectional references. |
| Assign dates | `POST` | `/api/v1/test/:id/assign-dates` | Admin | Push-only helper; you can also replace via `PUT /test/:id`. |
| Remove date assignments | `DELETE` | `/api/v1/test/:id/remove-dates` | Admin | Removes specific assignment IDs. |
| Block / Unblock test | `POST` | `/api/v1/test/:id/block`<br>`POST /api/v1/test/:id/unblock` | Admin | Stores `blockedBy`, `blockedAt`, `blockReason`. |
| Admin results listing | `GET` | `/api/v1/admin/results` | Admin | Paginated filters by `studentId`, `testId`, `batchId`, date range. |
| Admin leaderboards | `GET` | `/api/v1/admin/rankings` | Admin | Paginated, sortable by `rank`, `wpm`, `accuracy`, `speed`. |

### Creating / Updating Tests (Frontend Playbook)

1. Use `FormData` when audio is present; otherwise JSON works.
2. For `assignedDays` supply an array, e.g.
   ```json
   [
     {
       "batchId": "64f1b2...",
       "assignedDate": "2025-01-15",
       "priority": 8,
       "availableFrom": "2025-01-15T09:00:00Z",
       "availableUntil": "2025-01-15T17:00:00Z",
       "dayNumber": 15,
       "isActive": true
     }
   ]
   ```
   The controller normalises types, injects `assignedBy`/`assignedAt`, and validates dates.
3. When updating, you may **replace entire arrays** by re-sending `assignedDays` or `assignedBatches`. The service automatically:
   - reconciles batch relationships (`Batch.tests` array) using set difference;
   - updates metadata timestamps (`updatedAt`);
   - preserves blocking and publishing invariants.
4. To drop audio, send `removeAudio=true`. To replace audio, attach new `audioFile`.
5. Publishing rules:
   - Send `isPublished=true` or `publishNow=true` to stamp `publishedAt`.
   - Send `isPublished=false` to revert to draft and clear `publishedAt`.
6. Blocking rules:
   - Send `isBlocked=true` (optionally with `blockReason`) to block; backend logs `blockedBy/blockedAt`.
   - Send `isBlocked=false` to fully clear block metadata.

### Scheduling Strategy

- **Priority**: higher numbers win when multiple assignments are active for the same day.
- **Time windows**: `availableFrom/availableUntil` on each assignment override global test availability.
- **Fallback**: If no `assignedDays` match, students fall back to `assignedBatches` (legacy behaviour) honouring global availability windows.

---

## Student Workflows & APIs

All student routes are under `/api/v1/user` after authentication (`authenticateFirebase`) and approval guard (`requireApproval`).

| Flow | Method | Path | Description |
|------|--------|------|-------------|
| Dashboard snapshot | `GET` | `/api/v1/user/dashboard` | Aggregates profile, current day tests, upcoming tests, recent results, rankings, statistics. |
| Current tests | `GET` | `/api/v1/user/tests/current` | Returns prioritised list for today with blocking metadata. |
| Upcoming schedule | `GET` | `/api/v1/user/tests/upcoming` | Multi-day lookahead with availability windows. |
| Access check | `GET` | `/api/v1/user/tests/:testId/access` | Confirms eligibility, attempts remaining, block status. |
| Start session | `POST` | `/api/v1/user/tests/:testId/sessions` | Creates `TestSession`, returns `sessionId`, attempt number, expiry. |
| End session (submit result) | `POST` | `/api/v1/user/sessions/:sessionId/end` | Accepts metrics & errors, closes session, persists result, triggers ranking/statistics recalculation. |
| Pause / Resume | `POST` | `/api/v1/user/sessions/:sessionId/pause`<br>`POST /resume` | Stubs today (extendable). |
| Results history | `GET` | `/api/v1/user/results` | Paginated: filter by batch/test/sort order. |
| Result detail | `GET` | `/api/v1/user/results/:resultId` | Full metrics, error breakdown, ranking context, student-vs-average comparison. |
| Rankings | `GET` | `/api/v1/user/rankings` | Student-specific history, optionally filtered by batch. |
| Batch leaderboard | `GET` | `/api/v1/user/leaderboards/:batchId` | Top performers (optionally per test). |
| Legacy result submission | `POST` | `/api/v1/user/results/submit` | Fallback path; new session flow is preferred. |

### Student Session Lifecycle (Frontend)

1. **Fetch current tests** then call `GET /tests/:testId/access` to ensure eligibility.
2. **Start session**: `POST /tests/:testId/sessions` → store `sessionId`, attempt number, expiration.
3. **Render test** using returned metadata (`duration`, `settings`). Always clock countdown on frontend based on `timeExpires`.
4. **On completion**: compile metrics payload:
   ```json
   {
     "wpm": 92,
     "accuracy": 97.5,
     "speed": 95,
     "totalWords": 380,
     "correctWords": 370,
     "incorrectWords": 10,
     "totalCharacters": 2050,
     "correctCharacters": 1980,
     "incorrectCharacters": 70,
     "mistakes": [
       { "word": "example", "expected": "example", "typed": "exmaple", "position": 124 }
     ],
     "stenographyErrors": [
       { "type": "transposition", "original": "dr", "typed": "rd", "position": 45, "severity": "minor" }
     ]
   }
   ```
5. **Submit**: `POST /sessions/:sessionId/end` with payload (root-level or under `results`). Missing keys raise `400`.
6. **Receive**: Response contains persisted `result`, ranking info, metrics; update UI without additional fetches.
7. **Post-submit**: optionally refresh `GET /user/results` or `GET /user/rankings` for live updates.

---

## Result Pipeline & Automation

Result persistence now guarantees:

1. **Validation** in controller/service ensures all critical numeric fields exist.
2. `Result.create()` persists the attempt with context (student, batch, test, session).
3. `processResultSideEffects` (new util in `src/services/utils/resultUtils.js`) runs atomically:
   - Links result to `Student.results`.
   - Recomputes `Test.statistics` via aggregation (`totalAttempts`, `averageWpm`, `averageAccuracy`, `completionRate`).
   - Calculates ranking order across the test/batch, saving entry in `StudentRanking` and back-filling `result.rank / percentile`.
4. Both **session-based** submissions and **legacy** `/user/results/submit` endpoint flow through the same service logic, ensuring consistent analytics.

All ranking calculations log successes/failures via `logger` and throw structured `AppError`s on anomalies.  
Indexes on `Result` and `StudentRanking` keep queries efficient for large cohorts.

---

## Frontend Integration Guide

### Admin Console
- **Create Test Wizard**
  1. Collect core metadata on step one (title, difficulty, duration).
  2. Step two handles media upload and reference text.
  3. Step three manages schedule:
     - Provide UI to add multiple `assignedDays` rows (batch selector, date picker, priority, time window, toggle active).
     - Provide ability to opt-in to general `assignedBatches` fallback.
  4. On submit, convert schedule arrays to JSON strings, build `FormData`, hit `POST /api/v1/test`.
- **Edit Test**
  - Prefill forms using `GET /api/v1/test/:id`.
  - When saving, send only changed sections; arrays must contain the desired final state.
  - Offer audio removal toggle to send `removeAudio=true`.
- **Schedule Dashboard**
  - Combine `GET /api/v1/test` with query filters for type/difficulty/status.
  - Provide quick actions for block/unblock, publish/unpublish (call `POST /block`, `POST /unblock`, `PUT /test/:id` with flags).
- **Results & Leaderboards**
  - Use `GET /api/v1/admin/results` with pageable table (columns: student, test, batch, wpm, accuracy, rank, submittedAt).
  - For rankings, call `GET /api/v1/admin/rankings` and plot top performers or export CSV.

### Student Portal
- **Daily Test Card**
  - On load, call `GET /user/tests/current` and display `primaryTest` with `priority`, `isBlocked`, `blockReason`.
  - Provide fallback list `allTestsForToday` for manual selection.
- **Session View**
  - After `POST /tests/:testId/sessions`, store `sessionId`.
  - Use `timeExpires` for countdown, apply `settings.allowPause`, `settings.maxPauses`.
  - Autosave typed text locally; backend expects aggregated metrics only.
- **Submission**
  - Ensure numeric fields are sent as numbers (convert on client).
  - Provide an error preview to review mistakes before submitting.
- **Progress & Rankings**
  - Use `GET /user/results` to drive history tables (use `sortBy=submittedAt&sortOrder=desc` for latest-first).
  - Pull `GET /user/rankings` to visualise improvement (rank change vs attempts).
  - Display `batch leaderboard` charts via `GET /user/leaderboards/:batchId`.

#### Student Page Implementation (Tests · Results · Rankings)

This section outlines a reference architecture for the frontend (React/Next.js/Vue compatible) to implement the student-facing Test workspace.

**1. Page Layout**
- `Hero` area: display current priority test (title, duration, attempts left, status chips like `Blocked`, `Draft`, `Upcoming`).
- `Tabs` or segmented controls:
  - `Today`: prioritized list from `GET /user/tests/current` response (`primaryTest`, `allTestsForToday`).
  - `Upcoming`: calendar/list view bound to `GET /user/tests/upcoming`.
  - `Results`: paginated table built off `GET /user/results`.
  - `Rankings`: leaderboards from `GET /user/rankings` and `GET /user/leaderboards/:batchId`.

**2. State & Caching**
- Use a query client (React Query / SWR) keyed as:
  - `student.currentTests` → `GET /user/tests/current`
  - `student.upcomingTests` → `GET /user/tests/upcoming?limit=...`
  - `student.results?page=x&filters` → `GET /user/results`
  - `student.ranking.timeline` → `GET /user/rankings`
  - `student.ranking.batch:${batchId}` → `GET /user/leaderboards/:batchId`
- Cache durations: 1–5 minutes for tests, 30 seconds for in-flight sessions, 5 minutes for historical data.
- Invalidate `student.currentTests`, `student.results`, and `student.ranking.*` once `POST /sessions/:sessionId/end` resolves.

**3. Component Responsibilities**
- `CurrentTestCard`
  - Props: `test`, `canTake`, `blockReason`, `timeWindow`.
  - Actions: `Start` (calls `POST /tests/:testId/sessions`), `View Instructions`.
  - Edge handling: disable `Start` when `isBlocked`, show tooltip if `allowViewWhenBlocked`.
- `UpcomingTestList`
  - Displays grouped by date with `priority` badges.
  - Indicate availability windows and retake limits.
- `ActiveSessionModal`
  - Manages timer using backend `timeExpires`.
  - On submit, calls `POST /sessions/:sessionId/end`.
  - Shows inline validation for missing metrics before API call.
- `ResultTable`
  - Columns: `submittedAt`, `test.title`, `wpm`, `accuracy`, `attemptNumber`, `rank`, `actions`.
  - `View` action fetches `GET /user/results/:resultId` for drawer modal showing `mistakes`, `stenographyErrors`, `comparison`.
- `RankingTimeline`
  - Visualises `rank`, `percentile`, `rankChange` vs attempts (line or area chart).
  - Provide filters for `batchId`, `testId`.
- `LeaderboardWidget`
  - Accepts `batchId` & optional `testId`.
  - Sorts by `rank`, highlight current student, show `rankChangeDirection`.

**4. Session Flow UX**
- Guard route by checking `accessCheck.canTake`; display modal when blocked or no attempts left.
- Pre-flight `POST /tests/:testId/sessions` when student presses `Start`; handle error states (e.g., concurrency, block, expired window).
- Persist `sessionId` in route state or context to survive tab refresh (localStorage fallback).
- Provide `Resume` CTA if backend supports `pause/resume` (currently stubbed, but design for future).

**5. Error & Edge Cases**
- `401/403`: redirect to login or approval pending page.
- `410` from `submitTestResult`: show migration message (should rarely appear if new endpoints used).
- `429`/network failures: keep result payload in memory and allow retry.
- When ranking not yet computed (possible on slow networks), show optimistic placeholder with `processing` tag.

**6. Accessibility & Internationalisation**
- Format dates/times in user locale; ensure `availableFrom`/`availableUntil` convert from UTC.
- Provide SR-only descriptions for timer changes and ranking updates.
- Use consistent colour semantics for `rankChangeDirection`: `improved` (green), `declined` (red), `same/new` (neutral).

**7. Analytics Hooks**
- Log `StartTest`, `SubmitResult`, `ViewResult`, `ViewLeaderboard` events with payload:
  - `testId`, `sessionId`, `batchId`, `attemptNumber`, `wpm`, `accuracy`, `rank`.
- Capture client-rendered latency for session start to help tune backend.

### Student Test API Contract (`/api/v1/user`)

Use the following reference verbatim when generating frontend code (e.g. Cursor prompts). Every request must include the Firebase bearer token in the `Authorization` header. Routes under `approvedRouter` additionally require the student to have `isApproved === true`.

#### Common Response Shape

```json
{
  "success": true,
  "message": "Human readable status",
  "data": { /* endpoint-specific payload */ }
}
```

Errors return the same envelope with `success: false` and `message` describing the problem.

#### Profile & Status
| Method | Path | Approval | Description |
|--------|------|----------|-------------|
| `GET` | `/api/v1/user/profile` | ❌ | Current student profile (name, email, role, assigned batches, flags). |
| `PATCH` | `/api/v1/user/profile` | ❌ | Partial update; accepts fields supported by `studentService.updateStudentProfile`. |
| `GET` | `/api/v1/user/status` | ❌ | Summary of approval/block state and batch count. |

#### Dashboard & Insights (requires approval)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/user/dashboard` | Aggregated snapshot (`student`, `currentTest`, `recentResults`, `statistics`, `rankings`, `upcomingTests`). |
| `GET` | `/api/v1/user/statistics` | Extended stats: averages, streaks, completion rate. |
| `GET` | `/api/v1/user/progress` | Legacy equivalent of statistics (kept for backwards compatibility). |

#### Test Discovery (requires approval)
| Method | Path | Query | Description |
|--------|------|-------|-------------|
| `GET` | `/api/v1/user/tests/current` | — | `primaryTest` (highest priority) + `allTestsForToday` array. |
| `GET` | `/api/v1/user/tests/upcoming` | `days`, `limit` (optional) | Upcoming assignments grouped by date with priority and time windows. |
| `GET` | `/api/v1/user/tests/{testId}/access` | — | Reserves an attempt immediately and returns updated `remainingAttempts`, `attemptNumber`, `reservationSessionId`. |
| `GET` | `/api/v1/user/test/current` | — | Legacy alias of `/tests/current`. |

#### Session Lifecycle (requires approval)
| Method | Path | Body Expectations | Returns |
|--------|------|-------------------|---------|
| `POST` | `/api/v1/user/tests/{testId}/start` | none | Promotes the latest reservation or creates a session; returns `{ sessionId, test, content, attemptNumber, remainingAttempts, timeExpires }`. |
| `POST` | `/api/v1/user/sessions/{sessionId}/end` | See payload below | Persists metrics, returns saved `result` populated with `testId` & `batchId`, plus ranking fields when available. |
| `POST` | `/api/v1/user/sessions/{sessionId}/pause` | none | Placeholder; currently returns success without state change. |
| `POST` | `/api/v1/user/sessions/{sessionId}/resume` | none | Placeholder; returns success. |

Minimum submission payload (numbers in raw JSON, not strings):
```json
{
  "wpm": 92,
  "accuracy": 97.5,
  "speed": 95,
  "totalWords": 380,
  "correctWords": 370,
  "incorrectWords": 10,
  "totalCharacters": 2050,
  "correctCharacters": 1980,
  "incorrectCharacters": 70,
  "mistakes": [{ "word": "example", "expected": "example", "typed": "exmaple", "position": 124 }],
  "stenographyErrors": [{ "type": "transposition", "original": "dr", "typed": "rd", "position": 45, "severity": "minor" }]
}
```
The backend also accepts the same shape nested under a `results` key.

#### Results & Rankings (requires approval)
| Method | Path | Query | Description |
|--------|------|-------|-------------|
| `GET` | `/api/v1/user/results` | `page`, `limit`, `batchId`, `testId`, `sortBy`, `sortOrder` | Paginated completed attempts. |
| `GET` | `/api/v1/user/results/{resultId}` | — | Detailed attempt including `mistakes`, `stenographyErrors`, comparison vs personal average, ranking context. |
| `GET` | `/api/v1/user/rankings` | `page`, `limit`, `batchId` | Ranking history derived from `StudentRanking`. |
| `GET` | `/api/v1/user/batches/{batchId}/leaderboard` | Optional `testId` | Batch leaderboard capped at top performers. |

#### Batch Utilities (requires approval)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/user/batches` | Lists batches assigned to the student. |

#### Deprecated Submission (requires approval)
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/v1/user/test/submit` | Legacy endpoint; always responds `410 Gone` with migration message. Frontend should avoid calling except for compatibility fallbacks. |

#### Example Prompt Snippet for Cursor
> You are building the Shorthnd LMS student dashboard. Use the following API contract:  
> • `GET /api/v1/user/tests/current` → `{ primaryTest, allTestsForToday[] }`  
> • `GET /api/v1/user/tests/{testId}/access` → **consumes** an attempt and returns `{ remainingAttempts, attemptNumber, reservationSessionId }`  
> • `POST /api/v1/user/tests/{testId}/start` → `{ sessionId, test, content, attemptNumber, remainingAttempts, timeExpires }`  
> • `POST /api/v1/user/sessions/{sessionId}/end` with metrics payload → returns `{ result }` including `rank` & `percentile`  
> • `GET /api/v1/user/results?page=&limit=` for table data  
> • `GET /api/v1/user/rankings` & `/batches/{batchId}/leaderboard` for charts  
> All requests require `Authorization: Bearer <firebase-id-token>` and approved routes require the student to have `isApproved`. Implement React Query hooks and UI states following this contract.

### Shared Considerations
- Always propagate Firebase bearer token in `Authorization`.
- Respect time zones: send ISO 8601 strings; backend stores as UTC.
- Handle `410 Gone` for deprecated endpoints (e.g., `submitTestResult` legacy path).
- Optimistically update UI after submissions, but also refetch to capture ranking recalculation.
- For large forms (especially `assignedDays`), guard against accidental double submissions.

---

## Database & Infrastructure Notes

- **Statistics refresh** happens synchronously per result; for extremely high throughput consider queuing, but current design keeps analytics immediately consistent.
- **Batch-test relationships** are maintained bidirectionally in `testService`. When updating assignments manually in MongoDB, ensure you update both sides.
- **Audit logging** is available through `AuditLog` model (see `src/models/AuditLog.js`) and is triggered by `sendResponse` metadata hooks.
- **Shifts** remain optional; `Result.shiftId` enables shift-based reporting when that feature is used.

---

## Appendix: API Quick Reference

### Test Management (Admin)

| Method | Path | Body Highlights |
|--------|------|-----------------|
| `POST` | `/api/v1/test` | `FormData`: `title`, `referenceText`, optional `audioFile`, JSON strings for schedule arrays. |
| `PUT` | `/api/v1/test/:id` | Partial updates, `FormData` supported, optionally `removeAudio`, `assignedDays`, `settings`. |
| `POST` | `/api/v1/test/:id/block` | `{ "reason": "Content under review" }` |
| `POST` | `/api/v1/test/:id/unblock` | No body |
| `POST` | `/api/v1/test/:id/assign-dates` | `{ "dateAssignments": [ ... ] }` |
| `DELETE` | `/api/v1/test/:id/remove-dates` | `{ "assignmentIds": [ ... ] }` |

### Session & Result Flow (Student)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/user/tests/:testId/sessions` | Start session |
| `POST` | `/api/v1/user/sessions/:sessionId/end` | Submit metrics, closes session |
| `GET` | `/api/v1/user/results` | Paginate history |
| `GET` | `/api/v1/user/results/:resultId` | Detailed attempt report |

### Analytics

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/admin/results` | Admin results listing |
| `GET` | `/api/v1/admin/rankings` | Global rankings |
| `GET` | `/api/v1/user/rankings` | Student-specific history |
| `GET` | `/api/v1/user/leaderboards/:batchId` | Batch leaderboard |

---

## Change Log (Most Recent)

- **Comprehensive test update handler** (`PUT /api/v1/test/:id`) now supports multimedia payloads, deep schedule updates, publish/block toggles, and keeps batch relationships in sync.
- **Result processing pipeline** centralised in `src/services/utils/resultUtils.js`, guaranteeing student linkage, test statistics recalculation, and ranking updates for every submission (session-based or legacy).
- **Result schema** (`src/models/Result.js`) now tracks optional `shiftId` to unblock shift-based reporting by admin APIs.
- **Result controller/service** hardened with validation, consistent response envelopes, and shared side effects.
- **This README** replaces all previous markdown files (`*_DOCUMENTATION.md`, `SYSTEM_IMPROVEMENTS.md`, etc.) as the single canonical reference.

---

## Single Source of Truth

All other `.md` files in the repository have been removed.  
Update this README whenever backend behaviour changes—developers and frontend teams rely on it as the definitive manual for LMS test, session, result, and ranking flows.

