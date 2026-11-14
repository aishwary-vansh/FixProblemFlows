# Database

PostgreSQL, managed with Prisma 7. Schema file: `backend/prisma/schema.prisma`. Generated client: `backend/src/generated/prisma/` (generator `prisma-client`, output `../src/generated/prisma`). Connection: `DATABASE_URL` through `@prisma/adapter-pg` in `src/config/prisma.ts`.

## Enums

| Enum | Values |
|---|---|
| `Role` | `USER`, `TECHNICIAN`, `ADMIN` |
| `IssueStatus` | `NEW`, `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REOPENED` |
| `IssueCategory` | `ELECTRICAL`, `PLUMBING`, `CARPENTRY`, `CIVIL`, `HVAC`, `IT`, `GENERAL` |
| `Priority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `TechnicianSpecialization` | `ELECTRICAL`, `PLUMBING`, `CARPENTRY`, `CIVIL`, `HVAC`, `IT`, `GENERAL` (same values as `IssueCategory`, separate enum) |

## Models

### User

| Field | Type | Notes |
|---|---|---|
| id | Int, PK, autoincrement | |
| name | String | |
| email | String, unique | stored lowercase and trimmed by the validator |
| passwordHash | String | bcrypt, cost 10 |
| phone | String | validated as Indian mobile `^[6-9]\d{9}$` on register |
| role | Role, default `USER` | only changeable by scripts or SQL today |
| specialization | TechnicianSpecialization?, nullable | only meaningful for technicians |
| isActive | Boolean, default true | used to filter technicians, not checked at login |
| createdAt, updatedAt | DateTime | |

Relations: `reportedIssues` (Issue[] via `reportedIssues`), `assignedIssues` (Issue[] via `assignedIssues`).

### Issue

| Field | Type | Notes |
|---|---|---|
| id | Int, PK, autoincrement | |
| title | String | max 100 chars (validator) |
| description | String | 5 to 1000 chars (validator) |
| location | String | free text, 2 to 200 chars. Not a model yet |
| status | IssueStatus, default `NEW` | |
| priority | Priority, default `MEDIUM` | |
| category | IssueCategory, default `GENERAL` | |
| reporterId | Int | FK to User, required |
| assigneeId | Int? | FK to User, set on assign |
| createdAt, updatedAt | DateTime | |

Relations: `reporter`, `assignee` (both User), `attachments` (Attachment[]).

### Attachment

| Field | Type | Notes |
|---|---|---|
| id | Int, PK | |
| issueId | Int | FK to Issue |
| fileName | String | original file name |
| fileUrl | String | `/uploads/issues/<generated name>` |
| mimeType | String | |
| fileSize | Int | bytes |
| createdAt | DateTime | |

There is no `uploadedById`, so you cannot tell who uploaded a file.

## Relationship diagram

```
User 1 ---< Issue (reporterId)   "reportedIssues"
User 1 ---< Issue (assigneeId)   "assignedIssues"  (optional)
Issue 1 ---< Attachment
```

No indexes beyond primary keys and `User.email`. No cascade rules are declared.

## Migrations (backend/prisma/migrations)

1. `20260927133756_create_user` creates `User` and `Role`
2. `20260928051909_add_phone_to_user` adds `phone`
3. `20260929052015_add_issue_model` creates `Issue`, `IssueStatus`, `Priority`
4. `20261002072210_add_issue_attachments` creates `Attachment`
5. `20261008032427_add_issue_category_technician_specialization` adds `IssueCategory`, `TechnicianSpecialization`, `Issue.category`, `User.specialization` (untracked in git at snapshot time)

## Prisma config

`backend/prisma7.config.ts` reads `DATABASE_URL` and `SHADOW_DATABASE_URL` through `dotenv/config`. Note the file name is `prisma7.config.ts`, not the default `prisma.config.ts`, so Prisma CLI commands need `--config prisma7.config.ts` unless a default is set up.

```bash
npx prisma migrate dev --config prisma7.config.ts --name <name>
npx prisma generate --config prisma7.config.ts
```

## Planned schema changes

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Expected additions: `Organization` (and `orgId` on every table), `Invite`, `IssueEvent` (timeline), `Comment`, `Notification`, `Location`, `Asset`, `AssignmentLog`, `Subscription`/`BillingEvent`, SLA fields on `Issue`, and `uploadedById` on `Attachment`.
