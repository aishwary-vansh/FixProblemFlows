# Deploying FixFlow

One setup that runs on free tiers. Each part can be swapped for another provider.

| Part | Service | Why |
| --- | --- | --- |
| Database | [Neon](https://neon.tech) Postgres | Managed Postgres with daily backups |
| API | [Render](https://render.com) web service | Runs Node with HTTPS |
| Web app | [Vercel](https://vercel.com) | Static hosting with HTTPS |
| Photos | [Cloudflare R2](https://developers.cloudflare.com/r2/) | S3-compatible; Render's disk is wiped on every deploy |
| Email | [Resend](https://resend.com) | Password reset emails |

Push alerts and installing the app on a phone both need HTTPS. All the hosts above provide it.

## 1. Database (Neon)

1. Create a project and copy the connection string. It looks like `postgresql://user:pass@host/db?sslmode=require`.
2. Use it as `DATABASE_URL` in step 3. Migrations run automatically every time the API starts.

**Never run `npm run seed` against production.** The demo data has public passwords and a public join link, and the seed refuses to run when `NODE_ENV=production`.

## 2. Photos (Cloudflare R2)

1. Create a bucket, such as `fixflow-photos`. Keep it private; the API hands out short-lived signed links.
2. Create an API token with read and write access to that bucket.
3. Note the account endpoint: `https://<account-id>.r2.cloudflarestorage.com`.

## 3. API (Render)

Create a **Web Service** from the repository with these settings:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start:prod` (runs migrations, then starts) |
| Health check path | `/health` |

Set these environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `APP_URL` | Web app URL, such as `https://fixflow.vercel.app` |
| `CORS_ORIGIN` | The same web app URL |
| `PUBLIC_API_URL` | This service's URL, such as `https://fixflow-api.onrender.com` |
| `TRUST_PROXY` | `1` |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | From step 2 (`S3_REGION` stays `auto`) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys`. Make new ones; never reuse development keys |
| `VAPID_SUBJECT` | `mailto:` plus your email |
| `RESEND_API_KEY` | From Resend |
| `EMAIL_FROM` | A sender on a domain you verified in Resend, such as `FixFlow <no-reply@yourdomain.com>` |
| `SENTRY_DSN` | Optional. From a [Sentry](https://sentry.io) Node project, to be told about server errors |
| `PLATFORM_ADMIN_USER_IDS` | Your account id (comma-separated for several), shown on your Profile page after you sign up. These accounts see the Platform console with every organization. Ids are used, not emails, because emails are not verified |

The API checks these values on startup. It refuses to start with a weak or placeholder `JWT_SECRET` or localhost URLs, and logs a warning for missing storage, push or email settings.

On Render's free plan the service sleeps after 15 minutes without traffic. While it sleeps, the overdue check, auto-close and push alerts pause, and they catch up when it wakes. Use a paid instance for a real pilot.

## 4. Web app (Vercel)

Import the repository with these settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework preset | Vite |
| `VITE_API_URL` | The API URL from step 3, without `/api` |
| `VITE_CONTACT_EMAIL` | Address for privacy and account requests, shown on the legal pages |
| `VITE_SENTRY_DSN` | Optional. From a Sentry React project, to be told about errors in people's browsers |

`frontend/vercel.json` sends every path to `index.html`, so links like `/join/...` and `/reset-password/...` work when opened directly.

## 5. First run

1. Open the web app and sign up. This creates your organization, and you are its Owner.
2. Add buildings and floors on **Locations**.
3. Invite technicians from **Members**, then print the join QR for residents.
4. Test **Forgot password** with your own email, and turn on alerts from the bell menu on your phone.

## Before inviting real users

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, tests and builds on every push. Keep it green before deploying.

- [ ] `/health` returns `{"status":"ok","db":"ok"}`.
- [ ] The API log shows no "Warning:" lines.
- [ ] A photo uploaded in production still shows after redeploying the API (so R2 is in use).
- [ ] A reset email arrives and its link opens the web app, not localhost.
- [ ] A push alert reaches a phone.
- [ ] The Terms and Privacy pages show your contact email.
