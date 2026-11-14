# FixFlow: Product Spec and Roadmap

FixFlow is a multi-tenant SaaS for maintenance and facility management at small institutions (colleges, hostels, apartment societies, small offices, clinics). Everything happens inside the app: no WhatsApp, SMS or third-party chat integrations. Reporting, assignment, notifications, verification and analytics all live in the web app (installable as a PWA).

**Pitch:** Scan a QR, report in 10 seconds, get auto-routed to the right technician, tracked against an SLA, and verified by the person who reported it.

---

## 1. Goals

1. A real product people use, not a CRUD demo: low-friction reporting, fast dispatch, trustworthy closure.
2. A deployable, billable SaaS: multi-tenant, subscription plans, payment gateway, production hosting.
3. A resume-grade codebase: tests, CI, documented architecture, security hardening, live demo.

## 2. Target users

| Role | Needs |
|---|---|
| Requester (resident, student, staff) | Report fast, see progress, confirm the fix |
| Technician | Clear task list, simple status updates, photos, works on a phone |
| Admin / Facility manager | Assign work, see overdue items, understand trends, justify budget |
| Owner | Manage organization, billing, members |

## 3. Core features (MVP)

### 3.1 Multi-tenancy and onboarding
- `Organization` model; every table scoped by `orgId`.
- Signup creates an organization plus its first Owner.
- Admins invite members via in-app invite link (token). No public role selection.
- Roles per org: Owner, Admin, Technician, Requester.
- Tenant isolation enforced centrally (Prisma client extension), with tests proving org A cannot read org B.

### 3.2 Issue lifecycle
- Statuses: NEW, ASSIGNED, ACCEPTED, IN_PROGRESS, RESOLVED, CLOSED, REOPENED.
- Server-enforced state machine: legal transitions per role, rejected otherwise.
- Comments and an activity timeline (`IssueEvent`: who, what, when) on every issue.
- Attachments (photos) stored in object storage (S3 / Cloudflare R2), not local disk.

### 3.3 In-app notifications
- Notification bell with unread count, per-user inbox.
- Triggers: assigned, status changed, comment added, overdue, reopened, verification requested.
- Polling first, upgrade to SSE/WebSocket for real-time.

### 3.4 Billing
- Plans: Free, Pro, Business with enforced limits (technicians, sites, issues/month, features).
- Payment gateway: Razorpay Subscriptions (India) behind a `BillingProvider` interface so Stripe can be added.
- Hosted checkout only; webhooks are the source of truth; signature verification and idempotent handling (`BillingEvent.providerEventId` unique).
- States: TRIALING, ACTIVE, PAST_DUE, CANCELED. Past due means banner, then read-only after a grace period. Data is never deleted.
- 14-day Pro trial, no card required.
- Single server-side helper: `checkPlanLimit(orgId, feature)`.

## 4. Differentiating features

All self-contained in the app.

1. **QR-per-location reporting.** Location tree (Building, Floor, Room) and Assets. Print a QR per room/asset. Scanning opens a prefilled report form (location known) with photo and one line, no login required (rate-limited, with a lightweight OTP-free token).
2. **Requester-verified closure.** Technician marks RESOLVED; requester sees a Fixed / Not fixed prompt in the app. "Not fixed" auto-reopens and escalates. Produces a real quality metric per technician.
3. **Smart dispatch with explanations.** Score technicians by specialization, current workload, shift hours and assigned building. Store the reason in an `AssignmentLog` and show it ("Assigned to Ravi: plumbing, 2 open tasks, on shift").
4. **Duplicate and cluster detection.** Same location + category + time window merges into one issue with a "N reports" badge; all reporters are notified on resolution.
5. **SLA engine.** Deadlines by priority, countdown timers, overdue flags, auto-escalation to admin.
6. **Preventive maintenance.** Recurring schedules ("service AC every 3 months") auto-create issues. Per-asset failure history, downtime and repair cost, with a "replace instead of repair" insight.
7. **Photo AI triage.** On upload, suggest category, priority and required skill (Claude vision API, structured JSON validated with zod). Always human-confirmable.
8. **Offline-first technician PWA.** Installable, queue status updates and photos locally, sync when online, idempotency keys on the API.
9. **Public status board (per-org toggle).** Read-only page: open issues and average fix time per site, to reduce repeat complaints.
10. **Analytics dashboard.** Mean time to resolve, SLA compliance, workload per technician, hotspots by location, cost per asset. CSV/PDF export.

## 5. Explicitly out of scope

WhatsApp/SMS/Telegram integrations, email-to-ticket intake, native mobile apps, custom workflow builder, full inventory management, chat between users, marketplace.

## 6. Architecture

- **Frontend:** React 19, TypeScript, Vite, Redux Toolkit (consider RTK Query), React Router.
- **Backend:** Node, Express 5, TypeScript, Prisma 7, PostgreSQL, Zod validation, JWT auth.
- **Storage:** S3-compatible object storage for attachments.
- **Hosting:** frontend on Vercel/Cloudflare Pages; backend on Render/Railway (Docker); Postgres on Neon/Supabase with backups.
- **Observability:** Sentry, structured logging (pino), `/health` endpoint, uptime monitor.
- Layering: routes, controllers, services, Prisma. Business rules live in services.

## 7. Engineering quality bar (what makes it resume-worthy)

- [ ] Clean git history with Conventional Commits; no secrets or build output committed; correct `.gitignore`.
- [ ] `.env.example` for both apps; one-command local setup (Docker Compose: api, web, db).
- [ ] Seed script with demo org, users for every role, and sample issues.
- [ ] Automated tests: unit (state machine, dispatch scoring, plan limits), API integration (Supertest), tenant isolation, a few frontend component tests. Coverage badge in README.
- [ ] GitHub Actions CI: lint, typecheck, build, test on every push/PR.
- [ ] Security: rate limiting on auth and public routes, helmet, strict CORS, upload type/size validation, ownership checks on every endpoint (no IDOR), password hashing, secrets via env.
- [ ] API: pagination, filtering, search, consistent error shape, central error handler, OpenAPI/Swagger docs.
- [ ] Frontend: loading, empty and error states; responsive; accessible basics; toasts.
- [ ] Production: migrations via `prisma migrate deploy`, health checks, custom domain with HTTPS.
- [ ] Legal pages (Terms, Privacy, Refund) required by payment gateways.
- [ ] README with pitch, screenshots/GIF per role, architecture and ER diagrams, setup in five commands or fewer, demo credentials, live link.

## 8. Roadmap

| Phase | Deliverable |
|---|---|
| 0 | Repo hygiene: commits, `.gitignore`, `.env.example`, seed script, remove one-off scripts |
| 1 | Multi-tenancy, invites, tenant-scoped queries, object-storage uploads |
| 2 | State machine, activity timeline, comments, in-app notifications, tests + CI |
| 3 | Billing: plans, limits, Razorpay test mode, webhooks; deploy to staging |
| 4 | Locations, assets, QR reporting; requester-verified closure |
| 5 | Smart dispatch, SLA engine, duplicate detection |
| 6 | Preventive maintenance, analytics dashboard, public status board |
| 7 | Photo AI triage, offline PWA |
| 8 | Production launch, custom domain, 3-5 pilot users, iterate on their feedback |

## 9. Success criteria

- A stranger can open the live link, sign up, and complete the loop (report, assign, fix, verify) in under five minutes.
- A paid plan can be purchased in test mode and limits change accordingly.
- Tenant isolation, state machine and billing webhooks are covered by passing automated tests.
- At least three real pilot organizations have used it.

## 10. Resume bullet template

> **FixFlow**: Multi-tenant SaaS for facility maintenance (React, TypeScript, Express, Prisma, PostgreSQL). Built QR-based login-free reporting, an enforced issue-lifecycle state machine, explainable technician auto-dispatch, SLA tracking, and requester-verified closure. Integrated Razorpay subscriptions with webhook-driven plan limits. N tests, CI on GitHub Actions, deployed on Vercel/Render with Neon Postgres. Used by N pilot organizations.
