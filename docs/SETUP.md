# Setup and Operations

## Prerequisites

Node.js (current LTS or newer), npm, PostgreSQL (local, or a hosted instance such as Neon). Windows 11 with PowerShell or Git Bash works. Paths below use forward slashes.

## Environment variables

Backend, in `backend/.env` (never commit; `.gitignore` in `backend/` already ignores `.env`):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string used by Prisma and the pg adapter |
| `SHADOW_DATABASE_URL` | for `migrate dev` | Shadow database for Prisma migrations |
| `JWT_SECRET` | yes | The server throws on startup if missing (`auth.middleware.ts`, `utils/jwt.ts`) |
| `PORT` | no | Defaults to `5000` |

There is no `.env.example` yet. Create one with these keys and placeholder values. The frontend has no env file; its API base URL is hard-coded in `src/services/api.ts`.

## First run

```bash
# backend
cd backend
npm install
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npm run dev          # tsx watch src/server.ts, serves http://localhost:5000
```

```bash
# frontend (second terminal)
cd frontend
npm install
npm run dev          # Vite, http://localhost:5173
```

Check the API: open `http://localhost:5000/` (expects "FixFlow API is working") and `http://localhost:5000/test-db`.

## Backend scripts

| Script | Command | Notes |
|---|---|---|
| dev | `npm run dev` | `tsx watch src/server.ts` |
| build | `npm run build` | `tsc` to `dist/` |
| start | `npm start` | `node dist/server.js` |
| test | `npm test` | placeholder, no tests exist |

## Getting an admin or technician locally

New accounts are always `USER`. Register through the UI, then promote:

- `backend/make-admin.ts` has a hard-coded email. Edit the email, then run `npx tsx make-admin.ts`.
- `backend/make-technician.ts` has a hard-coded user id and sets specialization to ELECTRICAL. Edit and run `npx tsx make-technician.ts`.
- `backend/reset-password.ts` resets a hard-coded user's password and prints the new password. Local debugging only.

Or run SQL, for example `UPDATE "User" SET role = 'ADMIN' WHERE email = '...';`. Log out and in again, since the role is baked into the JWT.

A seed script (`prisma/seed.ts`) with demo users for all roles is planned in Phase 0 of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Prisma notes

- Config file is `backend/prisma7.config.ts`. Pass `--config prisma7.config.ts` to Prisma CLI commands.
- The generated client in `src/generated/prisma/` is committed. Regenerate after every schema change.
- `prisma7.config.js`, `.d.ts`, `.js.map` and `.d.ts.map` next to the `.ts` file are compiled leftovers and should be deleted and ignored.
- `tsconfig.json` has `rootDir: ./src` and includes only `src/**/*.ts`, so the root-level scripts are run with `tsx`, not `tsc`.

## Uploads

Files go to `backend/uploads/issues/` on local disk and are served at `/uploads/issues/<file>`. This does not survive redeploys on platforms with ephemeral disks. Move to S3 or R2 before deploying.

## Deployment (planned)

Frontend on Vercel or Cloudflare Pages, backend on Render or Railway, Postgres on Neon or Supabase, uploads on R2 or S3. Steps and the pre-launch checklist are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [../PRODUCT_SPEC.md](../PRODUCT_SPEC.md). Use `prisma migrate deploy` in the release step, never `migrate dev`.

## Git state notes

At snapshot time many changes were uncommitted: category and specialization migration, user routes, role dashboards, technician tasks page. There is no root `.gitignore`. `backend/uploads/`, `.vscode/` and `fixflow.session.sql` were untracked. `backend/README.md` was deleted in the working tree.
