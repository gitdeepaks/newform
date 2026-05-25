# Newform — Production Deployment Plan (Vercel + Hostinger domain `www.newform.in`)

> Status: drafted 2026-05-26. Read the **"Critical architecture decision"** and **"Required code changes"** sections before touching any dashboard — there are blockers that will make a naive Vercel deploy fail.

---

## 1. What this project actually is

This is a **pnpm + Turborepo monorepo** with two deployable apps:

| App | Stack | What it is | Where it can go |
|-----|-------|-----------|-----------------|
| `apps/web` | Next.js 16.2.6 (App Router, React 19, Turbopack) | The UI at `www.newform.in` | ✅ **Vercel** (great fit) |
| `apps/api` | Express 5 + tRPC 11 + `trpc-to-openapi` | Long-running Node HTTP server (`http.createServer().listen()`), OAuth callbacks, Scalar API docs | ⚠️ **NOT a Vercel-native fit** — needs a persistent Node host |

Shared workspace packages (consumed as TypeScript source, no publish step):
`@repo/trpc` (router + client types), `@repo/services` (user/auth/form/theme business logic), `@repo/database` (Drizzle ORM + Postgres, 10 migrations), `@repo/logger` (winston), `@repo/eslint-config`, `@repo/typescript-config`.

Database: **PostgreSQL** via Drizzle ORM (`drizzle-orm/node-postgres`). Locally it runs from `docker-compose.yml` (postgres:15). In production you need a managed Postgres.

### Auth flow (important — it drives the whole deployment topology)
1. User clicks "Sign in with Google/GitHub" → browser does a **full-page navigation** to `${NEXT_PUBLIC_API_ORIGIN}/auth/<provider>/start` (see `apps/web/hooks/api/auth/index.ts`).
2. API sets an `oauth-state` cookie, redirects to the provider.
3. Provider redirects back to `*_OAUTH_REDIRECT_URI` (an **API** URL, e.g. `/auth/google/callback`).
4. API validates state, upserts the user, sets an **httpOnly `authentication-token` cookie**, then redirects to `WEB_APP_URL/dashboard`.
5. The web app reads auth by calling the tRPC `auth.getLoggedInUserInfo` query (client-side, `credentials: "include"`). `AuthGate` gates `/dashboard` and the `(auth)` pages on the result.

The auth cookie is set **on the API's host**. Therefore every authenticated tRPC request from the browser must reach that same host (directly or via a transparent proxy) carrying that cookie. This is the crux of the config below.

---

## 2. Critical architecture decision

**Vercel hosts `apps/web` only.** You must host `apps/api` and Postgres elsewhere. Recommended production topology:

```
                 www.newform.in        →  Vercel        (Next.js, apps/web)
                 api.newform.in         →  Railway/Render/Fly/VPS (Express, apps/api)
                 (managed Postgres)     →  Neon / Supabase / Railway Postgres
```

Put the API on a **subdomain of your own domain** (`api.newform.in`). This keeps the browser, the web app, and the API all on the same *site* (`newform.in`), which makes cookies behave with `SameSite=Lax` and avoids `SameSite=None` complications.

> Why not the API on Vercel? `apps/api/src/index.ts` opens a long-lived HTTP server and the app mounts streaming tRPC + Scalar docs + an Express router. Vercel's serverless/function model can technically wrap Express, but it requires an adapter rewrite and loses the persistent-server assumptions. Use a container/VM host (Railway, Render, Fly.io, or a Hostinger VPS) — it's a 5-minute deploy and matches the code as-is.

**Two valid request topologies for the web→API calls** (pick A):

- **A — Direct calls (recommended).** Browser calls `https://api.newform.in/trpc` directly. Requires **CORS** on the API + `secure` cookies. The codebase is already shaped for this (OAuth hook hits the API origin directly; tRPC client supports an absolute URL and already sends `credentials:"include"`). ← this plan uses A.
- **B — Full proxy.** Route both `/trpc/*` and `/auth/*` through Next.js rewrites so everything is same-origin `www.newform.in` (no CORS). More moving parts (must proxy OAuth redirects + `Set-Cookie`, and register provider redirect URIs under `www.newform.in`). Documented briefly at the end as an alternative.

---

## 3. Required code changes (BLOCKERS — do these before deploying)

These currently hardcode `localhost` / disable CORS in prod. A production deploy **will not authenticate** without them.

### 3.1 API CORS — `apps/api/src/server.ts`
Today CORS is only enabled when `NODE_ENV !== "prod"` and is hardcoded to `http://localhost:3000`. In prod the web origin gets no CORS headers, so credentialed cross-origin tRPC calls fail.

```ts
// replace the existing `if (env.NODE_ENV !== "prod") { app.use(cors(...)) }` block
app.set("trust proxy", 1); // behind Railway/Render/Vercel proxies (correct req.ip, secure cookies)

const allowedOrigins = [env.WEB_APP_URL, "http://localhost:3000"];
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin/server-to-server (no Origin header) and whitelisted web origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
```

### 3.2 Cookie security — `packages/trpc/server/utils/cookie.ts`
`defaultCookieOptions` has `secure: false`. Production is HTTPS; auth cookies should be `secure` in prod. `SameSite=Lax` is fine because `www.newform.in` ↔ `api.newform.in` are same-site.

```ts
const isProd = process.env.NODE_ENV === "prod";

export const defaultCookieOptions: CookieOptions = {
  path: "/",
  httpOnly: true,
  secure: isProd,          // was: false
  sameSite: "lax",         // OK for same-site subdomains; use "none" only if API is on a different registrable domain
  maxAge: ONE_YEAR,
};
```
> If you ever host the API on a **different** domain (e.g. `*.onrender.com` while the web is on `newform.in`), that is *cross-site* → you must use `sameSite: "none"` **and** `secure: true`. Staying on `api.newform.in` avoids this.

### 3.3 Web tRPC URL — make the browser call the API directly
The browser currently falls back to the relative `/trpc` path, which is served by a Next.js rewrite hardcoded to `http://localhost:8000` (`apps/web/next.config.js`). Two parts:

**(a)** Set `NEXT_PUBLIC_API_URL=https://api.newform.in/trpc` in Vercel (see env table). With it set, `apps/web/trpc/create-client.ts` uses the absolute API URL for both server and client and the rewrite is bypassed.

**(b)** Replace the hardcoded rewrite in `apps/web/next.config.js` so it is env-driven (keeps local dev working and removes the dead `localhost` reference):

```js
async rewrites() {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";
  return [{ source: "/trpc/:path*", destination: `${apiOrigin}/trpc/:path*` }];
},
```

### 3.4 `NODE_ENV` enum gotcha (will crash the API on boot if missed)
`apps/api/src/env.ts` and `packages/logger/env.ts` define `NODE_ENV: z.enum(["development", "prod"])`. Many hosts set `NODE_ENV=production` by default — that value is **not in the enum**, so `env` parsing throws and the API exits immediately. Mitigation, choose one:
- **Easiest:** explicitly set `NODE_ENV=prod` in the API host's env (this plan assumes this), **or**
- Loosen the schema to also accept `"production"`:
  ```ts
  NODE_ENV: z.enum(["development", "production", "prod"]).default("development"),
  ```
  (If you do this, update the `secure`/CORS checks to treat both `prod` and `production` as production.)

### 3.5 Database SSL
Managed Postgres (Neon/Supabase/Railway) requires TLS. Ensure `DATABASE_URL` ends with `?sslmode=require` (Neon/Supabase connection strings include this by default). `drizzle-orm/node-postgres` honors the URL params, so no code change is needed if the param is present.

---

## 4. Prerequisites checklist (gather before deploying)

- [ ] **Managed Postgres** created; copy its `DATABASE_URL` (with `sslmode=require`).
- [ ] **API host account** (Railway / Render / Fly / VPS).
- [ ] **Vercel account** connected to this Git repo.
- [ ] **Hostinger** DNS access for `newform.in`.
- [ ] **Google OAuth app** (Google Cloud Console → APIs & Services → Credentials).
- [ ] **GitHub OAuth app** (GitHub → Settings → Developer settings → OAuth Apps).
- [ ] A strong `JWT_SECRET` (e.g. `openssl rand -hex 32`).
- [ ] Code changes from §3 applied, committed, pushed.

---

## 5. Step-by-step deployment

### Step 1 — Provision Postgres
1. Create a Postgres instance (Neon recommended for serverless-friendly pooling, or Railway Postgres to keep API+DB together).
2. Copy the connection string → this is `DATABASE_URL`.

### Step 2 — Run database migrations against production
From your machine (or a CI step), pointing at the **production** DB:
```bash
DATABASE_URL="<prod-url>" pnpm --filter @repo/database db:migrate
# optional seed (review packages/database/seed.ts first — only if you want demo data):
# DATABASE_URL="<prod-url>" pnpm --filter @repo/database db:seed
```
Drizzle applies the 10 migrations in `packages/database/drizzle/`. Re-run `db:migrate` on every future schema change as part of your release process.

### Step 3 — Deploy the API (`apps/api`) to a Node host
Using **Railway** as the example (Render/Fly are analogous):
1. New Project → Deploy from this repo.
2. **Root directory:** repo root (the monorepo). **Install:** `pnpm install`. **Build:** `pnpm --filter @repo/api... build` (builds the API and its workspace deps). **Start:** `node apps/api/dist/index.js` (or set the service's start to `pnpm --filter @repo/api start`).
3. The host injects `PORT`; the API reads it (`apps/api/src/index.ts` → `env.PORT`).
4. Set the API env vars (see §6 table).
5. Deploy, then attach the custom domain **`api.newform.in`** in the host's networking settings. The host gives you a CNAME target — note it for Step 5.
6. Verify: `https://api.newform.in/health` → `{"healthy":true}`. API docs at `https://api.newform.in/docs`.

### Step 4 — Deploy the web (`apps/web`) to Vercel
1. Vercel → New Project → import this repo.
2. **Root Directory:** `apps/web`. Vercel auto-detects the pnpm workspace + Turborepo and installs from the repo root (workspace packages resolve automatically). Framework preset: **Next.js**. Leave build/install commands at defaults unless the build complains; if it does, set Build Command to `cd ../.. && pnpm turbo build --filter=web`.
3. Add the web env vars (see §6) **before the first build** — `NEXT_PUBLIC_*` vars are inlined at build time, so they must exist when Vercel builds.
4. Deploy. Confirm the `*.vercel.app` URL renders the landing page.

### Step 5 — Point the Hostinger domain at Vercel + the API
In Vercel → Project → Settings → Domains, add `www.newform.in` (and `newform.in` if you want the apex to redirect to www). Vercel shows you the exact records. Then in **Hostinger → Domains → DNS / Nameservers** for `newform.in`:

| Host / Name | Type | Value | Purpose |
|-------------|------|-------|---------|
| `www` | CNAME | `cname.vercel-dns.com` (use the value Vercel shows) | Web app |
| `@` (apex) | A | `76.76.21.21` (use the value Vercel shows) | `newform.in` → redirect to `www` |
| `api` | CNAME | `<target from your API host>` (Railway/Render value) | API |

> Keep TTL low (e.g. 5 min) during cutover. Propagation can take minutes to a few hours. Vercel and the API host will auto-provision TLS certificates once DNS resolves.

### Step 6 — Configure the OAuth providers with production URLs
**Google Cloud Console** → your OAuth client:
- Authorized redirect URI: `https://api.newform.in/auth/google/callback`
- (Authorized JavaScript origins: `https://www.newform.in` — harmless to add.)

**GitHub OAuth App:**
- Authorization callback URL: `https://api.newform.in/auth/github/callback`
- Homepage URL: `https://www.newform.in`

These must **exactly** match the `*_OAUTH_REDIRECT_URI` env values you set on the API. Update both the provider console **and** the API env vars together.

---

## 6. Environment variables

### API host (Railway/Render/Fly) — runtime
| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `prod` | ⚠️ must be `prod` (not `production`) unless you applied §3.4 |
| `PORT` | *(host-provided)* | API reads it; don't hardcode |
| `BASE_URL` | `https://api.newform.in` | used for OpenAPI base + log URLs |
| `WEB_APP_URL` | `https://www.newform.in` | OAuth success/failure redirects + CORS allow-list |
| `DATABASE_URL` | `postgres://…?sslmode=require` | managed Postgres |
| `JWT_SECRET` | `<openssl rand -hex 32>` | sign/verify auth tokens |
| `GOOGLE_OAUTH_CLIENT_ID` | from Google | |
| `GOOGLE_OAUTH_CLIENT_SECRET` | from Google | |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://api.newform.in/auth/google/callback` | must match Google console |
| `GITHUB_OAUTH_CLIENT_ID` | from GitHub | |
| `GITHUB_OAUTH_CLIENT_SECRET` | from GitHub | |
| `GITHUB_OAUTH_REDIRECT_URI` | `https://api.newform.in/auth/github/callback` | must match GitHub app |
| `LOGGER_LEVEL` | `info` *(optional)* | `error` \| `info` \| `debug` |

### Vercel (web) — build + runtime
| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_ORIGIN` | `https://api.newform.in` | OAuth start navigation + rewrite destination |
| `NEXT_PUBLIC_API_URL` | `https://api.newform.in/trpc` | makes the browser call the API directly (§3.3) |

> `WEB_APP_URL`, `JWT_SECRET`, OAuth secrets, `DATABASE_URL` do **not** belong on Vercel — they are API/DB secrets. Only the two `NEXT_PUBLIC_*` values go to Vercel (and they are public by design).

Your starting `.env` mapped to production:
```
DATABASE_URL=                         → managed Postgres URL (API host)
JWT_SECRET=                           → strong secret (API host)
WEB_APP_URL=http://localhost:3000     → https://www.newform.in (API host)
GOOGLE_OAUTH_CLIENT_ID=               → (API host)
GOOGLE_OAUTH_CLIENT_SECRET=           → (API host)
GOOGLE_OAUTH_REDIRECT_URI=…:8000/…    → https://api.newform.in/auth/google/callback
GITHUB_OAUTH_CLIENT_ID=               → (API host)
GITHUB_OAUTH_CLIENT_SECRET=           → (API host)
GITHUB_OAUTH_REDIRECT_URI=…:8000/…    → https://api.newform.in/auth/github/callback
NEXT_PUBLIC_API_ORIGIN=…:8000         → https://api.newform.in (Vercel)
+ add NEXT_PUBLIC_API_URL             → https://api.newform.in/trpc (Vercel)
+ add NODE_ENV=prod                   → (API host)
+ add BASE_URL=https://api.newform.in → (API host)
```

---

## 7. Post-deploy verification

- [ ] `https://api.newform.in/health` returns `{"healthy":true}`.
- [ ] `https://www.newform.in` loads (HTTPS, valid cert, no mixed-content warnings).
- [ ] DevTools → Network: a tRPC call goes to `https://api.newform.in/trpc/...` with **`200`** and request includes the `authentication-token` cookie after login.
- [ ] Google sign-in: button → Google consent → lands on `/dashboard` logged in.
- [ ] GitHub sign-in: same round-trip works.
- [ ] Email/password signup + login set the session and `/dashboard` is reachable.
- [ ] Logout clears the session and `/dashboard` redirects to `/login` (AuthGate).
- [ ] No CORS errors in the browser console.
- [ ] Public form pages (`/f/[slug]`, `/form/[form_id]`) render and submit.

If auth "logs in then immediately bounces to /login": almost always (a) cookie not `secure` over HTTPS, (b) CORS missing `credentials`/origin, or (c) `NEXT_PUBLIC_API_URL` not set so the browser hit the dead `/trpc` rewrite. Re-check §3.1–§3.3.

---

## 8. Linter & TypeScript status (checked 2026-05-26)

**TypeScript:** ✅ Clean.
- `pnpm check-types` (only `web` defines this task) passes.
- `apps/api` `tsc --noEmit` passes.
- `pnpm build` (turbo) succeeds for **both** apps — web `next build` (incl. its TS step) and API `tsup`. **The deploy build is green.**

**ESLint:** ⚠️ Pre-existing issues, **not deploy blockers** (build does not gate on them), but worth fixing:

1. **Backend packages can't lint at all.** `apps/api`, `packages/{trpc,services,database,logger}` still use legacy `.eslintrc.cjs` that `extends: "@repo/eslint-config/node.js"`. ESLint 9 requires flat config (`eslint.config.js`), and `@repo/eslint-config` exports only `./base`, `./next-js`, `./react-internal` — there is **no `node.js` export**. Result: `pnpm lint` fails with *"ESLint couldn't find an eslint.config.(js|mjs|cjs) file"*.
   - **Fix:** add a `base.js`-based flat `eslint.config.js` to each backend package (or add a `./node` export to `@repo/eslint-config` and migrate). Example per package:
     ```js
     // eslint.config.js
     import { config } from "@repo/eslint-config/base";
     export default config;
     ```
     and delete the old `.eslintrc.cjs`.

2. **Web lint = 9 warnings, 0 errors,** but `web` runs `eslint --max-warnings 0`, so the `lint` task fails on warnings:
   - `components/ui/calendar.tsx` — 4× `react/prop-types`
   - `components/ui/combobox.tsx:251` — `children` defined but never used
   - `env.js` — 3× `no-undef` (`process`) + 1× `turbo/no-undeclared-env-vars` (`SKIP_ENV_VALIDATION`)
   - **Fixes:** add `SKIP_ENV_VALIDATION` to `turbo.json` `globalEnv`; mark `env.js` as a Node file in the ESLint config (or add `/* eslint-env node */`); remove the unused `children`; the `react/prop-types` warnings are noise from shadcn wrappers — disable `react/prop-types` for `components/ui/**` or relax `--max-warnings`.

These do not block Vercel (Next's build passed). Fix them to keep `pnpm lint` green in CI.

---

## 9. Operational notes

- **Migrations on release:** run `pnpm --filter @repo/database db:migrate` against the prod DB whenever `packages/database/drizzle/` gains a migration. Consider wiring it into the API host's release/predeploy hook.
- **Secrets:** rotate `JWT_SECRET` only with a plan — it invalidates all existing sessions.
- **`docker-compose.yml`** is local-dev Postgres only; it is not used in production.
- **Logs:** API logs JSON in prod (winston). Set `LOGGER_LEVEL=info` to see request/boot logs; `error` is the prod default.
- **Rollback:** Vercel keeps immutable deployments — promote a previous deployment to roll back the web instantly. For the API, redeploy the previous Git SHA. DB rollbacks require a restore from your provider's backup, so test migrations on a staging DB first.

---

## 10. Alternative (Topology B — single-origin proxy, no CORS)

If you prefer to avoid CORS entirely and serve everything from `www.newform.in`:
1. In `apps/web/next.config.js`, add rewrites for **both** `/trpc/:path*` **and** `/auth/:path*` → `${NEXT_PUBLIC_API_ORIGIN}/...`.
2. Set `NEXT_PUBLIC_API_ORIGIN=https://www.newform.in` and **do not** set `NEXT_PUBLIC_API_URL` (so the browser uses relative paths).
3. Register OAuth redirect URIs under `https://www.newform.in/auth/<provider>/callback`; set `*_OAUTH_REDIRECT_URI` accordingly on the API.
4. Keep cookies `secure: true`, `sameSite: "lax"`. The API still needs `app.set("trust proxy", 1)`.

Trade-off: no CORS, but you now proxy OAuth 302s and `Set-Cookie` through Vercel rewrites — more surface for subtle bugs. Topology A (§2–§6) is the recommended default.
