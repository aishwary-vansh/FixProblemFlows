# Architecture

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, React Router 7, Redux Toolkit (store is empty), Axios, lucide-react icons, React Compiler (babel preset) |
| Backend | Node, Express 5, TypeScript (ESM, `module: nodenext`), Zod 4 validation, JWT (`jsonwebtoken`), bcryptjs, multer, helmet, cors |
| Database | PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Dev tooling | `tsx watch` for the backend, ESLint 10 on the frontend |

## Repository layout

```
FixProblemflows/
  README.md              Original design blueprint (aspirational)
  PRODUCT_SPEC.md        Product vision and roadmap
  docs/                  This documentation
  fixflow.session.sql    Scratch SQL file (untracked, should be ignored)
  backend/
    prisma/
      schema.prisma      Data model
      migrations/        5 migrations (see DATABASE.md)
    prisma7.config.ts    Prisma CLI config (schema path, DB URLs)
    make-admin.ts        One-off script: promote a hard-coded email to ADMIN
    make-technician.ts   One-off script: promote hard-coded user id to TECHNICIAN
    reset-password.ts    One-off script: reset a hard-coded user's password
    uploads/issues/      Uploaded images (local disk)
    src/
      server.ts          Starts the HTTP server
      app.ts             Express app, middleware, route mounting
      config/prisma.ts   Prisma client with pg adapter
      routes/            auth, issue, user routers
      controllers/       HTTP layer: parse, validate, call service, shape response
      services/          Business logic and Prisma queries
      middleware/        authenticate, authorise, upload
      validators/        Zod schemas
      utils/             jwt.ts, password.ts
      types/             AuthenticatedUser, Express Request augmentation
      generated/prisma/  Prisma client output (generated, committed)
  frontend/
    src/
      main.tsx           Mounts React with Redux Provider
      App.tsx            BrowserRouter
      routes/Approutes.tsx
      pages/             Landing, Login, Signup, Dashboard (role switch), UserDashboard,
                         TechnicianDashboard, AdminDashboard, Issues, IssueDetails,
                         CreateIssue (modal), TechnicianTasks
      layouts/           AuthLayout, DashboardLayout, Sidebar, Topbar, MainContent, layout.css
      components/        IssueCard, StatusBadge (both minimal, mostly unused)
      services/api.ts    Axios instance with bearer-token interceptor
      store/store.ts     Redux store with no reducers
      types/             issue.ts, user.ts
```

## Backend request flow

```
HTTP request
  -> helmet, cors, express.json            (app.ts)
  -> router (/api/auth | /api/issues | /api/users)
  -> authenticate                          (verifies Bearer JWT, sets req.user = { userId, role })
  -> authorise(Role...)                    (403 if req.user.role not allowed)
  -> controller                            (zod safeParse, id parsing, status codes)
  -> service                               (rules + prisma calls, throws Error(message))
  -> prisma -> PostgreSQL
```

Mounted routes in `app.ts`:

- `/api/auth` auth routes
- `/api/issues` issue routes
- `/api/users` user routes
- `/uploads` static file serving of `process.cwd()/uploads`
- `GET /` health message, `GET /test-db` DB connectivity check (returns user count)

## Layer responsibilities (as implemented)

- **Routes** declare path, method, `authenticate`, `authorise(Role.X)`, then the controller.
- **Controllers** validate input with Zod, parse `:id` as a positive integer, require `req.user`, call one service function, and map errors to status codes. Most catch blocks return the thrown `Error.message` with a fixed status (400 or 401), not a status derived from the error type. Only `getIssuesByIdController` maps messages to 404 and 403.
- **Services** hold the status rules. Each transition function loads the issue, checks ownership (assignee or reporter) and the current status, then updates. They throw plain `Error` objects.
- **Auth** is stateless JWT: payload `{ userId, role }`, expiry 1 day, signed with `JWT_SECRET`. The role is read from the token, not the database, so a role change only applies after the next login.

## Conventions in the existing code

- File naming: controllers `*.controllers.ts` (user service is `user.service.ts`, singular, unlike `auth.services.ts` and `issue.services.ts`).
- Imports use explicit `.js` extensions (ESM `nodenext`).
- Response envelope: `{ success: boolean, message?: string, data?: any, errors?: ZodIssue[] }`. The create-issue controller uses `error` instead of `errors` for validation failures.
- Roles come from the generated Prisma enum `Role` (`src/generated/prisma/enums.js`).
- The Express `Request` type is augmented with `user?: AuthenticatedUser` in `src/types/express.d.ts`.
- Uploads: multer disk storage in `uploads/issues/`, 5 MB limit, JPEG/PNG/WEBP only, file name `<timestamp>-<random><ext>`. The database stores the public path `/uploads/issues/<filename>`.

## Frontend structure at a glance

- Router: public pages (`/`, `/login`, `/signup`) and a `DashboardLayout` wrapper for authenticated pages.
- Auth state lives in `localStorage` keys `token` and `user` (JSON). There is no route guard and no Redux slice.
- Role-based UI: `Dashboard.tsx` picks one of three dashboards by `user.role`. `Sidebar.tsx` picks nav items by role. `Issues.tsx` and `IssueDetails.tsx` show role-specific actions.
- Theme: `fixflow-theme` in `localStorage` (`dark` | `light`), applied via `data-theme` on the layout root.
- API base URL is hard-coded to `http://localhost:5000/api`.

## Target architecture (not built yet)

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Main changes: `Organization` multi-tenancy with a scoped Prisma client, a transition table for the state machine, object storage for uploads, a notifications table, a `BillingProvider` abstraction, and a background job runner for SLA and recurring maintenance.
