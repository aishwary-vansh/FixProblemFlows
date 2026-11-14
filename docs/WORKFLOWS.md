# Workflows and Business Rules

## Issue status state machine (as implemented)

```
        create (USER)
             |
           [NEW]
             | assign (ADMIN)
         [ASSIGNED] <---- assign again (ADMIN) from any status
             | accept (assignee TECHNICIAN)
         [ACCEPTED]
             | start (assignee TECHNICIAN)
        [IN_PROGRESS]
             | resolve (assignee TECHNICIAN)
         [RESOLVED]
          /        \
 close (reporter)   reopen (reporter)
      |                  |
  [CLOSED]          [REOPENED]
```

| Action | Endpoint | Who | From status | To status |
|---|---|---|---|---|
| Create | POST `/api/issues` | USER | none | NEW |
| Assign | PATCH `/:id/assign` | ADMIN | any (not enforced) | ASSIGNED |
| Accept | PATCH `/:id/accept` | assignee | ASSIGNED | ACCEPTED |
| Start | PATCH `/:id/start` | assignee | ACCEPTED | IN_PROGRESS |
| Resolve | PATCH `/:id/resolve` | assignee | IN_PROGRESS | RESOLVED |
| Close | PATCH `/:id/close` | reporter | RESOLVED | CLOSED |
| Reopen | PATCH `/:id/reopen` | reporter | RESOLVED | REOPENED |

Observations:

- Transitions are hand-coded one function per action in `backend/src/services/issue.services.ts`. There is no shared transition table.
- `REOPENED` is a dead end today. Nothing moves an issue out of it except an admin assigning again (which sets `ASSIGNED`). There is no technician "reject" action.
- No transition writes history, so there is no record of who changed what or when. Only `updatedAt` changes.
- Failed rules throw plain `Error`s, returned as `400` (or `401` for accept).

## Role capabilities

| Capability | USER | TECHNICIAN | ADMIN |
|---|---|---|---|
| Register (self-service) | yes, always as USER | no | no |
| Create issue | yes | no | no |
| List issues | own reported | own assigned | all |
| View issue detail | own reported | own assigned | all |
| Upload attachment | own reported | own assigned | any |
| Assign issue | no | no | yes |
| Accept, start, resolve | no | assigned only | no |
| Close, reopen | reporter only | no | no |
| List technicians | no | no | yes |

How roles are granted: a user registers as `USER`. To become ADMIN or TECHNICIAN, someone edits the database, using `backend/make-admin.ts` or `backend/make-technician.ts` (both have hard-coded targets) or SQL. There is no admin UI for user management yet.

## End-to-end flow

1. USER signs up, logs in, opens "My Issues", clicks create, fills the modal (title, description, location, category, priority, optional photo). The frontend posts the issue, then posts the photo to `/:id/attachments`.
2. ADMIN opens "All Issues", picks a technician from a dropdown for a `NEW` issue. Frontend calls `/assign`.
3. TECHNICIAN opens "My Tasks", clicks Accept, then Start, then Resolve.
4. USER opens the issue detail and clicks Close (satisfied) or Reopen (not fixed).

## Validation rules

Registration: name at least 2 chars. Email valid, lowercased, trimmed. Password 6 to 50 chars with an uppercase letter, a lowercase letter and a special character. `confirmPassword` equals `password`. Phone matches `^[6-9]\d{9}$`. `termsAccepted` must be true.

Issue creation: title 1 to 100 (the message says "at least 5", the code enforces 1). Description 5 to 1000 (the message says 10). Location 2 to 200. Category and priority are enums with defaults.

## Target workflow (not built)

The product spec adds: server-enforced transition table per role, an `IssueEvent` timeline, comments, in-app notifications, requester-verified closure prompt with auto-escalation, SLA deadlines by priority, duplicate merging, and explainable auto-dispatch (specialization, workload, shift). See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
