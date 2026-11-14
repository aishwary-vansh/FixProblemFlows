# API Reference

Base URL (local): `http://localhost:5000`. All JSON endpoints live under `/api`. Authenticated endpoints need the header `Authorization: Bearer <jwt>`.

**Response envelope**

```json
{ "success": true, "message": "optional", "data": {} }
{ "success": false, "message": "reason", "errors": [ /* zod issues, validation only */ ] }
```

Roles: `USER`, `TECHNICIAN`, `ADMIN`. "Any" means any authenticated role.

## Auth (`/api/auth`)

### POST `/api/auth/register` (public)

Body (all required):

```json
{
  "name": "min 2 chars",
  "email": "valid email",
  "password": "6-50 chars, needs uppercase, lowercase and a special character",
  "confirmPassword": "must equal password",
  "phone": "10 digits starting with 6-9",
  "termsAccepted": true
}
```

Returns `201` with `data: { id, name, email, phone, role }`. New users are always `USER`. Errors: `400` for validation or duplicate email.

### POST `/api/auth/login` (public)

Body: `{ "email", "password" }`. Returns `200`:

```json
{ "success": true, "message": "Login successful",
  "data": { "token": "<jwt>", "user": { "id", "name", "email", "phone", "role" } } }
```

Errors: `401` for validation failure or wrong credentials (message "Invalid email or password"). JWT payload `{ userId, role }`, expires in 1 day.

### GET `/api/auth/me` (any)

Returns `data: { userId, role }` from the token. It does not hit the database.

## Issues (`/api/issues`)

| Method and path | Roles | Purpose |
|---|---|---|
| POST `/` | USER | Create an issue |
| GET `/` | any | List issues, filtered by role |
| GET `/:id` | any | Issue detail with reporter, assignee, attachments |
| PATCH `/:id/assign` | ADMIN | Assign to a technician |
| PATCH `/:id/accept` | TECHNICIAN | ASSIGNED to ACCEPTED |
| PATCH `/:id/start` | TECHNICIAN | ACCEPTED to IN_PROGRESS |
| PATCH `/:id/resolve` | TECHNICIAN | IN_PROGRESS to RESOLVED |
| PATCH `/:id/close` | USER | RESOLVED to CLOSED (reporter only) |
| PATCH `/:id/reopen` | USER | RESOLVED to REOPENED (reporter only) |
| POST `/:id/attachments` | any | Upload one image (field `image`) |

`:id` must be a positive integer, otherwise `400`.

### POST `/api/issues`

```json
{
  "title": "1-100 chars",
  "description": "5-1000 chars",
  "location": "2-200 chars",
  "category": "ELECTRICAL|PLUMBING|CARPENTRY|CIVIL|HVAC|IT|GENERAL (default GENERAL)",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL (default MEDIUM)"
}
```

Returns `201` with the created `Issue` (status `NEW`, `reporterId` from the token). Validation error returns `400` with key `error` (not `errors`).

### GET `/api/issues`

Newest first. USER sees issues they reported. TECHNICIAN sees issues where `assigneeId` is theirs. ADMIN sees all. Plain issue rows, no relations included, no pagination.

### GET `/api/issues/:id`

Includes `reporter {id,name,email}`, `assignee {id,name,email}` and `attachments` (newest first). `404` if missing. `403` if a USER is not the reporter or a TECHNICIAN is not the assignee. ADMIN sees all.

### PATCH `/api/issues/:id/assign`

Body: `{ "technicianId": <positive int> }`. Checks that the user exists and has role `TECHNICIAN`, then sets `assigneeId` and status `ASSIGNED`. It does not check the current issue status (so it can reassign at any status, including `CLOSED`) and does not check `isActive` or that `specialization` matches `category`. Errors return `400` with the message.

### PATCH `/api/issues/:id/accept` | `/start` | `/resolve`

No body. The caller must be the assignee and the issue must be in the required status (see [WORKFLOWS.md](WORKFLOWS.md)). Returns the updated issue. Errors: accept returns `401` (inconsistent), start and resolve return `400`.

### PATCH `/api/issues/:id/close` | `/reopen`

No body. Caller must be the reporter and the status must be `RESOLVED`. Returns the updated issue. Errors return `400`.

### POST `/api/issues/:id/attachments`

`multipart/form-data` with file field `image`. JPEG, PNG or WEBP, max 5 MB. USER must be the reporter, TECHNICIAN must be the assignee, ADMIN may attach to any issue. Returns `201` with the `Attachment` row. Files are served from `GET /uploads/issues/<name>`. Multer errors (wrong type, too large) fall into the generic `500` handler.

## Users (`/api/users`)

### GET `/api/users/technicians` (ADMIN)

Active technicians ordered by name: `[{ id, name, email, phone, specialization }]`. Used by the admin assign dropdown.

## Utility

- `GET /` returns `{ success: true, message: "FixFlow API is working" }`
- `GET /test-db` runs a user count. Exposes error messages on failure, remove before production.
- `GET /uploads/*` static files

## Endpoints from the blueprint that do not exist yet

Comments, notes, rating, notifications, admin user management, categories, locations, analytics, audit logs, pagination and filters. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
