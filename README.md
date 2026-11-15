# FixFlow

Maintenance tracking for hostels, colleges, offices and housing societies. Residents report a problem in under a minute, admins send it to the right technician, the technician fixes it with photo proof, and the reporter confirms it is really fixed.

It replaces the WhatsApp group and the complaint register: nothing gets lost, everyone sees who is handling what, and the manager gets numbers on what keeps breaking and how fast it gets fixed.

## Features

- **Reporting:** building and floor dropdowns plus the exact spot, with a photo. Joining is through a reusable link or a QR poster.
- **QR codes for places:** admins make a QR for any region they choose (the mess kitchen, a gym, one washroom). Scanning it opens the report form with the place filled in.
- **No duplicate reports:** the form shows open issues at the same place, and people press "Me too" instead of reporting again. Admins can merge duplicates that slip through.
- **Workflow with rules:** a state machine decides who can accept, start, hold, resolve, close or reopen. Resolving needs a note and an after photo. Only the reporter can confirm the fix and rate it.
- **Deadlines:** each priority has a deadline (Critical 4 h to Low 7 days). Overdue issues are flagged and alerted once.
- **Smart assignment:** technicians are ranked by skill and workload, with optional auto-assign.
- **Alerts:** an in-app inbox plus phone push alerts (installable web app).
- **Reports:** time to fix, overdue and reopen rates, ratings and repair cost, by building, category and technician, with CSV export.
- **Multi-tenant:** every organization's data is isolated at the database client level, with tests.
- **Accounts:** invites and roles (Owner, Admin, Technician, Requester), a profile page, password change, and forgot password by email.
- **Admin control:** an activity log of every role, invite, setting, location and QR change. Owners can export all their data as JSON or delete their organization.
- **Plans:** Free (up to 10 members and 3 QR codes, no auto-assign or CSV export) and Pro (₹999 a month, no limits), shown to the owner as plan cards. New organizations get a 14-day Pro trial. Owners pay online through Razorpay (a month or a year, at their own price; paying adds to the end date), confirmed both from the browser and by webhook so a payment is counted once even if the tab closes. Without Razorpay keys the Buy button emails `VITE_CONTACT_EMAIL`.
- **FixFlow Console:** a separate login at `/console` for the people who run FixFlow, not tied to any organization. Its Overview shows charts of issues per day and sign-ups per month, the plan mix, trials ending this week, the most active organizations and the ones gone quiet. Organizations has search, a plan filter and a Manage panel per organization: give Pro, extend it, set a custom (discounted) price, revoke it with a reason, or send the owner a warning or notice. Notes stay in the console unless shared; shared ones show to the owner as a banner, and a discount shows on their Plans page. Every action is kept in a history. Console admins are created only from the command line: `npm run console-admin -- you@example.com`.
- **Operations:** CI on every push, Sentry error tracking (optional), and production refuses unsafe settings.

## Stack

| Part | Tech |
| --- | --- |
| Web app | React 19, TypeScript, Vite, React Router |
| API | Node.js, Express 5, TypeScript, Zod |
| Database | PostgreSQL with Prisma 7 |
| Files | Local disk in development, S3 or Cloudflare R2 in production |
| Email and alerts | Resend, Web Push (VAPID) |
| Tests | Vitest |

## Run it locally

You need Node.js 20 or newer.

**1. API**

```bash
cd backend
npm install
cp .env.example .env
```

For a local database, run `npx prisma dev` in another terminal. Put the `DATABASE_URL` it prints into `.env`, keep `DATABASE_POOL_MAX=1` (the local database serves one connection at a time), and set `JWT_SECRET` to any long random string. After a restart of your computer, start the database again with `npm run db:start`. Then:

```bash
npm run db:migrate
npm run seed
npm run dev
```

The API runs on http://localhost:5000.

**2. Web app**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

### Demo accounts

`npm run seed` creates "Sunrise Hostel (Demo)" with buildings, issues and these accounts. The password for all of them is `Demo@1234`.

| Role | Email |
| --- | --- |
| Owner | owner@demo.fixflow.app |
| Admin | admin@demo.fixflow.app |
| Technician (plumbing) | ravi@demo.fixflow.app |
| Technician (electrical) | meena@demo.fixflow.app |
| Requester | sam@demo.fixflow.app |
| Requester | priya@demo.fixflow.app |

The demo join link is http://localhost:5173/join/sunrise-demo-join-link.

Without `RESEND_API_KEY`, password reset emails are printed in the API log instead of being sent.

## Tests and checks

```bash
cd backend
npm test
npm run typecheck
```

```bash
cd frontend
npm run lint
npm run build
```

The unit tests cover tenant isolation, the status workflow, deadlines, technician ranking, reports, CSV safety, locations, file type checks and production settings.

## Project layout

```
backend/
  prisma/              schema, migrations, demo seed
  src/domain/          pure business rules (workflow, deadlines, ranking, reports)
  src/services/        database work, one file per area
  src/routes/          HTTP endpoints
  src/jobs/            overdue check, auto-close, push sender
  src/lib/tenantScope  keeps every query inside one organization
frontend/
  src/pages/           one file per screen
  src/components/      shared pieces (filters, actions, panels)
docs/                  design, API, database, workflows, deployment
```

## Deploying

See [docs/DEPLOY.md](docs/DEPLOY.md). Production refuses to start with unsafe settings, such as a weak `JWT_SECRET` or localhost URLs.

## More docs

- [docs/WORKFLOWS.md](docs/WORKFLOWS.md): who can do what, step by step
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): roadmap and status
- [docs/DESIGN.md](docs/DESIGN.md): the original product and backend design
- [docs/README.md](docs/README.md): index of all docs
