# Frontend

Location: `frontend/`. Vite + React 19 + TypeScript. Dev server: `npm run dev` (Vite default port 5173).

## Routes (`src/routes/Approutes.tsx`)

| Path | Component | Auth layout | Notes |
|---|---|---|---|
| `/` | Landing | public | Marketing page, 339 lines, theme toggle |
| `/login` | Login | public | Posts to `/auth/login`, stores `token` and `user` in localStorage, goes to `/dashboard` |
| `/signup` | Signup | public | Posts to `/auth/register`, then goes to `/login` |
| `/dashboard` | Dashboard | DashboardLayout | Switches to AdminDashboard, TechnicianDashboard or UserDashboard by `user.role` |
| `/issues` | Issues | DashboardLayout | Admin list with assign dropdown, create-issue modal for users |
| `/my-issues` | Issues | DashboardLayout | Same component, used by USER nav |
| `/issues/:id` | IssueDetails | DashboardLayout | Detail, role actions, attachment upload |
| `/technician/tasks` | TechnicianTasks | DashboardLayout | Accept, Start, Resolve actions |
| `*` | redirect to `/login` | | |

Links that exist in the UI but have no route yet: `/profile`, `/settings`, `/admin/users`, `/admin/technicians`, `/admin/categories`, `/admin/analytics`. The Sidebar and AdminDashboard link to them, and they fall through to the `*` redirect. `DashboardLayout` already has page titles for the admin ones.

## Layouts (`src/layouts`)

- `DashboardLayout.tsx`: reads `user` from localStorage (falls back to `{ name: "User", role: "USER" }`), owns theme state (`fixflow-theme`), renders `Sidebar`, `Topbar` and `MainContent` (an `Outlet` wrapper). Logout clears `token` and `user` and navigates to `/login`. There is no redirect when the user is not logged in.
- `Sidebar.tsx`: role-based nav. USER: Dashboard, My Issues. TECHNICIAN: Dashboard, My Tasks. ADMIN: Dashboard, All Issues. Footer: Profile, Settings, Logout.
- `Topbar.tsx`: page title, theme toggle (Sun or Moon), a notifications bell button with no behavior yet, user name and role.
- `AuthLayout.tsx`: shared shell and `Field` input component for Login and Signup.
- Styling: `layout.css` (prefix `fx-`) for the dashboard shell and `fa-` classes for auth screens. Theme via `data-theme="dark|light"`. Page CSS files: `App.css`, `index.css`.

## Pages (`src/pages`)

- **UserDashboard / TechnicianDashboard / AdminDashboard**: each calls `GET /issues` and computes counts client-side (open, in progress, resolved and similar), with navigation buttons.
- **Issues**: loads `GET /issues`. For ADMIN also loads `GET /users/technicians` and shows an assign control calling `PATCH /issues/:id/assign`. Opens the `CreateIssue` modal (`showCreateIssue` state). Row click goes to `/issues/:id`.
- **CreateIssue**: modal form (459 lines). Posts `/issues`, then if a file is selected posts `FormData` with field `image` to `/issues/:id/attachments`.
- **IssueDetails**: loads `GET /issues/:id`. Shows reporter, assignee, attachments. Role actions call `PATCH /issues/:id/<action>` (close or reopen for USER, accept, start, resolve for TECHNICIAN). Upload control posts to `/issues/:id/attachments`.
- **TechnicianTasks**: loads `GET /issues` (technician sees only assigned), Accept, Start, Resolve buttons, updates the local list from each response.

## Components

`IssueCard.tsx` and `StatusBadge.tsx` are minimal unstyled components (StatusBadge renders raw status text). The pages implement their own markup and styles, so these are largely unused.

## API client (`src/services/api.ts`)

```ts
const api = axios.create({ baseURL: "http://localhost:5000/api" });
// request interceptor adds: Authorization: Bearer <localStorage.token>
```

No response interceptor, so an expired token (1 day) shows up as failed requests without redirecting to login. The base URL is hard-coded. Move it to `import.meta.env.VITE_API_URL` before deploying. Attachment `fileUrl` values are relative (`/uploads/...`), so `IssueDetails.tsx` prefixes `http://localhost:5000` (hard-coded a second time) to display images.

## State

- Redux Toolkit is installed and wired (`store/store.ts`, `Provider` in `main.tsx`) but the reducer map is empty. All state is component-local `useState`.
- Session: `localStorage.token` and `localStorage.user`.
- Theme: `localStorage.fixflow-theme`.

## Types (`src/types`)

- `issue.ts`: `IssueStatus`, `IssuePriority`, `UserRole`, `UserSummary`, `Issue`, `IssueAttachment`. `Issue` has no `category` field even though the API returns it.
- `user.ts`: `TechnicianSpecialization`, `Technician`.

## Lint and build

```bash
npm run lint      # eslint .
npm run build     # tsc -b && vite build
```

## Planned frontend work

Route guards by role, an auth slice (or React Query), notification bell and inbox, org settings and billing pages, QR landing route `/r/:token`, analytics charts, PWA with offline queue. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
