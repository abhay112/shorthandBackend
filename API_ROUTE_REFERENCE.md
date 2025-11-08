# API Route Reference (Updated November 2025)

Single-page reference for the restructured API surface. All endpoints are served from the base URL `/api/v1`. Authentication uses Firebase ID tokens passed as a `Bearer` token; most state-changing calls also require the appropriate role.

- **Admin token** (`role: admin` or `super_admin`) is required for every `/admin/**` route.
- **Student token** (`role: student`) is required for every `/user/**` route.
- Responses follow the pattern `{ success, message, data }` unless otherwise noted.
- Swagger UI remains available at `/api-docs`.

---

## Auth (`/api/v1/auth`)
- `POST /register` – Create an account (Firebase user is expected to exist).
- `POST /login` – Issue session cookie for Firebase UID.
- `POST /logout` – Destroy session.
- `POST /verify-email` – Send verification mail hook.
- `GET /me` – Fetch current authenticated profile.
- `GET /verify` – Validate the supplied Firebase token.

---

## User APIs (`/api/v1/user`)
All routes require a logged-in, approved student.

### Profile & Status
- `GET /profile` – Student profile (excludes Firebase UID).
- `PATCH /profile` – Update profile fields (name, mode, etc.).
- `GET /status` – Approval/block status snapshot.

### Dashboard & Insights
- `GET /dashboard` – Aggregated dashboard (current test, stats, recent results, rankings).
- `GET /statistics` – Lifetime statistics.

### Tests & Sessions
- `GET /tests/current` – Test scheduled for the current day.
- `GET /tests/upcoming` – Future scheduled tests.
- `GET /tests/:testId/access` – Validate eligibility for a test.
- `POST /tests/:testId/start` – Start (or resume) a test session.
- `POST /sessions/:sessionId/pause` – Pause an in-progress session.
- `POST /sessions/:sessionId/resume` – Resume a paused session.
- `POST /sessions/:sessionId/end` – Submit session result payload (stores Result + session meta).

### Results & Rankings
- `GET /results` – Paginated result history (filter by batch/test).
- `GET /results/:resultId` – Detailed result record.
- `POST /results/submit` – Fallback result submission (legacy support).
- `GET /rankings` – Personal ranking history.
- `GET /batches/:batchId/leaderboard` – Leaderboard for a batch (optional `testId` query).

### Batches & Tests
- `GET /batches` – Batches assigned to the user.
- `GET /my-batches` – Alternate batch summary view (legacy).
- `GET /my-tests` – Tests mapped to the student across batches.
- `GET /batch/:batchId/tests` – Tests for a specific batch.
- `GET /progress` – Legacy progress timeline.

---

## Admin APIs (`/api/v1/admin`)
All routes require admin/super-admin privileges unless noted.

### Dashboard & Analytics
- `GET /dashboard` – High-level metrics for admins.
- `GET /rankings` – Global ranking overview (with pagination/filtering in query).
- `GET /results` – Paginated result explorer (filters: studentId, testId, batchId, date range).

### Student Management (`/admin/students`)
- `GET /` – Paginated student list with status/search filters.
- `GET /stats` – Counts for total, approved, pending, blocked students.
- `GET /:id` – Detailed student profile (populated relations).
- `PUT /:id` – Update student core fields or linked entities (uses admin service).
- `PATCH /:id/approve` – Mark student approved.
- `PATCH /:id/block` – Block student.
- `PATCH /:id/unblock` – Unblock student.
- `PATCH /bulk/approve` – Approve students in bulk (body: `studentIds[]`).
- `PATCH /bulk/block` – Block students in bulk.
- `POST /:id/batches` – Assign batch to student (body must include `batchId`).
- `DELETE /:id/batches` – Remove batch assignment (body must include `batchId`).

### Test Management (`/admin/tests`)
- `GET /` – List all tests.
- `GET /:id` – Fetch a single test.
- `POST /` – Create test (supports multipart upload for `audioFile`).
- `PUT /:id` – Update test metadata/content.
- `DELETE /:id` – Remove test.
- `POST /:id/assign-batches` – Attach test to batches.
- `DELETE /:id/remove-batches` – Detach test from batches.
- `POST /:id/assign-dates` – Schedule test on calendar dates.
- `DELETE /:id/remove-dates` – Remove scheduled dates.
- `POST /:id/block` / `POST /:id/unblock` – Toggle availability.

### Batch Management (`/admin/batches`)
- `POST /` – Create batch.
- `GET /` – List batches.
- `GET /:id` – Batch details.
- `PUT /:id` – Update batch.
- `DELETE /:id` – Delete batch.
- `GET /my-batches` – Batches linked to current admin.
- `POST /:id/students` / `DELETE /:id/students` – Manage student assignments.
- `POST /:id/tests` / `DELETE /:id/tests` – Manage test assignments.

### Result Management (`/admin/results`)
- `GET /shift/:shiftId` – Results filtered by shift (legacy support).

### Audit (`/admin/audit`)
- `GET /my-activity` – Audit timeline scoped to requesting admin.
- `GET /entity/:entityType/:entityId` – Entity audit trail (admin/super admin).
- `GET /user/:userId` – Audit activity for a user (admin or same user).
- `GET /system` – System-wide audit feed.
- `GET /critical` – Recent high-severity events.
- `GET /statistics` – Aggregate audit metrics.
- `GET /export` – Export logs (query filters + `format=json|csv`).
- `POST /archive` – Archive historical logs (super admin).
- `DELETE /delete-archived` – Purge archived logs (super admin).

### PDF & Reporting (`/admin/pdf`)
- `POST /` – Generate PDF report (body contains template data).

### Shifts (`/admin/shifts`)
- `POST /create` – Create a typing shift definition.

---

## Shared Utilities
- `GET /` – Root health check (`Shorthand Typing Test API is running!`).
- Rate limiting (`/api/*`) caps anonymous calls at 100 requests/15 minutes.
- Cross-origin requests allowed for configured front-end origins with credentials.

---

### Implementation Tips for Frontend
- Always send `Authorization: Bearer <firebase-id-token>` for authenticated routes.
- For admin upload endpoints involving files (`/admin/tests`), use `multipart/form-data` (`audioFile` field).
- Paginated endpoints follow `page`, `limit` query params; responses include pagination metadata where available.
- Error responses follow `{ success: false, message, errors? }`; check `message` for frontend toast copy.


