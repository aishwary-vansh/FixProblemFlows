# FixFlow Docs

Single source of context for the FixFlow codebase. Read this index first, then the file that matches your task.

**What FixFlow is:** a maintenance/facility issue tracker with three roles (USER, TECHNICIAN, ADMIN). Users report issues, admins assign them to technicians, technicians accept, start and resolve, and the reporter closes or reopens. The plan is to turn it into a multi-tenant SaaS with billing. See [../PRODUCT_SPEC.md](../PRODUCT_SPEC.md) for the product vision.

**Snapshot date:** 2026-10-27. These docs describe the code as it is in the working tree, including uncommitted changes. Where a doc describes something not built yet, it says so.

| File | Read it when you need |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Repo layout, backend layers, request flow, tech stack and conventions |
| [DATABASE.md](DATABASE.md) | Prisma schema, enums, relations, migrations |
| [API.md](API.md) | Every HTTP endpoint with auth, roles, request and response shapes |
| [WORKFLOWS.md](WORKFLOWS.md) | Issue status state machine and what each role may do |
| [FRONTEND.md](FRONTEND.md) | Routes, pages, layouts, API usage, state and styling |
| [SETUP.md](SETUP.md) | Environment variables, local setup, scripts, Windows notes |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Bugs, security gaps and tech debt found in the code today |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Phase-by-phase plan to reach the product spec |
| [../PRODUCT_SPEC.md](../PRODUCT_SPEC.md) | Product goals, differentiators, roadmap, resume checklist |
| [DESIGN.md](DESIGN.md) | Original backend design blueprint (aspirational, not the current state) |
| [DEPLOY.md](DEPLOY.md) | Step-by-step production deployment and launch checklist |
| [../README.md](../README.md) | Project overview, local setup, demo accounts |

## Decisions already made

- Everything stays inside the app. No WhatsApp, SMS or email-to-ticket integrations. Notifications are in-app.
- Payment gateway: Razorpay first, behind a `BillingProvider` interface so Stripe can be added.
- Niche: maintenance for small institutions (colleges, hostels, societies, small offices).
- Differentiators: QR-per-location reporting, requester-verified closure, explainable auto-dispatch, SLA engine, duplicate detection, preventive maintenance, photo AI triage, offline technician PWA.

## Keeping these docs current

When you change an endpoint, the schema, a route or an env var, update the matching file in the same commit. If a "Known issue" gets fixed, delete it from [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
