# Newform Deployment Guide: Vercel + Railway

This is a simple step-by-step deployment plan for someone deploying this Turborepo for the first time.

Target setup:

- Frontend: Vercel
- Backend API: Railway
- Database: Railway PostgreSQL
- Domain: `www.newform.in`
- Optional API subdomain: `api.newform.in`

Use this order:

1. Prepare code.
2. Deploy backend on Railway.
3. Run DB migration and seed.
4. Deploy frontend on Vercel.
5. Connect domain in Hostinger DNS.
6. Verify everything.

## 0. Important Current Env Names

This project uses these env names from `.env.example`:

```txt
DATABASE_URL=
JWT_SECRET=
WEB_APP_URL=http://localhost:3000
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8000/auth/github/callback
NEXT_PUBLIC_API_ORIGIN=http://localhost:8000
```

Production values should be:

```txt
WEB_APP_URL=https://www.newform.in
NEXT_PUBLIC_API_ORIGIN=https://api.newform.in
GOOGLE_OAUTH_REDIRECT_URI=https://api.newform.in/auth/google/callback
GITHUB_OAUTH_REDIRECT_URI=https://api.newform.in/auth/github/callback
```

If you do not set up `api.newform.in`, use Railway's generated API URL everywhere instead.

## 1. Pre-Deployment Checklist

Run these locally before deploying:

```bash
pnpm install
pnpm check-types
pnpm build
```

Expected:

- `pnpm check-types` passes.
- `pnpm build` passes.

Known note:

- `pnpm lint` has existing config/warning blockers. Do not block deployment on lint unless those are fixed separately.

## 2. Required API CORS Check

Before production deployment, confirm the API allows the frontend origin.

Current file:

```txt
apps/api/src/server.ts
```

Current behavior to check:

- Local CORS is enabled for `http://localhost:3000` only when `NODE_ENV !== "prod"`.
- In production, browser calls from Vercel to Railway may fail unless production CORS is enabled.

Production API should allow:

```txt
https://www.newform.in
```

If API calls fail after deployment, this is the first thing to fix.

Recommended production behavior:

```ts
cors({
  origin: env.WEB_APP_URL,
  credentials: true,
})
```

## 3. Deploy Backend On Railway

### 3.1 Create Railway Project

1. Open Railway.
2. Create a new project.
3. Add a PostgreSQL database.
4. Add a service from the GitHub repository.

### 3.2 Use Repository Root For Turborepo

Because this is a pnpm workspace/Turborepo monorepo, use the repository root for Railway.

Recommended Railway service settings:

```txt
Root Directory: /
Build Command: pnpm install --frozen-lockfile && pnpm --filter @repo/api build
Start Command: pnpm --filter @repo/api start
```

Why root directory:

- `apps/api` depends on workspace packages like `@repo/trpc`, `@repo/services`, and `@repo/database`.
- Railway needs access to the full workspace to install and link packages correctly.

### 3.3 Confirm API Start Script

This already exists:

```txt
apps/api/package.json
```

Expected scripts:

```json
{
  "build": "tsup",
  "start": "node dist/index.js"
}
```

### 3.4 Set Railway Backend Env Vars

In Railway API service variables, set:

```txt
RAILPACK_NODE_VERSION=22.16.0
DATABASE_URL=postgresql://...railway-postgres-url...
JWT_SECRET=generate-a-long-random-secret
WEB_APP_URL=https://www.newform.in
NEXT_PUBLIC_API_ORIGIN=https://api.newform.in
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://api.newform.in/auth/google/callback
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=https://api.newform.in/auth/github/callback
```

OAuth can stay empty for now. The app handles missing OAuth providers by disabling provider buttons.

Why `RAILPACK_NODE_VERSION` is required:

- This repo uses `pnpm@11.1.3`.
- pnpm 11 requires Node.js `>=22.13.0`.
- Railway may default to Node 18 unless explicitly configured.
- Without this variable, Railway can fail during install with `This version of pnpm requires at least Node.js v22.13`.

### 3.5 Deploy Backend

Trigger Railway deployment.

After deployment, Railway will give a URL like:

```txt
https://your-service.up.railway.app
```

Temporarily test:

```txt
https://your-service.up.railway.app/health
https://your-service.up.railway.app/docs
https://your-service.up.railway.app/openapi.json
```

## 4. Add API Custom Domain: `api.newform.in`

This is optional but recommended.

### 4.1 Add Custom Domain In Railway

In Railway API service:

```txt
Settings -> Networking -> Custom Domain -> api.newform.in
```

Railway will show a DNS target.

### 4.2 Add DNS Record In Hostinger

In Hostinger DNS, add the exact record Railway shows.

Usually:

```txt
Type: CNAME
Name: api
Value: railway-provided-target
```

Do not guess the value. Use Railway's exact value.

### 4.3 Update Railway Env Vars If Needed

After `api.newform.in` works, use:

```txt
NEXT_PUBLIC_API_ORIGIN=https://api.newform.in
GOOGLE_OAUTH_REDIRECT_URI=https://api.newform.in/auth/google/callback
GITHUB_OAUTH_REDIRECT_URI=https://api.newform.in/auth/github/callback
```

Redeploy Railway after changing env vars.

## 5. Run Database Migration And Seed

After Railway Postgres is ready and `DATABASE_URL` is set, run migration.

Recommended simple way:

1. Copy Railway `DATABASE_URL`.
2. Temporarily put it in your local `.env`.
3. Run from repo root:

```bash
pnpm db:migrate
pnpm db:seed
```

Since this is development/demo, seeding is okay.

Seed creates demo credentials:

```txt
Admin: admin@example.com / password123
Demo: demo@example.com / password123
```

For a real SaaS launch, replace these credentials before public release.

Alternative Railway shell commands:

```bash
pnpm --filter @repo/database db:migrate
pnpm --filter @repo/database db:seed
```

Use whichever is easier. Local command is usually simpler.

## 6. Deploy Frontend On Vercel

### 6.1 Import GitHub Repo

1. Open Vercel.
2. Import the same GitHub repository.
3. Choose the Newform project.

### 6.2 Use Repository Root For Turborepo

Recommended Vercel settings:

```txt
Root Directory: /
Framework Preset: Next.js
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter web build
Output Directory: apps/web/.next
```

Why root directory:

- `apps/web` depends on workspace package `@repo/trpc`.
- Vercel needs the full workspace to resolve local packages.

### 6.3 Set Vercel Env Vars

In Vercel project variables, set:

```txt
NEXT_PUBLIC_API_ORIGIN=https://api.newform.in
```

If API subdomain is not ready yet, use the Railway URL:

```txt
NEXT_PUBLIC_API_ORIGIN=https://your-service.up.railway.app
```

Redeploy Vercel after setting env vars.

## 7. Add Frontend Domain: `www.newform.in`

### 7.1 Add Domain In Vercel

In Vercel:

```txt
Project -> Settings -> Domains -> Add www.newform.in
```

Vercel will show required DNS records.

### 7.2 Add DNS In Hostinger

Usually Vercel asks for:

```txt
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

If you also add root domain `newform.in`, Vercel may ask for:

```txt
Type: A
Name: @
Value: 76.76.21.21
```

Recommended:

- Use `www.newform.in` as canonical.
- Redirect `newform.in` to `www.newform.in` if you add the root domain.

### 7.3 Update Backend Env After Domain Works

In Railway, confirm:

```txt
WEB_APP_URL=https://www.newform.in
```

Redeploy Railway after changing this.

## 8. OAuth Setup Optional

If you want Google/GitHub login, configure provider dashboards.

Google redirect URI:

```txt
https://api.newform.in/auth/google/callback
```

GitHub callback URL:

```txt
https://api.newform.in/auth/github/callback
```

Then set these Railway vars:

```txt
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://api.newform.in/auth/google/callback
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=https://api.newform.in/auth/github/callback
```

If OAuth is not configured, login/signup still work with email/password.

## 9. Final Verification Checklist

Verify backend first:

1. Open `https://api.newform.in/health`.
2. Open `https://api.newform.in/docs`.
3. Open `https://api.newform.in/openapi.json`.

Verify frontend:

1. Open `https://www.newform.in`.
2. Open `https://www.newform.in/pricing`.
3. Open `https://www.newform.in/templates`.

Verify auth and app flow:

1. Login with `demo@example.com / password123`.
2. Open dashboard.
3. Open a seeded form.
4. Create a new form.
5. Add fields.
6. Add a second page.
7. Add conditional visibility.
8. Publish the form.
9. Copy the public link.
10. Open the public link in an incognito/logged-out browser.
11. Submit a response.
12. Confirm response appears in dashboard.
13. Export CSV.

Verify admin:

1. Login with `admin@example.com / password123`.
2. Open `/admin`.
3. Open users/forms/submissions/audit logs.
4. Confirm destructive actions show confirmation dialogs.
5. Confirm admin cannot demote or suspend themselves.

Verify QR:

1. Open a published form in builder.
2. Generate QR code.
3. Scan from phone.
4. It should open `https://www.newform.in/f/[slug]`, not localhost.

## 10. Common Problems And Fixes

### API calls fail from Vercel

Check these first:

- Vercel has `NEXT_PUBLIC_API_ORIGIN` set correctly.
- Railway API is running.
- API CORS allows `https://www.newform.in`.
- Browser network tab shows requests going to the correct API URL.

### Login works locally but not in production

Check:

- `WEB_APP_URL=https://www.newform.in` in Railway.
- CORS credentials are enabled.
- Cookies are accepted by browser.
- API and frontend are both HTTPS.

### QR code opens localhost

Check production frontend env:

```txt
NEXT_PUBLIC_API_ORIGIN=https://api.newform.in
```

Also verify generated public links use `https://www.newform.in`.

### OAuth button disabled

OAuth env vars are empty or invalid. This is allowed.

Email/password login still works.

### Database migration fails in development

For development DB only, you can reset the database and rerun:

```bash
pnpm db:migrate
pnpm db:seed
```

Never reset production data.

## 11. Production Safety Before Real SaaS Launch

Before treating this as a real production SaaS:

- Change seeded passwords.
- Use a strong `JWT_SECRET`.
- Enable database backups.
- Move rate limiting from memory to Redis/Upstash.
- Add real email provider.
- Upgrade password hashing/session security.
- Review cookie/CORS settings.
- Do not seed public demo credentials unless intended.
