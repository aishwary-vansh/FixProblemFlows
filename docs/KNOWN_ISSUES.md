# Known Issues and Tech Debt

Found by reading the code on 2026-10-27. Severity: **High** blocks a safe deploy, **Med** hurts correctness or quality, **Low** polish. Delete entries as they are fixed.

## Security

Checked again on 2026-11-04. Header logging, open CORS, missing rate limits, `/test-db`, JWT-only roles, public uploads, mime-only file checks, missing uploader and "Me too" exposing private details (followers now get a limited view, see `domain/issueAccess.ts`) were all fixed and removed from this table.

| Sev | Issue | Where | Fix |
|---|---|---|---|
| Med | Old commits still contain the deleted one-off scripts with a test email and plaintext password | git history | Change any real password that was used; rewrite history only if the repo goes public |
| Low | Registration error reveals whether an email exists | `auth.services.ts` | Acceptable; forgot password does not reveal it |

## Backend correctness

| Sev | Issue | Where |
|---|---|---|
| Med | `assignIssues` ignores current status, so a `CLOSED` or `RESOLVED` issue can be reassigned back to `ASSIGNED`. Also ignores `isActive` and specialization vs category | `issue.services.ts` |
| Med | Read-then-write without a transaction or conditional update: two concurrent requests can both pass the status check | all transition functions in `issue.services.ts` |
| Med | `REOPENED` has no exit path except admin re-assign; no technician reject; no admin unassign | state machine |
| Med | No audit or history: transitions leave no record | whole backend |
| Med | Error mapping is inconsistent: accept returns `401` on business errors, others `400`, "not found" is `400` in most routes, and only `GET /:id` returns `404` and `403` | `issue.controllers.ts` |
| Med | Error handling is by string comparison of `error.message` | `getIssuesByIdController` |
| Low | Validator messages disagree with rules ("at least 5 characters" but `min(1)`; "at least 10" but `min(5)`) | `issue.validator.ts` |
| Low | Typos in messages ("thsi", "Technincian", "usesr", "rresuorces", "Ypu") | services, middleware, validators |
| Low | `import { number } from "zod"` is unused | `issue.services.ts` |
| Low | Login validation failure returns `401` instead of `400` | `auth.controllers.ts` |
| Low | No pagination, filtering or sorting options on `GET /issues` | `issue.services.ts` |
| Low | No central error handler, no request logging, no `/health` | `app.ts` |

## Frontend

| Sev | Issue | Where |
|---|---|---|
| High | API base URL hard-coded to `http://localhost:5000/api` | `src/services/api.ts` |
| Med | No route guard: any URL under `DashboardLayout` renders without a token; role pages are not protected client-side | `Approutes.tsx`, `DashboardLayout.tsx` |
| Med | No 401 handling: expired token just makes calls fail silently | `api.ts` |
| Med | Sidebar and AdminDashboard link to routes that do not exist (`/profile`, `/settings`, `/admin/*`) and fall through to `/login` | `Sidebar.tsx`, `AdminDashboard.tsx`, `Approutes.tsx` |
| Med | Topbar notification bell is a dead button | `Topbar.tsx` |
| Med | Redux store has no reducers; all state is local, with JWT and user in `localStorage` | `store/store.ts` |
| Low | `Issue` type lacks `category`; `IssueCard` and `StatusBadge` are unstyled and mostly unused | `types/issue.ts`, `components/` |
| Low | `console.log` of login and signup responses left in | `Login.tsx`, `Signup.tsx`, `CreateIssue.tsx` |
| Low | Dashboard pages each re-fetch all issues and count client-side | `*Dashboard.tsx` |
| Low | Page filename casing: `Approutes.tsx` (should be `AppRoutes.tsx`) | `routes/` |

## Repo and process

| Sev | Issue |
|---|---|
| Med | No root `.gitignore`; `backend/uploads/`, `.vscode/`, `fixflow.session.sql` untracked and unignored |
| Med | Compiled `prisma7.config.js`, `.d.ts`, `.map` files are committed next to the `.ts` source |
| Med | Many working-tree changes uncommitted (see [SETUP.md](SETUP.md)) |
| Med | Zero tests, no CI, no lint step for the backend |
| Med | No `.env.example`, no seed script, no Docker setup |
| Low | `backend/README.md` deleted in the working tree; the root `README.md` is a design blueprint, not a project README |
| Low | Prisma config named `prisma7.config.ts` instead of the default |
| Low | Generated Prisma client is committed (consider ignoring and generating in CI) |

## Gaps against the blueprint and spec

Not built: comments, notes, ratings, notifications, status history, audit log, SLA, locations and categories as tables, admin user management, analytics, pagination, multi-tenancy, billing. Tracked in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
