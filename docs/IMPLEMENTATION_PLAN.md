# FixFlow Implementation Plan

Companion to [PRODUCT_SPEC.md](../PRODUCT_SPEC.md). This plan maps the current codebase to the spec, phase by phase.

**Total: 9 phases (0-8).** Phases 0-3 are the foundation. Phases 4-7 are the differentiators that make it resume-worthy. Phase 8 is launch.

Rough effort assumes one developer working part-time (~15 h/week).

| Phase | Theme | Effort | Resume signal |
|---|---|---|---|
| 0 | Repo hygiene + tooling + CI skeleton | 3-4 days | Professional repo, CI badge |
| 1 | Multi-tenancy, invites, object storage, error handling | 1.5-2 weeks | SaaS architecture, tenant isolation tests |
| 2 | State machine, timeline, comments, notifications, tests | 1.5-2 weeks | Domain modeling, test coverage |
| 3 | Staging deploy, Sentry, legal pages (billing moved to 7b) | 3-4 days | Live demo link |
| 4 | Locations, assets, QR reporting, verified closure | 1.5 weeks | Headline feature #1 |
| 5 | Smart dispatch, SLA engine, duplicate detection | 2 weeks | Algorithms, background jobs |
| 6 | Preventive maintenance, analytics, status board | 1.5-2 weeks | Data + charts |
| 7 | Photo AI triage, offline PWA | 1.5-2 weeks | AI integration, offline sync |
| 7b | Billing (Razorpay): plans, limits, webhooks | 1.5 weeks | Payments, webhooks, idempotency |
| 8 | Production launch + pilots | ongoing | Real users |

Total: about 12-15 weeks part-time.

---

## Where the code stands today

**Already done**

- Express 5 + Prisma 7 + Postgres; React 19 + Vite + RTK.
- JWT auth, bcrypt hashing, zod validation on auth and issue input.
- All 7 statuses exist. Transitions are hand-coded per endpoint (`accept`, `start`, `resolve`, `close`, `reopen`).
- `IssueCategory`, `Priority` and `TechnicianSpecialization` enums exist.
- Photo upload with multer (local disk).
- Role dashboards: User, Technician, Admin.

**Gaps and problems to fix**

| Area | Problem | Fixed in |
|---|---|---|
| Repo | One-off scripts (`make-admin.ts`, `make-technician.ts`, `reset-password.ts`) and compiled `prisma7.config.js/.d.ts/.map` are committed. Root `.gitignore` is missing. `uploads/` and `fixflow.session.sql` are untracked. | 0 |
| Repo | No `.env.example`, no seed, no Docker Compose, `npm test` is a stub. | 0 |
| Security | `cors()` allows all origins. `/test-db` leaks error messages. No rate limiting. | 0-1 |
| Security | Sequential `Int` IDs make IDs guessable. Switch to `cuid`/`uuid` with the tenancy migration. | 1 |
| API | Services `throw new Error(...)`. Controllers can't tell 404 from 403 from 409. No central error handler or consistent error shape. | 1 |
| API | No pagination, filtering or search on `GET /issues`. | 1-2 |
| Tenancy | No `Organization`. Admin sees every issue in the database. Roles are global (`USER`/`TECHNICIAN`/`ADMIN`). | 1 |
| Storage | Files live on local disk under `/uploads`, served publicly with no auth. | 1 |
| Frontend | `baseURL` is hard-coded to `http://localhost:5000/api`. The token sits in `localStorage`. | 0-1 |
| Lifecycle | No central state machine, no `IssueEvent`, no comments, no notifications. | 2 |

---

## Phase 0: Repo hygiene and tooling (3-4 days)

**Goal:** a repo a reviewer can clone and run in five commands.

1. Commit the current work in logical Conventional Commits (`feat:`, `fix:`, `chore:`).
2. Add a root `.gitignore`. Remove from git: `prisma7.config.js`, `.d.ts`, `.map`, `uploads/`, `*.sql` scratch files and `.vscode/`.
3. Replace `make-admin.ts`, `make-technician.ts` and `reset-password.ts` with `prisma/seed.ts`. The seed creates a demo org, one user per role, and about 20 sample issues across statuses.
4. Add `.env.example` to `backend/` and `frontend/`. Frontend reads `VITE_API_URL`.
5. Add `docker-compose.yml` with `db` (postgres:16), `api` and `web`. Add a `Dockerfile` for the API.
6. Tooling: ESLint + Prettier for the backend, plus a `typecheck` script in both apps. Add Vitest to the backend (Vitest + Supertest) and to the frontend (Vitest + Testing Library).
7. GitHub Actions `ci.yml`: install, lint, typecheck, build, test for both apps. Run backend tests against a Postgres service container.
8. Remove `/test-db`. Add `GET /health` that checks the DB.
9. Restrict CORS to `CORS_ORIGIN` from env.

**Done when:** `git clone && cp .env.example .env && docker compose up && npm run seed` works, and CI is green.

---

## Phase 1: Multi-tenancy, invites, storage, API foundation (1.5-2 weeks)

**Goal:** a real SaaS skeleton. This is the biggest schema change, so do it before adding features.

> **Status (2026-10-27): mostly done.**
>
> **Done:** Organization/Membership/Invite schema with a data-preserving migration; tenant Prisma extension; signup creates an org; invites; members admin; `AppError` + central error handler; `validate()` middleware; pagination/filter/search plus `/issues/stats`; local + S3 storage with signed URLs and magic-byte checks; rate limits; pino logging; `/health`; seed script.
>
> **Deviations:** IDs stay `Int` (tenant scoping plus 404-on-invisible covers enumeration; switching to cuid would have broken existing data). Uploads go through the API, not presigned PUT, so the server can check file contents.
>
> **Left:** RTK Query migration; httpOnly-cookie auth; DB-backed Supertest isolation suite (needs a test database, Phase 0 CI); org switcher UI (the API already has `POST /auth/switch-org`).

**Schema**

- `Organization { id, name, slug, createdAt, publicBoardEnabled }`
- `Membership { id, userId, orgId, role: OWNER|ADMIN|TECHNICIAN|REQUESTER, specialization?, isActive }`. Roles move from `User` to `Membership`, so one user can belong to several orgs.
- `Invite { id, orgId, email?, role, tokenHash, expiresAt, acceptedAt? }`
- Add `orgId` to `Issue`, `Attachment` and every future table. Index `(orgId, status)` and `(orgId, createdAt)`.
- Switch primary keys to `cuid()` (the database is dev-only, so reset migrations now).

**Backend**

1. `AppError` class (`NotFound`, `Forbidden`, `Conflict`, `Validation`) plus a central error middleware. Error shape: `{ error: { code, message, details? } }`.
2. Zod validation middleware: `validate({ body, query, params })`.
3. Tenant context: JWT carries `userId` and `orgId`. Middleware loads the membership and sets `req.ctx = { userId, orgId, role }`.
4. **Prisma client extension** that injects `where: { orgId }` on every query for tenant models. Services use `getTenantPrisma(orgId)`.
5. Auth flow: `POST /auth/signup` creates an org plus its Owner. `POST /invites` (Admin+) returns a link. `POST /invites/:token/accept` creates the membership.
6. Object storage: `StorageProvider` interface with S3/R2 (`@aws-sdk/client-s3`) and a local driver for dev. Uploads go through presigned URLs. Reads use short-lived signed URLs. Validate type by magic bytes and enforce a max size.
7. `GET /issues` with cursor pagination, `status`/`priority`/`category`/`assignee` filters and `q` search.
8. `express-rate-limit` on `/auth/*`.
9. Logging with `pino-http`.

**Frontend**

- Signup creates an org. Add an accept-invite page and an Admin members page (invite, change role, deactivate).
- Move to RTK Query for the API layer.
- Store the token in an httpOnly cookie (preferred) or keep it in memory with a refresh token.

**Tests:** tenant isolation suite. Org A cannot read, update or list org B's issues, attachments or members, through any endpoint.

---

## Phase 2: Lifecycle, timeline, comments, notifications (1.5-2 weeks)

> **Status (2026-10-27): done (kept simple).** State machine in `backend/src/domain/issueStateMachine.ts` with unit tests; `POST /issues/:id/transitions` (old PATCH routes kept as shortcuts); timeline events, comments and notifications are written in one transaction with each change; the issue page shows the timeline, comments and the caller's allowed actions; the bell polls every 30 s. **Not done:** SSE upgrade, Supertest integration tests and the coverage badge (these need the Phase 0 test database and CI).

**Schema:** `IssueEvent { id, orgId, issueId, actorId?, type, fromStatus?, toStatus?, meta Json, createdAt }`, `Comment`, `Notification { id, orgId, userId, type, issueId, readAt?, createdAt }`.

1. **State machine module** (`domain/issueStateMachine.ts`). A pure function `canTransition(from, to, role, ctx)` driven by a transition table. Replace the 5 per-action endpoints with `POST /issues/:id/transitions { to, note? }`, and keep thin aliases if the frontend needs them.
   - NEW → ASSIGNED (Admin)
   - ASSIGNED → ACCEPTED (assignee)
   - ACCEPTED → IN_PROGRESS (assignee)
   - IN_PROGRESS → RESOLVED (assignee)
   - RESOLVED → CLOSED (reporter or Admin)
   - RESOLVED → REOPENED (reporter)
   - REOPENED → ASSIGNED (Admin)
2. Each transition runs in one `prisma.$transaction`: update the issue, write an `IssueEvent`, fan out notifications.
3. Comments: `GET/POST /issues/:id/comments`.
4. Notifications: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`. A bell with unread count, polled every 30 s. Upgrade to SSE (`GET /notifications/stream`) at the end of the phase.
5. Frontend: timeline + comments on `IssueDetails`, notification dropdown, toasts, and skeleton/empty/error states everywhere.

**Tests:** unit tests for every row in the transition table, including illegal ones. Supertest integration tests for the full happy path. Target 70%+ backend coverage and add the badge.

---

## Phase 3: Billing and staging deploy (1.5 weeks)

> **Reordered (2026-10-28):** billing (steps 1-7 below) now runs as Phase 7b, after AI triage and the PWA and before launch. Phase 3 keeps only the staging deploy, Sentry and legal pages (steps 8-9).

**Schema:** `Subscription { orgId unique, plan: FREE|PRO|BUSINESS, status: TRIALING|ACTIVE|PAST_DUE|CANCELED, providerSubId, currentPeriodEnd, trialEndsAt }`, `BillingEvent { providerEventId unique, type, payload, processedAt }`.

1. `config/plans.ts` holds the limits per plan: technicians, sites, issues/month, and feature flags (AI triage, SLA, PM, public board).
2. `checkPlanLimit(orgId, feature)` is the one helper used by services. It throws `AppError.PaymentRequired` (402).
3. `BillingProvider` interface with a `RazorpayProvider` implementation: `createCheckout`, `cancel`, `verifyWebhook`.
4. `POST /billing/webhook` uses a raw body, verifies the HMAC signature, inserts the `BillingEvent` (unique constraint gives idempotency), then updates the `Subscription`.
5. New orgs get a 14-day Pro trial. A daily job moves expired trials to FREE.
6. PAST_DUE shows a banner. After a 7-day grace period, the org becomes read-only through middleware that blocks writes.
7. Billing page: current plan, usage meters, upgrade button.
8. **Deploy staging:** API on Render/Railway (Docker), web on Vercel, DB on Neon. Run `prisma migrate deploy` on release. Add Sentry to both apps.
9. Legal pages: Terms, Privacy, Refund (Razorpay requires them).

**Tests:** webhook signature verification (valid and tampered), duplicate event ignored, limit enforced after downgrade.

---

## Phase 4: Locations, assets, QR, verified closure (1.5 weeks)

> **Status (2026-11-03): locations and join link done, kept simple. The plan below is the original; these changes replace parts of it.**
>
> **Done:** `Location` holds two levels only, buildings and their floors, and admins set it up by pasting a list on the Locations page. The report form has building and floor dropdowns plus a required "Room or exact spot" box. `Issue.location` stays as readable text ("Block A · 2nd Floor · Room 204") and `Issue.locationId` stores the picked building or floor for grouping. Each org has a reusable join link and QR on the Members page, which grants the Requester role only, can be replaced or turned off, and needs an account (no guest reports).
>
> **Update (2026-11-10):** auto-close and location filters and reports are done. Instead of one QR per floor (too many codes on a big campus), admins create **QR report points** for whichever places they choose; each can preselect a building or floor and an exact spot. Also added: audit log, owner data export and organization deletion, a platform console (`PLATFORM_ADMIN_USER_IDS`), a profile page with password change, backend ESLint, GitHub Actions CI and optional Sentry.
>
> **Not done:** assets.

**Schema:** `Location { id, orgId, parentId?, type: SITE|BUILDING|FLOOR|ROOM, name, publicToken }` (a tree), `Asset { id, orgId, locationId, name, category, purchaseDate?, cost? }`. `Issue` gains `locationId`, `assetId?` and `reporterContact?`. The free-text `location` field goes away.

1. Admin CRUD for the location tree and assets, with a tree view in the UI.
2. QR generation (`qrcode` package). Printable PDF sheet per building.
3. Public route `/r/:publicToken` shows a login-free form with the location prefilled: photo, one line, optional name/phone. Rate limit by IP and token. Add a honeypot field. The requester gets a tracking link `/t/:trackingToken` to see status and verify.
4. **Verified closure:** on RESOLVED, notify the requester, who sees Fixed / Not fixed. Fixed → CLOSED. Not fixed → REOPENED, auto-escalate to Admin, and record against the technician. Auto-close after N days without a response.
5. Store `firstTimeFixRate` inputs for analytics later.

---

## Evidence-based workflow (added 2026-11-03)

> **Done:** technicians can decline an assigned issue with a reason (it returns to `NEW`); `ON_HOLD` needs a reason and pauses the deadline; resolving needs a fix note and a new after photo, with optional cost and minutes; reopening needs a note; the reporter sees the fix note and before/after photos when verifying.
>
> **Known gap:** `repairCost` and `repairMinutes` are hidden from requesters in the UI only; the API still returns them.

## Phase 5: Smart dispatch, SLA, duplicates (2 weeks)

> **Status (2026-11-04): SLA, dispatch and duplicates done, kept simple.**
>
> **Duplicates:** the report form lists open issues at the chosen floor or building (same category, or any category for General) and offers "Me too". Followers can see the issue and get its status alerts. Admins can close an issue as a duplicate of another; its reporter and followers move to the original. Reports leave duplicates out. No text matching or AI.
>
> **Done:** fixed deadlines per priority in `domain/sla.ts`; overdue check every 5 minutes in `jobs/overdue.job.ts`, which alerts once per issue; countdown chip, "Overdue only" filter and overdue dashboard card; admin priority change; scoring in `domain/dispatch.ts` with top 3 suggestions on the issue page; optional auto-assign per org.
>
> **Deviations from the design below:** no `SlaPolicy` table (constants in code); no `AssignmentLog` (the reason is stored in the `ASSIGNED` timeline event); no pg-boss (`setInterval`); no shift hours or building match; suggestions appear on the issue page, not in the list dropdown, to avoid one request per row.

**Schema:** `TechnicianProfile { membershipId, skills[], shiftStart, shiftEnd, buildingIds[] }`, `AssignmentLog { issueId, technicianId, score, reasons Json, auto: bool }`, `SlaPolicy { orgId, priority, responseMins, resolveMins }`. `Issue` gains `responseDueAt`, `resolveDueAt`, `breachedAt?`, `parentIssueId?` and `reportCount`.

1. **Dispatch scorer** (`domain/dispatch.ts`), a pure and fully unit-tested function. Score = skill match + building match + on-shift − open workload × weight. It returns the score plus human-readable reasons. Auto-assign on create (org setting), or show the top 3 suggestions to the Admin.
2. **SLA engine:** compute due dates on create from the policy. A job runner (`pg-boss`, which uses Postgres so no Redis is needed) checks every minute: mark overdue, notify, escalate to Admin. Frontend shows countdown chips with colors.
3. **Duplicate detection:** on create, look for an open issue with the same `locationId` + `category` within a configurable window. If found, link as a child and increment `reportCount`. Show the reporter "already reported, you'll be notified". Notify all linked reporters on resolve.

---

## Phase 6: Preventive maintenance, analytics, status board (1.5-2 weeks)

> **Status (2026-11-03): reports and pilot basics done early, kept simple. Preventive maintenance and the status board are not started.**
>
> **Done:** Reports page for admins covering issues reported in the last 7, 30, 90 or 365 days. It shows counts, average time to fix, overdue and reopen rates, average rating, repair cost, counts by building and category, and one row per technician; the maths is in `domain/analytics.ts`. CSV export is protected against spreadsheet formulas. Reporters can rate a fix 1 to 5 when they confirm it. Resolved issues close automatically after 7 days with no reply (`jobs/autoClose.job.ts`). Issues can be filtered by building or floor. Admins can make the work steps (accept, start, hold, resolve with an after photo) for technicians who report by phone.
>
> **Pulled forward from Phase 7:** web push alerts. The app is installable (manifest plus `public/sw.js`). Each user turns alerts on per device from the bell menu, and logging out turns them off. `jobs/push.job.ts` sends committed notifications every 10 seconds, so a rolled-back change never alerts anyone. Alerts are off when `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are not set.

1. `MaintenanceSchedule { assetId, rrule/intervalDays, template, nextRunAt }`. A pg-boss job creates issues when due.
2. Asset page: failure history, total downtime, total repair cost (add `cost` and `downtimeMins` to resolution). Flag "consider replacing" when repair cost exceeds X% of asset cost or failures exceed N in 6 months.
3. Analytics API using SQL aggregates (Prisma `$queryRaw` where needed): MTTR, SLA compliance %, first-time-fix rate, workload per technician, hotspot locations, cost per asset. Use date range filters.
4. Dashboard with Recharts. CSV export from the server, PDF export from the client.
5. Public status board `/status/:orgSlug` (if enabled): open count per site, average fix time. Cache it.

---

## Phase 7: Photo AI triage and offline PWA (1.5-2 weeks)

1. **AI triage:** after a photo upload, call the Claude vision API (`claude-sonnet-5-5`) with a structured prompt. Validate the JSON output with zod: `{ category, priority, skill, summary, confidence }`. Show it as an editable suggestion and never auto-apply it. Plan-gated, with timeout/fallback, and log suggestion-vs-final for an accuracy metric.
2. **PWA:** `vite-plugin-pwa`, manifest and icons. A service worker caches the app shell.
3. **Offline queue for technicians:** IndexedDB (`idb`) outbox of transitions, comments and photos. Sync on reconnect. Each request carries an `Idempotency-Key` header. The backend stores keys in an `IdempotencyKey` table and replays the stored response. Show a "pending sync" indicator.

---

## Phase 8: Launch and pilots (ongoing)

1. Custom domain + HTTPS, production Neon branch with backups, uptime monitor (Better Stack/UptimeRobot).
2. Razorpay live mode after KYC.
3. README: pitch, GIF per role, architecture diagram, ER diagram, five-command setup, demo credentials, live link, coverage + CI badges.
4. Onboard 3-5 pilots (your college hostel, apartment society, a local clinic). Collect feedback in-app and iterate.
5. Write a short case study and blog post covering dispatch scoring, tenant isolation and offline sync. These double as interview talking points.

---

## Cross-cutting rules (every phase)

- Business rules live in services and `domain/` (pure functions). Controllers only parse, call and respond.
- Every new endpoint ships with a zod schema, an ownership/tenant check and an integration test.
- Every phase ends with: CI green, staging deployed (from Phase 3 on), README updated, and a tagged release (`v0.x`).
- Keep OpenAPI docs current (`zod-to-openapi` + Swagger UI at `/docs`).

## If time is short

Minimum resume-worthy cut: **Phases 0, 1, 2, 4, 5 plus a deploy.** That is tenancy, state machine, QR reporting, verified closure, explainable dispatch and SLA, with tests and CI. Billing (3) and AI/PWA (7) are strong extras, but the differentiators are what interviewers ask about.
