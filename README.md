# FixFlow --- Backend & Workflow Design Blueprint

## 1. Project Overview

### Problem Statement

In colleges, offices, apartments, and other organizations, maintenance
issues are often reported through WhatsApp messages, phone calls, verbal
complaints, or spreadsheets. This makes it difficult to track reported
issues, assign them to the right maintenance staff, prioritize urgent
problems, and ensure that issues are resolved within a reasonable time.

Users often have no clear visibility into the status of their
complaints, while maintenance staff may struggle to manage multiple
requests. Administrators lack centralized information about pending
issues, resolution times, SLA violations, and recurring problems.

### Solution

FixFlow is a multi-role maintenance issue management platform where:

-   Users report maintenance issues.
-   Admins review, prioritize, assign, and monitor issues.
-   Technicians manage their assigned work and resolve issues.
-   Users can track, verify, reopen, and rate completed work.
-   The system maintains an audit trail and status history.
-   SLA rules help administrators identify delayed issues.
-   Analytics help identify operational bottlenecks and recurring
    problems.

------------------------------------------------------------------------

# 2. Main Actors

## User

A student, employee, resident, or other person reporting an issue.

Responsibilities:

-   Register/login
-   Create maintenance issue
-   Upload issue photos
-   Select location/category
-   Track issue status
-   Add comments
-   Verify resolution
-   Reopen an incorrectly resolved issue
-   Rate completed service

## Technician

Maintenance staff responsible for fixing issues.

Responsibilities:

-   View assigned issues
-   Accept/reject assignments
-   Start work
-   Add work notes
-   Upload completion evidence
-   Mark issue as resolved
-   View SLA deadlines

## Admin

Operations/maintenance manager.

Responsibilities:

-   Manage users
-   Manage technicians
-   Manage departments/categories
-   Manage locations
-   Review new issues
-   Set priority
-   Assign/reassign technicians
-   Monitor SLA
-   View analytics
-   Investigate recurring issues
-   View audit history

------------------------------------------------------------------------

# 3. High-Level Architecture

``` text
                         React Frontend
                               |
                         HTTP / JSON
                               |
                               v
                    +----------------------+
                    |    Express Server    |
                    +----------------------+
                               |
             +-----------------+-----------------+
             |                 |                 |
             v                 v                 v
       Auth Middleware   Role Middleware   Validation
             |                 |                 |
             +-----------------+-----------------+
                               |
                               v
                         Route Layer
                               |
                               v
                       Controller Layer
                               |
                               v
                        Service Layer
                               |
                               v
                         Prisma ORM
                               |
                               v
                        PostgreSQL DB
```

Optional later:

``` text
PostgreSQL  <---->  Redis
                         |
                         +--> caching
                         +--> background jobs
                         +--> notification support

Express <----> WebSocket
                 |
                 +--> real-time status updates
```

------------------------------------------------------------------------

# 4. Recommended Backend Folder Structure

``` text
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── env.js
│   │   └── database.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── issue.routes.js
│   │   ├── technician.routes.js
│   │   ├── admin.routes.js
│   │   ├── comment.routes.js
│   │   └── user.routes.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── issue.controller.js
│   │   ├── technician.controller.js
│   │   ├── admin.controller.js
│   │   ├── comment.controller.js
│   │   └── user.controller.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── issue.service.js
│   │   ├── assignment.service.js
│   │   ├── sla.service.js
│   │   ├── notification.service.js
│   │   └── analytics.service.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   ├── validation.middleware.js
│   │   └── error.middleware.js
│   │
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── issue.validator.js
│   │   └── comment.validator.js
│   │
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── password.js
│   │   ├── pagination.js
│   │   └── response.js
│   │
│   ├── constants/
│   │   ├── roles.js
│   │   ├── issue-status.js
│   │   └── priority.js
│   │
│   ├── app.js
│   └── server.js
│
├── prisma/
│   ├── schema.prisma
│   └── seed.js
│
├── .env
├── package.json
└── README.md
```

------------------------------------------------------------------------

# 5. Why Separate Routes, Controllers and Services?

The request should flow like this:

``` text
HTTP Request
     |
     v
Route
     |
     v
Middleware
     |
     v
Controller
     |
     v
Service
     |
     v
Prisma
     |
     v
Database
```

### Route

Defines the endpoint.

``` js
router.post(
  "/",
  authenticate,
  authorize("USER"),
  validate(createIssueSchema),
  issueController.create
);
```

### Middleware

Handles common concerns:

-   Authentication
-   Authorization
-   Validation
-   Error handling

### Controller

Handles HTTP concerns:

``` text
req
res
params
body
status codes
```

The controller should not contain all business logic.

### Service

Contains business rules:

``` text
Can this user create the issue?
What SLA should be assigned?
Can the status change?
Can this technician resolve it?
Should an audit record be created?
```

This separation makes the backend easier to test and explain.

------------------------------------------------------------------------

# 6. Authentication Workflow

## Registration

``` text
User
 |
 | POST /api/auth/register
 v
Validation
 |
 v
Check email
 |
 v
Hash password
 |
 v
Create User
 |
 v
Return success
```

Password must never be stored directly.

``` text
password
   |
   v
bcrypt/argon2
   |
   v
hashed password
   |
   v
PostgreSQL
```

## Login

``` text
User
 |
 | email + password
 v
Validate
 |
 v
Find User
 |
 v
Compare password
 |
 v
Create JWT
 |
 v
Return token
```

JWT payload can contain:

``` json
{
  "userId": "123",
  "role": "TECHNICIAN"
}
```

Do not put sensitive information inside the JWT.

------------------------------------------------------------------------

# 7. Role-Based Authorization

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

Example:

``` text
authenticate()
      |
      v
req.user = {
    id,
    role
}
      |
      v
authorize("ADMIN")
```

If:

``` text
role = ADMIN
```

continue.

Otherwise:

``` text
403 Forbidden
```

Example:

``` js
router.post(
  "/admin/issues/:id/assign",
  authenticate,
  authorize("ADMIN"),
  adminController.assignIssue
);
```

------------------------------------------------------------------------

# 8. Core Issue Workflow

This is the most important workflow in FixFlow.

``` text
                     USER
                       |
                       | Create
                       v
                    [NEW]
                       |
                       | Admin reviews
                       v
                  [ASSIGNED]
                       |
                       | Technician accepts
                       v
                  [ACCEPTED]
                       |
                       | Technician starts
                       v
                 [IN_PROGRESS]
                       |
                       | Technician resolves
                       v
                  [RESOLVED]
                    /       \
                   /         \
              Verify         Reopen
                |               |
                v               |
             [CLOSED] <---------+
```

------------------------------------------------------------------------

# 9. State Transition Rules

Do not allow arbitrary status updates.

## User

Allowed:

``` text
RESOLVED -> CLOSED
RESOLVED -> REOPENED
```

## Technician

Allowed:

``` text
ASSIGNED -> ACCEPTED
ACCEPTED -> IN_PROGRESS
IN_PROGRESS -> RESOLVED
```

## Admin

Allowed:

``` text
NEW -> ASSIGNED
ASSIGNED -> ASSIGNED
ASSIGNED -> NEW
```

Admin can reassign a ticket without pretending that the technician
completed work.

## Invalid Examples

``` text
NEW -> CLOSED
NEW -> RESOLVED
CLOSED -> IN_PROGRESS
```

These should return:

``` http
409 Conflict
```

with a useful message.

------------------------------------------------------------------------

# 10. Issue Creation Workflow

``` text
User
 |
 | POST /api/issues
 v
Authenticate
 |
 v
Validate request
 |
 v
Validate location
 |
 v
Create Issue
 |
 +----> Determine SLA
 |
 +----> Create StatusHistory
 |
 +----> Create AuditLog
 |
 +----> Notify Admin
 |
 v
Return Issue
```

Example request:

``` json
{
  "title": "AC not working",
  "description": "AC is not cooling.",
  "categoryId": 3,
  "locationId": 12,
  "priority": "HIGH"
}
```

The backend should calculate:

``` text
createdAt = current time

priority = HIGH

SLA = 6 hours

deadline = createdAt + 6 hours
```

Do not trust the frontend to calculate security-sensitive business
values.

------------------------------------------------------------------------

# 11. Admin Assignment Workflow

``` text
Admin
 |
 | Open NEW issue
 v
Review issue
 |
 +--> Change priority
 |
 +--> Select technician
 |
 v
Assignment Service
 |
 +--> Check technician exists
 |
 +--> Check technician is active
 |
 +--> Create Assignment
 |
 +--> Update Issue status
 |
 +--> Create StatusHistory
 |
 +--> Create AuditLog
 |
 +--> Notify Technician
 |
 v
ASSIGNED
```

------------------------------------------------------------------------

# 12. Technician Workflow

``` text
Technician
     |
     v
GET /api/technician/issues
     |
     v
View assigned issues
     |
     v
Accept
     |
     v
ACCEPTED
     |
     v
Start Work
     |
     v
IN_PROGRESS
     |
     +--> Add work notes
     |
     +--> Upload photo
     |
     v
Resolve
     |
     v
RESOLVED
```

------------------------------------------------------------------------

# 13. User Verification Workflow

When technician marks an issue resolved:

``` text
RESOLVED
    |
    v
User receives notification
    |
    +----> "Issue fixed"
    |
    +----> "Still not fixed"
```

### If fixed

``` text
RESOLVED -> CLOSED
```

Then:

``` text
User gives rating
```

### If not fixed

``` text
RESOLVED -> REOPENED
```

The admin can then reassign it.

This prevents technicians from simply marking everything resolved
without user confirmation.

------------------------------------------------------------------------

# 14. Database Design

Core tables:

``` text
User
Department
Location
IssueCategory
Issue
Assignment
Comment
Attachment
StatusHistory
AuditLog
Rating
Notification
```

------------------------------------------------------------------------

# 15. User Table

``` text
User
----------------
id
name
email
passwordHash
role
departmentId
isActive
createdAt
updatedAt
```

Roles:

``` text
USER
TECHNICIAN
ADMIN
```

------------------------------------------------------------------------

# 16. Department

``` text
Department
----------------
id
name
description
createdAt
```

Examples:

``` text
Electrical
Plumbing
IT Support
HVAC
Civil
Housekeeping
```

------------------------------------------------------------------------

# 17. Location

``` text
Location
----------------
id
name
building
floor
room
createdAt
```

Example:

``` text
Block B
Floor 2
Room 204
```

------------------------------------------------------------------------

# 18. Issue Category

``` text
IssueCategory
----------------
id
name
departmentId
defaultSlaHours
createdAt
```

Example:

``` text
Internet
IT Support
4 hours
```

------------------------------------------------------------------------

# 19. Issue

This is the central table.

``` text
Issue
----------------
id
ticketNumber
title
description
status
priority

reporterId
categoryId
locationId

createdAt
updatedAt

slaDeadline
resolvedAt
closedAt
```

Potential status enum:

``` text
NEW
ASSIGNED
ACCEPTED
IN_PROGRESS
RESOLVED
REOPENED
CLOSED
```

Priority:

``` text
LOW
MEDIUM
HIGH
CRITICAL
```

------------------------------------------------------------------------

# 20. Assignment

Keep assignments separate from Issue.

``` text
Assignment
----------------
id
issueId
technicianId
assignedById
assignedAt
acceptedAt
completedAt
isActive
```

Why?

Because an issue may be reassigned.

Example:

``` text
Issue #1024

Technician A
   |
   | Reassigned
   v
Technician B
```

You preserve the history instead of overwriting it.

------------------------------------------------------------------------

# 21. Comment

``` text
Comment
----------------
id
issueId
userId
message
createdAt
updatedAt
```

Users and technicians can communicate inside the issue.

------------------------------------------------------------------------

# 22. Attachment

``` text
Attachment
----------------
id
issueId
uploadedById
fileUrl
fileType
createdAt
```

Do not store large files directly in PostgreSQL.

Use object storage later, such as:

``` text
Cloudinary
S3-compatible storage
Supabase Storage
```

Store the URL/reference in the database.

------------------------------------------------------------------------

# 23. Status History

``` text
StatusHistory
----------------
id
issueId
changedById
oldStatus
newStatus
reason
createdAt
```

Example:

``` text
10:20 AM
NEW -> ASSIGNED
Changed by Admin

10:31 AM
ASSIGNED -> ACCEPTED
Changed by Technician

11:00 AM
ACCEPTED -> IN_PROGRESS
Changed by Technician

1:40 PM
IN_PROGRESS -> RESOLVED
Changed by Technician
```

This is useful for analytics and debugging.

------------------------------------------------------------------------

# 24. Audit Log

Audit logs are broader than status history.

``` text
AuditLog
----------------
id
userId
issueId
action
oldValue
newValue
createdAt
```

Examples:

``` text
ADMIN_ASSIGNED_ISSUE
ADMIN_CHANGED_PRIORITY
TECHNICIAN_ACCEPTED
TECHNICIAN_RESOLVED
USER_REOPENED
ADMIN_REASSIGNED
```

------------------------------------------------------------------------

# 25. Rating

``` text
Rating
----------------
id
issueId
userId
score
feedback
createdAt
```

Example:

``` text
Score: 4/5
Feedback:
"Technician fixed the AC quickly."
```

Only allow rating after resolution/closure.

------------------------------------------------------------------------

# 26. Notification

``` text
Notification
----------------
id
userId
issueId
type
message
isRead
createdAt
```

Examples:

``` text
ISSUE_ASSIGNED
ISSUE_ACCEPTED
ISSUE_RESOLVED
ISSUE_REOPENED
SLA_WARNING
SLA_BREACHED
```

------------------------------------------------------------------------

# 27. API Design

## Authentication

``` http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## User Issues

``` http
POST   /api/issues
GET    /api/issues/my
GET    /api/issues/:id
POST   /api/issues/:id/comments
POST   /api/issues/:id/reopen
POST   /api/issues/:id/verify
POST   /api/issues/:id/rating
```

## Technician

``` http
GET   /api/technician/issues
GET   /api/technician/issues/:id
POST  /api/issues/:id/accept
POST  /api/issues/:id/start
POST  /api/issues/:id/resolve
POST  /api/issues/:id/notes
```

## Admin

``` http
GET   /api/admin/issues
GET   /api/admin/issues/:id
POST  /api/admin/issues/:id/assign
POST  /api/admin/issues/:id/reassign
PATCH /api/admin/issues/:id/priority

GET   /api/admin/users
PATCH /api/admin/users/:id/status

POST  /api/admin/categories
PATCH /api/admin/categories/:id

POST  /api/admin/locations
PATCH /api/admin/locations/:id

GET   /api/admin/analytics
GET   /api/admin/audit-logs
```

------------------------------------------------------------------------

# 28. API Request Example

## Create Issue

``` http
POST /api/issues
Authorization: Bearer <JWT>
Content-Type: application/json
```

``` json
{
  "title": "Water leakage",
  "description": "Water is leaking from the ceiling.",
  "categoryId": 2,
  "locationId": 8,
  "priority": "HIGH"
}
```

Response:

``` json
{
  "success": true,
  "data": {
    "ticketNumber": "FX-1024",
    "status": "NEW",
    "priority": "HIGH",
    "slaDeadline": "2026-09-27T18:00:00Z"
  }
}
```

------------------------------------------------------------------------

# 29. Controller vs Service Example

Bad architecture:

``` js
async function createIssue(req, res) {
    // 100 lines of business logic
    // database calls
    // SLA calculation
    // notifications
    // audit logs
}
```

Better:

``` js
async function createIssue(req, res, next) {
    try {
        const issue = await issueService.createIssue(
            req.user.id,
            req.body
        );

        res.status(201).json({
            success: true,
            data: issue
        });
    } catch (error) {
        next(error);
    }
}
```

Service:

``` js
async function createIssue(userId, data) {

    // validate category
    // calculate SLA
    // create issue
    // create history
    // create audit log
    // notification

}
```

The controller handles HTTP.

The service handles business logic.

------------------------------------------------------------------------

# 30. Error Handling

Use consistent responses.

### Validation

``` http
400 Bad Request
```

``` json
{
  "success": false,
  "message": "Title is required"
}
```

### Unauthenticated

``` http
401 Unauthorized
```

### Unauthorized role

``` http
403 Forbidden
```

### Issue not found

``` http
404 Not Found
```

### Invalid state transition

``` http
409 Conflict
```

Example:

``` json
{
  "success": false,
  "message": "A NEW issue cannot be marked as RESOLVED by a technician"
}
```

------------------------------------------------------------------------

# 31. SLA System

Recommended initial rules:

``` text
CRITICAL -> 2 hours
HIGH     -> 6 hours
MEDIUM   -> 24 hours
LOW      -> 72 hours
```

When issue is created:

``` text
createdAt
    +
SLA hours
    =
slaDeadline
```

Example:

``` text
Created: 10:00
Priority: HIGH
SLA: 6h

Deadline: 16:00
```

Status:

``` text
Current time < deadline - warning window
    -> WITHIN_SLA

Current time >= warning threshold
    -> SLA_WARNING

Current time > deadline
    -> SLA_BREACHED
```

Do not necessarily store `SLA_BREACHED` as the issue status. SLA
condition and issue workflow status are separate concepts.

------------------------------------------------------------------------

# 32. Duplicate Issue Detection

Initial implementation can be rule-based.

Compare:

``` text
category
location
time window
keywords
```

Example:

``` text
Issue A:
WiFi not working
Block A Floor 2

Issue B:
Internet unavailable
Block A Floor 2
```

Backend returns:

``` json
{
  "possibleDuplicates": [
    {
      "ticketNumber": "FX-1001",
      "reason": "Same location and category"
    }
  ]
}
```

Later enhancement:

``` text
Text
 ↓
Embedding
 ↓
Vector similarity
 ↓
Possible duplicate
```

This can become an AI extension without making AI mandatory for the core
product.

------------------------------------------------------------------------

# 33. Analytics

Admin dashboard should answer operational questions.

## What is currently pending?

``` text
NEW: 12
ASSIGNED: 9
IN_PROGRESS: 16
REOPENED: 4
```

## Which category causes the most issues?

``` text
Internet     42
Electrical   31
Plumbing     25
HVAC         18
```

## Which technicians have the most workload?

``` text
Technician A    12 active
Technician B     8 active
Technician C     5 active
```

## What is the average resolution time?

``` text
Average: 8.4 hours
```

## How many SLA breaches?

``` text
6%
```

------------------------------------------------------------------------

# 34. Pagination

Do not return 10,000 issues at once.

Use:

``` http
GET /api/admin/issues?page=1&limit=20
```

Response:

``` json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 248,
    "totalPages": 13
  }
}
```

Later support:

``` text
status
priority
category
location
technician
search
sort
```

Example:

``` http
GET /api/admin/issues?
page=1
&limit=20
&status=IN_PROGRESS
&priority=HIGH
```

------------------------------------------------------------------------

# 35. Database Indexes

Once the basic application works, add indexes for frequent queries.

Likely useful fields:

``` text
Issue.status
Issue.priority
Issue.reporterId
Issue.categoryId
Issue.locationId
Issue.createdAt
Assignment.technicianId
Notification.userId
StatusHistory.issueId
Comment.issueId
```

For example, the technician dashboard frequently asks:

``` text
Give me active issues assigned to technician X.
```

So `technicianId` should be indexed.

------------------------------------------------------------------------

# 36. Concurrency Considerations

An important case:

Two admins attempt to assign the same issue simultaneously.

Bad:

``` text
Admin A reads issue -> unassigned
Admin B reads issue -> unassigned

Admin A assigns Technician A
Admin B assigns Technician B

Final result becomes unpredictable.
```

Use a database transaction and enforce appropriate constraints.

The service should perform:

``` text
BEGIN TRANSACTION

check current assignment
create/update assignment
update issue
create history
create audit log

COMMIT
```

If something fails:

``` text
ROLLBACK
```

------------------------------------------------------------------------

# 37. Notifications

Version 1 can use in-app notifications.

Example:

``` text
Admin assigns issue
       |
       v
Notification created
       |
       v
Technician sees:
"You have been assigned FX-1024"
```

Later:

``` text
WebSocket
```

for real-time notifications.

Even later:

``` text
Email
Push notification
```

------------------------------------------------------------------------

# 38. Optional Redis

Do not start with Redis.

Add it after PostgreSQL + Express + React works.

Good Redis use cases:

``` text
1. Cache dashboard statistics
2. Cache categories/locations
3. Rate limiting
4. Notification queues
5. Background jobs
```

Avoid using Redis as the primary source of truth for issue data.

PostgreSQL remains the source of truth.

------------------------------------------------------------------------

# 39. Optional WebSockets

WebSockets can provide:

``` text
Admin assigns issue
       |
       v
Technician dashboard updates immediately
```

or:

``` text
Technician resolves issue
       |
       v
User dashboard updates immediately
```

Without WebSockets:

``` text
React -> API -> Database
React -> API -> Database
React -> API -> Database
```

With WebSockets:

``` text
Database event/business action
          |
          v
      WebSocket
          |
          v
        React
```

Build this only after the normal REST API works.

------------------------------------------------------------------------

# 40. Security Checklist

Implement:

``` text
[x] Password hashing
[x] JWT authentication
[x] Role-based authorization
[x] Request validation
[x] CORS configuration
[x] Helmet
[x] Environment variables
[x] Centralized error handling
[x] File type/size validation
[x] Rate limiting
```

Never:

``` text
[x] Store plaintext passwords
[x] Trust role sent by frontend
[x] Trust frontend-calculated SLA
[x] Allow arbitrary status transitions
[x] Return passwordHash
```

------------------------------------------------------------------------

# 41. Frontend Route Protection

Frontend routes:

``` text
/login

/user/dashboard
/user/issues/:id
/user/issues/create

/technician/dashboard
/technician/issues/:id

/admin/dashboard
/admin/issues
/admin/users
/admin/analytics
```

Use a `ProtectedRoute` component.

But remember:

> Frontend route protection is for user experience. Backend
> authorization is the actual security boundary.

A user should not be able to call:

``` http
POST /api/admin/issues/123/assign
```

just because they manually changed the React URL.

------------------------------------------------------------------------

# 42. Recommended Frontend Pages

## User

``` text
Login
Register
Dashboard
Create Issue
My Issues
Issue Details
Notifications
Profile
```

## Technician

``` text
Dashboard
My Work
Issue Details
Notifications
Profile
```

## Admin

``` text
Dashboard
All Issues
Issue Details
Technicians
Users
Categories
Locations
Analytics
Audit Logs
```

------------------------------------------------------------------------

# 43. MVP --- Build This First

Do NOT build everything immediately.

### Phase 1

Authentication:

``` text
Register
Login
JWT
Roles
```

### Phase 2

Issues:

``` text
Create issue
List issues
View issue
```

### Phase 3

Technician:

``` text
Assign
Accept
Start
Resolve
```

### Phase 4

User verification:

``` text
Verify
Reopen
Rate
```

### Phase 5

Admin:

``` text
Dashboard
Filters
Pagination
Analytics
```

### Phase 6

Engineering improvements:

``` text
Audit logs
SLA
Status history
Notifications
```

### Phase 7 --- Optional

``` text
Redis
WebSockets
Duplicate detection
Email
AI similarity
```

------------------------------------------------------------------------

# 44. Recommended 4-Day Build Plan

## Day 1 --- Backend Core

Build:

``` text
Express
Prisma
PostgreSQL

User
Department
Location
IssueCategory
Issue
```

Implement:

``` text
register
login
JWT
auth middleware
role middleware
create issue
get my issues
get issue
```

Goal:

> User can successfully create and view a maintenance ticket.

------------------------------------------------------------------------

## Day 2 --- Workflow

Implement:

``` text
Assignment
StatusHistory
Comment
```

Then:

``` text
Admin assigns
Technician accepts
Technician starts
Technician resolves
User verifies/reopens
```

Goal:

> Complete one issue from creation to closure.

------------------------------------------------------------------------

## Day 3 --- Frontend

Build:

``` text
Login
User Dashboard
Create Issue
Issue Details
Technician Dashboard
Admin Dashboard
```

Connect all APIs.

Goal:

> All three actors can use the system.

------------------------------------------------------------------------

## Day 4 --- Resume-Level Features

Add:

``` text
SLA
Audit logs
Pagination
Filtering
Analytics
Notifications
```

Then polish:

``` text
Error states
Loading states
Empty states
Responsive UI
README
Deployment
```

------------------------------------------------------------------------

# 45. The Complete End-to-End Example

Imagine a student reports:

``` text
AC not working
Block B
Room 204
```

## Step 1 --- User

``` text
POST /api/issues
```

Database:

``` text
Issue #FX-1024
Status = NEW
Priority = HIGH
SLA = 6 hours
```

System creates:

``` text
StatusHistory
AuditLog
Notification
```

------------------------------------------------------------------------

## Step 2 --- Admin

Admin sees:

``` text
NEW
FX-1024
AC not working
Block B / Room 204
HIGH
```

Admin assigns:

``` text
Technician Rahul
```

System:

``` text
Issue = ASSIGNED
Assignment = created
StatusHistory = created
AuditLog = created
Notification = created
```

------------------------------------------------------------------------

## Step 3 --- Technician

Rahul sees:

``` text
FX-1024
AC not working
HIGH
SLA: 4h 20m remaining
```

He accepts.

``` text
ASSIGNED
   ↓
ACCEPTED
```

Then starts work.

``` text
ACCEPTED
   ↓
IN_PROGRESS
```

------------------------------------------------------------------------

## Step 4 --- Resolution

Rahul adds:

``` text
"Compressor issue fixed and AC tested."
```

Uploads photo.

Then:

``` text
IN_PROGRESS
     ↓
RESOLVED
```

------------------------------------------------------------------------

## Step 5 --- User

User receives:

``` text
Your issue FX-1024 has been resolved.
```

They check the AC.

### If fixed:

``` text
RESOLVED
   ↓
CLOSED
```

Then:

``` text
Rating = 5
```

### If not fixed:

``` text
RESOLVED
   ↓
REOPENED
```

Admin can assign it again.

------------------------------------------------------------------------

# 46. What You Should Be Able to Explain in an Interview

You should be able to draw this on a whiteboard:

``` text
             React
               |
               v
           Express
               |
       +-------+-------+
       |       |       |
      Auth    Role   Validate
       |       |       |
       +-------+-------+
               |
          Controller
               |
            Service
               |
            Prisma
               |
          PostgreSQL
```

Then explain:

### Question:

"Why did you separate controllers and services?"

Answer:

> "Controllers handle HTTP concerns such as requests and responses,
> while services contain business rules. This keeps the workflow logic
> independent of the API layer and makes it easier to test and
> maintain."

### Question:

"How did you implement authorization?"

Answer:

> "I authenticate the JWT first and attach the user to the request. A
> role middleware then checks whether the actor is allowed to access the
> endpoint. I also enforce ownership and workflow rules inside the
> service layer."

### Question:

"How do you prevent invalid status changes?"

Answer:

> "I defined allowed state transitions based on the actor. For example,
> a technician can move an issue from ASSIGNED to ACCEPTED to
> IN_PROGRESS to RESOLVED, while a user can verify or reopen a resolved
> issue."

### Question:

"How do you track reassignment?"

Answer:

> "Assignments are stored separately from the issue, so reassignment
> doesn't overwrite historical information. Status history and audit
> logs preserve the complete timeline."

### Question:

"How do you calculate SLA?"

Answer:

> "The backend calculates the SLA deadline based on priority/category
> when the issue is created. The frontend only displays the result; it
> doesn't determine the deadline."

------------------------------------------------------------------------

# 47. Final Product Definition

### FixFlow

**Problem:**

Maintenance requests are fragmented across calls, messages and
spreadsheets, resulting in lost requests, unclear ownership, delayed
resolutions and poor visibility.

**Solution:**

A centralized multi-role platform that manages the complete maintenance
lifecycle:

``` text
REPORT
  ↓
PRIORITIZE
  ↓
ASSIGN
  ↓
ACCEPT
  ↓
WORK
  ↓
RESOLVE
  ↓
VERIFY
  ↓
CLOSE
```

### Core technologies

``` text
Frontend:
React

Backend:
Node.js
Express.js

Database:
PostgreSQL

ORM:
Prisma

Authentication:
JWT
bcrypt

Optional:
Redis
WebSockets
Object Storage
```

### Core engineering concepts demonstrated

``` text
REST APIs
Routes
Controllers
Services
Middleware
JWT
RBAC
Database design
Prisma relations
Transactions
State machines
SLA logic
Audit logging
Pagination
Filtering
Notifications
Analytics
```

### Most important principle

**Don't build 50 features. Build the core workflow properly.**

The minimum impressive version is:

``` text
User reports issue
       ↓
Admin assigns technician
       ↓
Technician accepts
       ↓
Technician resolves
       ↓
User verifies/reopens
       ↓
Admin sees complete history
```

Everything else should strengthen that workflow.
