# Industry-Grade Social Login Provider Plan

## Scope

Implement social login for Google and GitHub using a SaaS-ready provider account model.

Requested implementation path:

1. DB
2. Service
3. TRPC procedure
4. Hook
5. UI

Important constraints:

1. End-to-end type safety.
2. No `as any`.
3. No low-profile demo shortcuts.
4. Keep code simple but production-grade.
5. Keep existing email/password auth working.
6. Do not use email-only OAuth matching as the final identity model.

## Current Project Flow

### Database

Current user model:

```txt
packages/database/models/user.ts
```

Current table:

```ts
usersTable
```

Important columns:

1. `id`
2. `fullName`
3. `email`
4. `emailVerified`
5. `salt`
6. `password`
7. `profileImageUrl`
8. `createdAt`
9. `updatedAt`

Current limitation:

1. There is no OAuth provider account table.
2. There is no stable provider identity mapping.
3. A user cannot safely link both Google and GitHub.
4. OAuth would have to rely on email-only matching if we do not add a provider table.

For SaaS, this is not enough.

### Service Layer

Current user service:

```txt
packages/services/user/index.ts
```

Current auth responsibilities:

1. Create user with email/password.
2. Sign in user with email/password.
3. Generate JWT.
4. Verify JWT.
5. Fetch logged-in user info.

Current model file:

```txt
packages/services/user/model.ts
```

Current limitation:

1. No provider enum.
2. No OAuth profile input schema.
3. No account-linking model.
4. No provider identity lookup.

### TRPC Layer

Current auth route:

```txt
packages/trpc/server/routes/auth/route.ts
```

Current procedures:

1. `createUserWithEmailAndPassword`
2. `signInUserWithEmailAndPassword`
3. `getLoggedInUserInfo`

Current limitation:

1. No procedure to create OAuth authorization URL.
2. No procedure to complete OAuth callback.
3. No logout procedure yet.
4. OAuth callback cannot be handled purely by TRPC if provider redirects directly to API.

### API Layer

Current API server:

```txt
apps/api/src/server.ts
```

Current server mounts:

1. `/api` for OpenAPI middleware.
2. `/trpc` for TRPC middleware.
3. Basic health/docs routes.

Current limitation:

1. No OAuth callback routes.
2. No provider start/callback route helpers.

### Frontend Layer

Current hooks:

```txt
apps/web/hooks/api/auth/index.ts
```

Current forms:

```txt
apps/web/components/login-form.tsx
apps/web/components/signup-form.tsx
```

Current social UI:

1. Login page has Google/GitHub buttons without handlers.
2. Signup page has Google/GitHub buttons that show placeholder toasts.

## Target Architecture

Use a standard SaaS auth identity model:

1. `users` table is the canonical app user.
2. `user_accounts` table stores external identity provider accounts.
3. Google/GitHub provider IDs are the stable OAuth identity source.
4. Email is used for initial linking only when provider email is verified.
5. JWT cookie remains the app session mechanism.
6. TRPC remains the typed app API boundary.
7. Provider callbacks are handled by API routes because OAuth providers redirect via browser.

## DB Plan

### Add User Accounts Table

Create file:

```txt
packages/database/models/user-account.ts
```

Recommended table:

```ts
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const userAccountsTable = pgTable(
  "user_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    provider: varchar("provider", { length: 32 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_accounts_provider_account_id_unique").on(
      table.provider,
      table.providerAccountId,
    ),
    uniqueIndex("user_accounts_user_provider_unique").on(table.userId, table.provider),
  ],
);

export type SelectUserAccount = typeof userAccountsTable.$inferSelect;
export type InsertUserAccount = typeof userAccountsTable.$inferInsert;
```

Why this table exists:

1. Provider account ID is the stable external identity.
2. Same app user can link Google and GitHub.
3. Provider-specific identity is not mixed into the canonical `users` table.
4. Future providers can be added without changing `users`.

### Export New Table

Update:

```txt
packages/database/schema.ts
```

Add:

```ts
export * from "./models/user-account";
```

### Optional User Table Hardening

Current:

```ts
emailVerified: boolean("email_verified").default(false),
```

Recommended:

```ts
emailVerified: boolean("email_verified").notNull().default(false),
```

This is optional but recommended for SaaS data integrity.

### Migration Commands

After schema updates:

```txt
pnpm db:generate
pnpm db:migrate
```

Before running migration, inspect generated SQL to confirm:

1. `user_accounts` table is created.
2. Foreign key references `users(id)` with cascade delete.
3. Unique index on `(provider, provider_account_id)` exists.
4. Unique index on `(user_id, provider)` exists.

## Service Layer Plan

### Provider Types and Input Schemas

Update:

```txt
packages/services/user/model.ts
```

Add provider schema:

```ts
export const oauthProviderSchema = z.enum(["google", "github"]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
```

Add OAuth user input:

```ts
export const findOrCreateOAuthUserInputSchema = z.object({
  provider: oauthProviderSchema,
  providerAccountId: z.string().trim().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  fullName: z.string().trim().min(1).max(80),
  profileImageUrl: z.url().optional(),
});

export type FindOrCreateOAuthUserInput = z.infer<typeof findOrCreateOAuthUserInputSchema>;
```

Why:

1. Providers are a closed union, not arbitrary strings.
2. OAuth profile data is validated before database writes.
3. Service method has a type-safe contract.

### Add OAuth User Service Method

Update:

```txt
packages/services/user/index.ts
```

Add method:

```ts
public async findOrCreateOAuthUser(input: FindOrCreateOAuthUserInput) {
  // parse input
  // require verified email
  // check account by provider + providerAccountId
  // if found: return JWT for linked user
  // if not found: check user by email
  // if email user exists: link provider account
  // if not: create user and account
  // return id + token
}
```

Detailed algorithm:

1. Parse input with `findOrCreateOAuthUserInputSchema.parseAsync(input)`.
2. If `emailVerified` is false, throw `OAuth email must be verified`.
3. Query `userAccountsTable` by `provider` and `providerAccountId`.
4. If account exists:
   - Query linked user by `userId`.
   - If user does not exist, throw data-integrity error.
   - Generate JWT.
   - Return `{ id, token }`.
5. If account does not exist:
   - Query `usersTable` by verified email.
6. If user exists:
   - Insert `userAccountsTable` row for this provider.
   - Optionally update `profileImageUrl` if currently missing.
   - Optionally set `emailVerified` to true.
   - Generate JWT.
   - Return `{ id, token }`.
7. If user does not exist:
   - Insert into `usersTable` with:
     - `email`
     - `fullName`
     - `emailVerified: true`
     - `profileImageUrl`
     - no password/salt
   - Insert into `userAccountsTable`.
   - Generate JWT.
   - Return `{ id, token }`.

### Transaction Requirement

Use a database transaction for create/link flow.

Reason:

1. Creating user and account must be atomic.
2. Linking account to existing user must be atomic.
3. Avoid orphan users or orphan provider accounts.

Pseudo-flow:

```ts
await db.transaction(async (tx) => {
  // find or create user
  // create provider account
});
```

### Race Condition Handling

Because OAuth callbacks can be retried or double-clicked, provider account insert can race.

Industry approach:

1. Unique indexes protect DB integrity.
2. Service should handle duplicate insert errors gracefully if practical.
3. If duplicate provider account occurs, re-query provider account and return linked user.

First implementation can rely on unique index and normal error handling. A follow-up can add specific duplicate handling if Drizzle error typing is clean.

## OAuth Provider Profile Services

Create dedicated provider service files. Keep provider parsing out of route handlers.

Recommended files:

```txt
packages/services/auth-providers/google.ts
packages/services/auth-providers/github.ts
packages/services/auth-providers/model.ts
```

Alternative simpler structure:

```txt
packages/services/oauth/google.ts
packages/services/oauth/github.ts
packages/services/oauth/model.ts
```

### Shared Provider Profile Type

Create schema:

```ts
export const oauthProfileSchema = z.object({
  provider: oauthProviderSchema,
  providerAccountId: z.string().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  fullName: z.string().min(1).max(80),
  profileImageUrl: z.url().optional(),
});

export type OAuthProfile = z.infer<typeof oauthProfileSchema>;
```

### Google Provider Flow

Existing file:

```txt
packages/services/clients/google-oauth.ts
```

It already creates `OAuth2Client`, but env schema does not include Google vars yet.

Google flow:

1. Generate authorization URL.
2. Include scopes:
   - `openid`
   - `email`
   - `profile`
3. Include `state`.
4. Callback exchanges `code` for tokens.
5. Verify ID token.
6. Extract claims:
   - `sub` as `providerAccountId`
   - `email`
   - `email_verified`
   - `name`
   - `picture`
7. Parse claims with Zod.
8. Return normalized `OAuthProfile`.

Google-specific schema:

```ts
const googleIdTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().min(1),
  picture: z.url().optional(),
});
```

### GitHub Provider Flow

GitHub flow does not require extra package. Use native `fetch`.

Authorization URL:

```txt
https://github.com/login/oauth/authorize
```

Token URL:

```txt
https://github.com/login/oauth/access_token
```

User URL:

```txt
https://api.github.com/user
```

Emails URL:

```txt
https://api.github.com/user/emails
```

Scopes:

1. `read:user`
2. `user:email`

GitHub callback algorithm:

1. Exchange `code` for access token.
2. Fetch GitHub user.
3. Fetch GitHub emails.
4. Choose primary verified email.
5. Normalize profile:
   - provider: `github`
   - providerAccountId: GitHub `id` as string
   - email: primary verified email
   - emailVerified: true
   - fullName: `name || login`
   - profileImageUrl: `avatar_url`
6. Parse with Zod.
7. Return `OAuthProfile`.

GitHub schemas:

```ts
const githubTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  scope: z.string().optional(),
});

const githubUserSchema = z.object({
  id: z.number(),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatar_url: z.url().optional(),
});

const githubEmailSchema = z.object({
  email: z.email(),
  primary: z.boolean(),
  verified: z.boolean(),
  visibility: z.string().nullable(),
});
```

## Environment Variables

### Required Local `.env` Values

Add these values to the root `.env` for local development because the repo runs commands through `dotenv -- turbo ...`.

Keep existing values like `DATABASE_URL` and `JWT_SECRET` unchanged.

```env
WEB_APP_URL=http://localhost:3000

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback

GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8000/auth/github/callback

NEXT_PUBLIC_API_ORIGIN=http://localhost:8000
```

If `NEXT_PUBLIC_API_URL` is already used for TRPC, keep it as-is or set it explicitly:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/trpc
```

Final local example:

```env
DATABASE_URL=your-existing-database-url
JWT_SECRET=your-existing-jwt-secret

WEB_APP_URL=http://localhost:3000

GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxxxx
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback

GITHUB_OAUTH_CLIENT_ID=xxxxx
GITHUB_OAUTH_CLIENT_SECRET=xxxxx
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8000/auth/github/callback

NEXT_PUBLIC_API_URL=http://localhost:8000/trpc
NEXT_PUBLIC_API_ORIGIN=http://localhost:8000
```

Important rules:

1. Provider callback URLs in `.env` must exactly match provider console callback URLs.
2. No trailing slash unless it is present in both places.
3. Provider secrets must never be prefixed with `NEXT_PUBLIC_`.
4. Only `NEXT_PUBLIC_API_ORIGIN` is exposed to browser because the UI needs to start OAuth redirect.

### Google Cloud Console Setup

Create a Google OAuth app from Google Cloud Console.

Console URL:

```txt
https://console.cloud.google.com/
```

Steps:

1. Create or select a project, for example `NewForm`.
2. Go to `APIs & Services`.
3. Open `OAuth consent screen`.
4. Choose user type `External` for normal public SaaS usage.
5. Fill app details:

```txt
App name: NewForm
User support email: your email
Developer contact email: your email
```

6. Add scopes:

```txt
openid
email
profile
```

7. If the OAuth app is in testing mode, add your Google account as a test user.
8. Go to `APIs & Services` -> `Credentials`.
9. Click `Create Credentials` -> `OAuth client ID`.
10. Select application type `Web application`.
11. Use a name like:

```txt
NewForm Local Web
```

12. Add authorized JavaScript origins:

```txt
http://localhost:3000
http://localhost:8000
```

13. Add authorized redirect URI:

```txt
http://localhost:8000/auth/google/callback
```

14. Copy the generated credentials into `.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

Production setup later:

```env
WEB_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_ORIGIN=https://api.yourdomain.com
GOOGLE_OAUTH_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
```

Also add the production redirect URI in Google Cloud Console:

```txt
https://api.yourdomain.com/auth/google/callback
```

### GitHub OAuth App Setup

Create a GitHub OAuth app from GitHub Developer Settings.

Settings URL:

```txt
https://github.com/settings/developers
```

Steps:

1. Open `OAuth Apps`.
2. Click `New OAuth App`.
3. Fill local app details:

```txt
Application name: NewForm Local
Homepage URL: http://localhost:3000
Application description: NewForm SaaS auth
Authorization callback URL: http://localhost:8000/auth/github/callback
```

4. Create the app.
5. Copy credentials into `.env`:

```env
GITHUB_OAUTH_CLIENT_ID=your-github-client-id
GITHUB_OAUTH_CLIENT_SECRET=your-github-client-secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8000/auth/github/callback
```

GitHub scopes requested by code:

```txt
read:user
user:email
```

Why `user:email` is required:

1. GitHub profile email can be private or null.
2. The app must fetch verified emails from `https://api.github.com/user/emails`.
3. SaaS account linking must use a verified email when linking a new provider account to an existing user.

Production setup later:

```txt
Homepage URL: https://yourdomain.com
Authorization callback URL: https://api.yourdomain.com/auth/github/callback
```

Use a separate production GitHub OAuth app if possible. It keeps local and production credentials isolated.

### Provider Callback URL Match Checklist

Google Console redirect URI must match:

```txt
http://localhost:8000/auth/google/callback
```

`.env` must match:

```env
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

GitHub OAuth callback URL must match:

```txt
http://localhost:8000/auth/github/callback
```

`.env` must match:

```env
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8000/auth/github/callback
```

If these differ by protocol, port, path, or trailing slash, OAuth callback can fail.

### API Env

Update:

```txt
apps/api/src/env.ts
```

Add:

```ts
WEB_APP_URL: z.url().default("http://localhost:3000"),
```

Purpose:

1. API needs to redirect browser back to web after OAuth success/failure.
2. Avoid hardcoding frontend origin in OAuth routes.

### Services Env

Update:

```txt
packages/services/env.ts
```

Add:

```ts
GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
GOOGLE_OAUTH_REDIRECT_URI: z.url(),
GITHUB_OAUTH_CLIENT_ID: z.string().min(1),
GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1),
GITHUB_OAUTH_REDIRECT_URI: z.url(),
```

Expected local values:

```txt
WEB_APP_URL=http://localhost:3000
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8000/auth/github/callback
```

### Web Env

Update:

```txt
apps/web/env.js
```

Add:

```ts
NEXT_PUBLIC_API_ORIGIN: z.string().url().optional(),
```

Runtime:

```ts
NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN,
```

Default behavior in code:

```ts
const apiOrigin = env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";
```

Purpose:

1. Social button needs to redirect browser to API OAuth start endpoint.
2. Existing `NEXT_PUBLIC_API_URL` points to TRPC URL, not API origin.

## Cookie and State Security

OAuth requires a CSRF `state` parameter.

### Add OAuth State Cookie Helpers

Update or add helpers near:

```txt
packages/trpc/server/utils/cookie.ts
```

But this file currently depends on TRPC context. API OAuth routes have Express `req/res`, not TRPC context.

Recommended better design:

Create shared cookie constants and helpers that can work with Express response directly.

Possible file:

```txt
packages/trpc/server/utils/auth-cookie.ts
```

Or keep existing file and add exported constants:

```ts
export const AUTHENTICATION_COOKIE_NAME = "authentication-token";
export const OAUTH_STATE_COOKIE_NAME = "oauth-state";
```

For API routes, use `res.cookie` and `res.clearCookie` directly with shared options.

### State Flow

Start endpoint:

1. Generate cryptographically secure random state.
2. Store state in httpOnly cookie.
3. Include same state in provider authorization URL.
4. Redirect to provider.

Callback endpoint:

1. Read `state` query param.
2. Read state cookie.
3. Compare exact values.
4. Clear state cookie.
5. If mismatch, redirect to `/login?error=oauth_state_invalid`.

State generation:

```ts
randomBytes(32).toString("hex")
```

### Cookie Options

OAuth-friendly cookie option:

1. `httpOnly: true`
2. `secure: true` in production
3. `secure: false` in local development
4. `sameSite: "lax"`
5. `path: "/"`

Current auth cookie uses `sameSite: "strict"`. For OAuth, `lax` is better because OAuth returns from a third-party redirect.

Recommended update:

1. Change auth cookie `sameSite` from `strict` to `lax`.
2. Make `secure` environment-aware before production deploy.

## API Route Plan

Update:

```txt
apps/api/src/server.ts
```

Add routes before `/api` and `/trpc` middleware.

Routes:

```txt
GET /auth/google/start
GET /auth/google/callback
GET /auth/github/start
GET /auth/github/callback
```

### Route Handler Structure

Keep handlers out of `server.ts` if possible.

Recommended files:

```txt
apps/api/src/routes/oauth.ts
apps/api/src/routes/oauth-utils.ts
```

`server.ts` should only mount:

```ts
app.use("/auth", oauthRouter);
```

### Google Start Route

Flow:

1. Generate state.
2. Set state cookie.
3. Generate Google URL through provider service.
4. Redirect to Google.

### Google Callback Route

Flow:

1. Validate `code` query param with Zod.
2. Validate `state` query param.
3. Verify state cookie.
4. Get normalized Google OAuth profile.
5. Call `userService.findOrCreateOAuthUser(profile)`.
6. Set auth cookie.
7. Redirect to `${WEB_APP_URL}/dashboard`.

### GitHub Start Route

Flow:

1. Generate state.
2. Set state cookie.
3. Generate GitHub URL through provider service.
4. Redirect to GitHub.

### GitHub Callback Route

Flow:

1. Validate `code` query param with Zod.
2. Validate `state` query param.
3. Verify state cookie.
4. Get normalized GitHub OAuth profile.
5. Call `userService.findOrCreateOAuthUser(profile)`.
6. Set auth cookie.
7. Redirect to `${WEB_APP_URL}/dashboard`.

### Failure Redirects

On OAuth failure:

```txt
/login?error=oauth_failed
```

More specific errors can be used:

```txt
/login?error=oauth_state_invalid
/login?error=oauth_email_unverified
/login?error=oauth_provider_error
```

Keep public error messages generic in UI.

## TRPC Procedure Plan

The user requested `service -> tRPC Procedure -> hook -> UI`. OAuth callback still needs API route because providers redirect through browser. But TRPC should still expose type-safe provider metadata/start URLs for the frontend if we want the frontend to avoid hardcoded routes.

Recommended TRPC procedures:

1. `auth.getOAuthProviders`
2. Optional: `auth.getOAuthStartUrl`

### Option A: Simple UI Redirect Without TRPC

UI directly navigates to:

```txt
${NEXT_PUBLIC_API_ORIGIN}/auth/google/start
${NEXT_PUBLIC_API_ORIGIN}/auth/github/start
```

Pros:

1. Simple.
2. Standard OAuth browser redirect.
3. Less moving pieces.

Cons:

1. Does not use TRPC for provider start.

### Option B: TRPC Provides Typed Provider Start URLs

Add TRPC query:

```ts
getOAuthStartUrl: publicProcedure
  .input(z.object({ provider: oauthProviderSchema }))
  .output(z.object({ url: z.url() }))
  .query(({ input }) => ({
    url: `${env.API_ORIGIN}/auth/${input.provider}/start`,
  }))
```

This requires API origin env inside TRPC/server package.

Pros:

1. Provider input is typed.
2. UI can use hook.

Cons:

1. Adds an extra network request before redirect.
2. Not necessary for OAuth security.

### Recommended for This Project

Use Option A for first implementation, but still define provider type shared at UI level.

Reason:

1. Browser redirects are the standard OAuth flow.
2. Callback cannot be completed through normal TRPC mutation because provider redirects to API.
3. We avoid an unnecessary roundtrip.
4. Type safety remains strong in provider services and user service.

If strict `TRPC Procedure -> hook -> UI` is required by review rubric, use Option B.

## Frontend Hook Plan

Update:

```txt
apps/web/hooks/api/auth/index.ts
```

Add hook:

```ts
type OAuthProvider = "google" | "github";

export const useOAuthSignin = () => {
  const startOAuth = (provider: OAuthProvider) => {
    const apiOrigin = env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";
    window.location.href = `${apiOrigin}/auth/${provider}/start`;
  };

  return { startOAuth };
};
```

Better type source:

1. Export provider type from a shared package if available.
2. If not, define local union in frontend.
3. Do not use arbitrary strings from UI.

Note:

This hook does not call TRPC because OAuth start is a browser navigation, not an AJAX mutation.

If implementing Option B, hook should call TRPC `getOAuthStartUrl` and then redirect.

## UI Plan

Update:

```txt
apps/web/components/login-form.tsx
apps/web/components/signup-form.tsx
```

### Login Form

Add:

```ts
const { startOAuth } = useOAuthSignin();
```

Wire buttons:

```tsx
<Button type="button" onClick={() => startOAuth("google")}>
  Login with Google
</Button>

<Button type="button" onClick={() => startOAuth("github")}>
  Login with GitHub
</Button>
```

### Signup Form

Replace placeholder toasts:

```tsx
onClick={() => startOAuth("google")}
onClick={() => startOAuth("github")}
```

### OAuth Error Toast

Optional but recommended:

1. Read `error` search param on `/login` and `/signup`.
2. Show generic toast:
   ```txt
   Social sign-in failed. Please try again.
   ```
3. Remove query param after showing toast if desired.

Keep error messages generic for security.

## Account Linking Policy

Use this initial policy:

1. If provider account exists, login that linked user.
2. If provider account does not exist but verified email matches an existing user, link provider to that user.
3. If no user exists, create new user and provider account.
4. If provider email is unverified, reject login.
5. If GitHub has no primary verified email, reject login.

Why this is SaaS-safe:

1. Verified email prevents linking to untrusted email claims.
2. Provider account ID is stored for future logins.
3. User can later use both Google and GitHub on the same app account.

## Data Integrity Rules

Required database constraints:

1. `users.email` remains unique.
2. `user_accounts(provider, provider_account_id)` is unique.
3. `user_accounts(user_id, provider)` is unique.
4. `user_accounts.user_id` cascades on user delete.

Required service validations:

1. `provider` must be `google` or `github`.
2. `providerAccountId` must be non-empty.
3. `email` must be valid.
4. `emailVerified` must be true.
5. `fullName` must be non-empty and max 80 chars.
6. `profileImageUrl` must be valid URL when present.

## Security Checklist

1. Use OAuth `state` for CSRF protection.
2. Store state in httpOnly cookie.
3. Verify callback state before exchanging or using profile.
4. Clear state cookie after callback.
5. Require verified email from provider.
6. Do not store OAuth access tokens unless needed.
7. Use `sameSite: "lax"` for OAuth-compatible cookies.
8. Use secure cookies in production.
9. Keep JWT in httpOnly cookie.
10. Do not expose provider secrets to frontend.
11. Do not trust frontend-provided OAuth profile data.
12. Validate external provider responses with Zod.

## Implementation Order

### Phase 1: DB

1. Add `user_accounts` table.
2. Export it from schema.
3. Optionally make `emailVerified` non-null.
4. Generate migration.
5. Inspect migration SQL.
6. Run migration.

### Phase 2: Service Models

1. Add `oauthProviderSchema`.
2. Add `findOrCreateOAuthUserInputSchema`.
3. Add normalized provider profile schema.

### Phase 3: User Service

1. Import `userAccountsTable`.
2. Add provider account lookup helper.
3. Add linked user lookup helper.
4. Add `findOrCreateOAuthUser`.
5. Use transaction for create/link operations.
6. Reuse existing JWT generation.

### Phase 4: Provider Services

1. Add Google authorization URL helper.
2. Add Google callback profile resolver.
3. Add GitHub authorization URL helper.
4. Add GitHub callback profile resolver.
5. Validate all external responses with Zod.

### Phase 5: API Routes

1. Add OAuth router.
2. Mount `/auth` in API server.
3. Add state cookie helpers.
4. Add start/callback routes for Google.
5. Add start/callback routes for GitHub.
6. Redirect success to dashboard.
7. Redirect failure to login with error code.

### Phase 6: TRPC Procedures

Minimum:

1. Keep existing email/password procedures.
2. No OAuth callback TRPC mutation needed.

Optional for rubric:

1. Add `getOAuthProviders` with typed provider list.
2. Add `getOAuthStartUrl` if frontend must get typed URL through TRPC.

### Phase 7: Frontend Hook

1. Add `useOAuthSignin`.
2. Use typed provider union.
3. Redirect browser to provider start endpoint.

### Phase 8: UI

1. Wire login Google button.
2. Wire login GitHub button.
3. Wire signup Google button.
4. Wire signup GitHub button.
5. Add OAuth error toast from query param.

## Testing Plan

### Type Checks

Run:

```txt
pnpm check-types
```

### Lint

Run:

```txt
pnpm lint
```

### Migration Verification

Run:

```txt
pnpm db:generate
pnpm db:migrate
```

Verify DB has:

1. `user_accounts` table.
2. `provider_account_id` column.
3. `provider` column.
4. Unique provider identity index.
5. Unique user provider index.

### Manual OAuth Checks

Google:

1. Click `Login with Google`.
2. Complete provider flow.
3. Confirm redirect to `/dashboard`.
4. Confirm `users` row exists.
5. Confirm `user_accounts` row exists with provider `google`.
6. Logout and login again with Google.
7. Confirm same user is reused.

GitHub:

1. Click `Login with GitHub`.
2. Complete provider flow.
3. Confirm redirect to `/dashboard`.
4. Confirm `users` row exists.
5. Confirm `user_accounts` row exists with provider `github`.
6. Logout and login again with GitHub.
7. Confirm same user is reused.

Account linking:

1. Create email/password user with verified email scenario if available.
2. Login with social provider using same verified email.
3. Confirm provider account links to existing user.
4. Confirm duplicate user is not created.

Failure cases:

1. Invalid state redirects to login error.
2. Missing code redirects to login error.
3. GitHub without verified email redirects to login error.
4. Provider token exchange failure redirects to login error.

## Final Recommended First Implementation

Implement this sequence first:

1. `user_accounts` DB model and migration.
2. Service schemas and `findOrCreateOAuthUser`.
3. Provider profile services for Google and GitHub.
4. API `/auth/:provider/start` and `/auth/:provider/callback` routes.
5. Frontend `useOAuthSignin` hook.
6. Wire login/signup buttons.
7. Add OAuth error toast.

Do not implement these in the same first change unless required:

1. Full dashboard layout refactor.
2. Token refresh storage.
3. Provider unlinking UI.
4. Multiple accounts per same provider for one user.
5. OAuth access token persistence.

This keeps the implementation SaaS-grade while still simple enough to ship safely.
