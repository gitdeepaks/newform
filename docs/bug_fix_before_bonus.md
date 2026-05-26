# Bug Fix Plan Before Bonus Work

Time left: about `00d 13h 48m` when this plan was requested.

Goal: fix correctness, security, deployment, and documentation risks before implementing more bonus features.

Mandatory engineering standards:

- Keep implementation end-to-end type-safe.
- Use Zod schemas at API/service boundaries.
- Do not use unsafe casts such as `as any`, `as unknown as`, or broad forced casting.
- Prefer narrow typed helpers and schema parsing over ad-hoc object access.
- Preserve the existing implementation order when backend behavior changes:

`DB -> service -> tRPC Procedure -> hook -> UI`

This plan covers four issues:

1. Legacy public form route and old submit flow are risky.
2. OAuth env vars can break deployment if missing.
3. Dashboard metrics currently show placeholder `--` values.
4. `docs/plan.md` is stale after Priority 5/6 and CSV export.

## Priority Order

Recommended order:

1. Fix legacy `/form/[form_id]` and public `submitForm` exposure.
2. Make OAuth env/deployment behavior safe.
3. Fix dashboard metrics or label them honestly.
4. Update `docs/plan.md`.
5. Run final verification.

Reason:

- The legacy public route is the largest correctness/security risk.
- OAuth env risk can block deployed API startup.
- Dashboard placeholders are product polish and judge-trust issues.
- Plan updates should happen after code behavior is confirmed.

## Issue 1: Legacy Public Route Risk

## Problem

Current risk:

- `/form/[form_id]` still exists.
- It uses `useForm(form_id)`, which calls public `form.getForm`.
- `form.getForm` calls `formService.getFormById(input)` without owner/public-status checks.
- `submitForm` is still public.
- `submitForm` uses the old submission path and bypasses newer protections:
  - slug status checks
  - published-only checks
  - expiry checks
  - response limit checks
  - server-side answer validation by field schema
  - honeypot protection
  - IP + slug rate limiting
  - response event logging
  - email event logging

Impact:

- A draft or unpublished form could be loaded by raw form ID if someone knows or guesses the ID.
- Old public submissions may write invalid data or bypass analytics/security behavior.
- This weakens the final demo story because the product has two public submission paths with different guarantees.

## Desired Behavior

Final public path should be:

- `/f/[slug]`

Legacy path should not expose form contents by ID.

Acceptable behavior options:

### Recommended Option: Redirect Legacy Route

- `/form/[form_id]` loads a safe public redirect lookup.
- If the form exists and is `published`, redirect to `/f/[slug]`.
- If form is draft/unpublished/archived/missing, show unavailable state or redirect to `/templates`.
- It must not render fields directly.
- It must not submit through old `submitForm`.

### Simpler Option: Disable Legacy Route

- `/form/[form_id]` always shows a message:
  - `This link format is deprecated. Please use the public share link.`
- No form data is loaded.

Recommended for hackathon:

- Use redirect behavior if it can be implemented cleanly.
- Otherwise disable the route. Security is more important than backward compatibility.

## Implementation Steps

### Step 1.1: Service Layer

File:

- `packages/services/form/model.ts`

Add input schema:

```ts
export const getPublicRedirectByIdInputSchema = z.object({
  formId: z.string().uuid().describe("The legacy public form id"),
});
```

Add type:

```ts
export type GetPublicRedirectByIdInputSchemaType = z.infer<typeof getPublicRedirectByIdInputSchema>;
```

File:

- `packages/services/form/index.ts`

Add method:

```ts
public async getPublicRedirectById(input: GetPublicRedirectByIdInputSchemaType) {
  const { formId } = await getPublicRedirectByIdInputSchema.parseAsync(input);

  const rows = await db
    .select({
      id: formsTable.id,
      slug: formsTable.slug,
      status: formsTable.status,
      expiresAt: formsTable.expiresAt,
    })
    .from(formsTable)
    .where(eq(formsTable.id, formId))
    .limit(1);

  const form = rows[0];
  if (!form || form.status !== "published") {
    throw new Error(`Form With ${formId} Not Found`);
  }

  if (form.expiresAt && form.expiresAt.getTime() < Date.now()) {
    throw new Error("This form is closed");
  }

  return { slug: form.slug };
}
```

Type-safety notes:

- Validate `formId` as UUID with Zod.
- Return only `{ slug }`; do not return fields or private form data.
- No unsafe casting.

### Step 1.2: tRPC Schema

File:

- `packages/trpc/server/routes/form/model.ts`

Add schemas:

```ts
export const getPublicRedirectByIdInputSchema = z.object({
  formId: z.string().uuid().describe("The legacy public form id"),
});

export const getPublicRedirectByIdOutputSchema = z.object({
  slug: z.string(),
});
```

Important:

- Keep route model schemas independent if that is the current pattern.
- Or re-export/reuse service schema only if the repo already does that consistently.
- Do not widen output to full form.

### Step 1.3: tRPC Procedure

File:

- `packages/trpc/server/routes/form/route.ts`

Add public query:

```ts
getPublicRedirectById: publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: getPath("/getPublicRedirectById"),
      tags: TAGS,
    },
  })
  .input(getPublicRedirectByIdInputSchema)
  .output(getPublicRedirectByIdOutputSchema)
  .query(async ({ input }) => {
    return formService.getPublicRedirectById(input);
  }),
```

Deprecate old public procedures:

- Keep `getForm` only if needed internally, but it should not be used by public UI.
- Prefer changing `getForm` from `publicProcedure` to `protectedProcedure` if no public caller remains.
- Remove or deprecate `submitForm` if old route no longer submits.

Recommended final state:

- `getFormForOwner`: protected creator form read.
- `getPublicFormBySlug`: public published slug read.
- `submitPublicResponse`: public secure submit.
- `getForm`: either removed from UI usage or made protected.
- `submitForm`: removed from UI usage and preferably removed from router if build impact is manageable.

If removing procedures is too risky:

- Leave procedures temporarily but mark them in comments as deprecated.
- Ensure no frontend hook/page uses them.

### Step 1.4: Hook Layer

File:

- `apps/web/hooks/api/form/index.ts`

Add hook:

```ts
export const usePublicRedirectById = (formId: string) => {
  const query = trpc.form.getPublicRedirectById.useQuery({ formId });

  return {
    redirectData: query.data,
    redirectError: query.error,
    redirectIsLoading: query.isLoading,
  };
};
```

Remove old usage where possible:

- Do not use `useForm` on public pages.
- Do not use `useSubmitForm` on public pages.

Optional cleanup:

- Remove `useSubmitForm` if no usage remains.
- Remove public `useForm` if no public usage remains, or rename to `useUnsafeFormById` is not recommended. Better to remove dead usage.

### Step 1.5: UI Layer

File:

- `apps/web/app/form/[form_id]/page.tsx`

Recommended implementation:

- Replace the full old form renderer with a redirect page.
- Use `usePublicRedirectById(form_id)`.
- Use `useRouter` from `next/navigation`.
- When `redirectData.slug` exists, call `router.replace(`/f/${redirectData.slug}`)` inside `useEffect`.
- Show loading state while resolving.
- Show unavailable/deprecated state on error.

Pseudo-flow:

```ts
const { form_id } = use(params);
const router = useRouter();
const { redirectData, redirectError, redirectIsLoading } = usePublicRedirectById(form_id);

useEffect(() => {
  if (redirectData?.slug) {
    router.replace(`/f/${redirectData.slug}`);
  }
}, [redirectData?.slug, router]);
```

UI states:

- Loading:
  - `Checking legacy link...`
- Error:
  - `This legacy form link is unavailable.`
  - Button: `Browse templates` -> `/templates`
- Redirecting:
  - `Redirecting to the public form...`

Do not render form fields in this route.

### Step 1.6: Verification

Commands:

```bash
pnpm check-types
pnpm build
```

Manual checks:

- Open `/form/[publishedFormId]`.
- Expected: redirects to `/f/[slug]`.
- Open `/form/[draftFormId]`.
- Expected: unavailable state, no fields shown.
- Open `/form/[invalidUuid]`.
- Expected: graceful error state.
- Submit through `/f/[slug]`.
- Expected: secure submit path still works.
- Search code for `useSubmitForm` and old `submitForm` usage.
- Expected: no public UI uses old submit.

## Issue 2: OAuth Env Risk

## Problem

Current risk:

- `packages/services/env.ts` requires OAuth variables:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `GITHUB_OAUTH_CLIENT_ID`
  - `GITHUB_OAUTH_CLIENT_SECRET`
  - `GITHUB_OAUTH_REDIRECT_URI`
- If deployment does not define these, imports from `@repo/services` can throw during startup.
- That can break API boot even if email/password auth is enough for demo.

## Desired Behavior

Deployment should not fail just because optional OAuth credentials are missing.

OAuth buttons should be shown only when providers are configured, or should fail gracefully.

Recommended behavior:

- Make OAuth env vars optional in schema.
- Add typed provider availability helpers.
- `getOAuthProviders` should return only configured providers.
- OAuth start routes should return/redirect with a clear error if provider is not configured.
- Login/signup UI should render provider buttons based on `getOAuthProviders` instead of hardcoding both.

## Implementation Steps

### Step 2.1: Service Env Schema

File:

- `packages/services/env.ts`

Change OAuth env vars from required to optional:

```ts
GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
GOOGLE_OAUTH_REDIRECT_URI: z.url().optional(),
GITHUB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
GITHUB_OAUTH_REDIRECT_URI: z.url().optional(),
```

Add helpers:

```ts
export const isGoogleOAuthConfigured = () =>
  Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REDIRECT_URI);

export const isGitHubOAuthConfigured = () =>
  Boolean(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET && env.GITHUB_OAUTH_REDIRECT_URI);
```

Type-safety notes:

- Helpers return boolean only.
- Do not assert optional vars to string without narrowing.

### Step 2.2: Provider Config Access

Files:

- `packages/services/auth-providers/google.ts`
- `packages/services/auth-providers/github.ts`
- `packages/services/clients/google-oauth.ts`

Problem:

- Google OAuth client may be constructed at import time with missing env values.

Safer implementation:

- Avoid constructing provider clients with missing env at module import time.
- Add a helper that returns configured values after explicit checks.

Example for Google:

```ts
function getGoogleOAuthConfig() {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured");
  }

  return { clientId, clientSecret, redirectUri };
}
```

Then construct client inside the function after narrowing, or update client factory:

```ts
function createGoogleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}
```

For GitHub:

- Use local config helper before building authorization URL or token request.
- After helper returns, TypeScript knows values are strings.

No casting.

### Step 2.3: tRPC Auth Providers

File:

- `packages/trpc/server/routes/auth/route.ts`

Current:

```ts
getOAuthProviders: publicProcedure.query(() => ({ providers: ["google", "github"] }))
```

Change to return only configured providers:

```ts
const providers: Array<"google" | "github"> = [];
if (isGoogleOAuthConfigured()) providers.push("google");
if (isGitHubOAuthConfigured()) providers.push("github");
return { providers };
```

Type-safety notes:

- Use explicit union array type.
- Keep existing Zod output schema.

### Step 2.4: API OAuth Routes

File:

- `apps/api/src/routes/oauth.ts`

Before redirecting to provider:

- Check provider configuration.
- If missing, redirect to login with query error:
  - `/login?error=oauth_not_configured`

Example:

```ts
oauthRouter.get("/google/start", (_req, res) => {
  if (!isGoogleOAuthConfigured()) {
    res.redirect(redirectToFailure("oauth_not_configured"));
    return;
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, state);
  res.redirect(getGoogleAuthorizationUrl(state));
});
```

Do the same for GitHub.

### Step 2.5: Frontend Hooks/UI

Files:

- `apps/web/hooks/api/auth/index.ts`
- `apps/web/components/login-form.tsx`
- `apps/web/components/signup-form.tsx`

Add/use hook:

```ts
export const useOAuthProviders = () => {
  const query = trpc.auth.getOAuthProviders.useQuery();
  return {
    providers: query.data?.providers ?? [],
    providersIsLoading: query.isLoading,
    providersError: query.error,
  };
};
```

Login/signup UI:

- Do not hardcode Google/GitHub buttons unconditionally.
- Render Google button only if `providers.includes("google")`.
- Render GitHub button only if `providers.includes("github")`.
- If providers are loading, optionally show skeleton/disabled area.
- If no providers are configured, show only email/password auth.

Optional:

- If `login?error=oauth_not_configured`, show a toast or inline error.

### Step 2.6: Verification

Commands:

```bash
pnpm check-types
pnpm build
```

Manual checks:

- Temporarily run API without OAuth env vars.
- Expected: API starts.
- Open login/signup.
- Expected: OAuth buttons hidden if providers are not configured.
- Configure only Google.
- Expected: only Google button appears.
- Configure only GitHub.
- Expected: only GitHub button appears.
- Configure both.
- Expected: both appear.
- Click unconfigured provider URL directly.
- Expected: redirects to login with safe error.

## Issue 3: Dashboard Metrics Are Partly Fake

## Problem

Current dashboard metrics show placeholder values such as:

- Total responses: `--`
- Completion rate: `--`
- CSV exports: `--`

Impact:

- UI looks polished but partially fake.
- Judges may distrust analytics if dashboard-level metrics are placeholders.

## Desired Behavior

Choose one of two approaches.

### Recommended Fast Approach: Honest Labels

- Keep dashboard as overview/entry page.
- Replace fake metric placeholders with honest CTA cards.
- Example:
  - `Open a form to view analytics`
  - `Responses are tracked per form`
  - `CSV export is available from Responses`
- This avoids new backend work.

### More Complete Approach: Wire Basic Dashboard Totals

Add backend aggregate endpoint for dashboard metrics.

Use only if time permits.

## Recommended Implementation: Honest Dashboard Cards

### Step 3.1: UI Copy Cleanup

File:

- `apps/web/app/dashboard/page.tsx`

Replace `--` metrics with cards that are clearly action-oriented.

Examples:

- `Active forms`: real count from `useForms()`.
- `Templates`: static `3 seeded` or link to `/templates`.
- `Analytics`: `Per form` with CTA text.
- `CSV export`: `Available` with instruction.

Possible metrics array:

```ts
const metrics = [
  ["Active forms", activeForms.toString(), "Live", "Public and unlisted forms in your workspace"],
  ["Analytics", "Per form", "Ready", "Open any form to view response analytics"],
  ["CSV export", "Available", "Ready", "Open Responses from a form to export CSV"],
  ["Templates", "3 seeded", "Demo", "Start from public demo templates"],
];
```

No backend changes required.

### Step 3.2: Recent Forms Table Cleanup

Current table has placeholder columns:

- Responses: `--`
- Completion: `--`

Options:

- Remove those columns.
- Or replace with action/status columns.

Recommended:

- Columns:
  - Form
  - Status
  - Visibility
  - Updated
  - Action

Action:

- `Open builder` -> `/dashboard/forms/[id]`

This keeps dashboard truthful without new aggregate endpoints.

### Step 3.3: Verification

Commands:

```bash
pnpm check-types
pnpm build
```

Manual checks:

- Open `/dashboard`.
- Confirm no `--` placeholder metrics remain.
- Confirm Recent Forms table does not show fake responses/completion values.
- Confirm links to builder/forms/templates work.

## Optional Complete Dashboard Metrics Endpoint

Only implement this if there is extra time after all critical fixes.

Required order:

`DB -> service -> tRPC -> hook -> UI`

DB:

- No new tables needed.
- Use `forms`, `form_submissions`, `response_events`.

Service:

- Add `getDashboardSummary({ userId })` to relevant service.
- Return:
  - total forms
  - active forms
  - total submissions owned by user
  - total views owned by user
  - completion rate

tRPC:

- Add protected `getDashboardSummary` procedure.

Hook:

- Add `useDashboardSummary()`.

UI:

- Use real metrics in dashboard cards.

Reason this is optional:

- It is useful but not necessary if honest cards remove fake values.

## Issue 4: docs/plan.md Is Stale

## Problem

Current `docs/plan.md` still contains stale statements:

- Important gaps mention templates/themes/landing/pricing missing, though they are now implemented or partially implemented.
- Priority 6 Landing/Pricing is not marked completed/partially completed.
- Bonus CSV export still appears as a future bonus even though it is already implemented in Priority 4.

Impact:

- Project status is confusing.
- Future implementation planning becomes inaccurate.
- Hackathon submission notes may look inconsistent.

## Desired Updates

File:

- `docs/plan.md`

Update current status:

- Mention templates page exists.
- Mention themes and seeded data exist.
- Mention landing and pricing exist.
- Mention theme toggling and social login if verified.
- Mention logout in sidebar if verified.

Update important gaps:

- Remove templates/themes/landing/pricing from missing list if done.
- Keep remaining gaps:
  - README polish
  - deployment
  - final Scalar docs verification
  - optional bonus features

Update Priority 6:

- Mark Landing/Pricing subsection as completed or partially completed.
- Add completed files, such as:
  - `apps/web/app/page.tsx`
  - `apps/web/app/pricing/page.tsx`
  - `apps/web/components/public-header.tsx`
  - `apps/web/components/theme-switcher.tsx`
  - `apps/web/components/app-sidebar.tsx`
  - `apps/web/components/nav-main.tsx`
  - `apps/web/components/nav-user.tsx`
  - `apps/web/components/site-header.tsx`
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/providers/global.tsx`
  - `apps/web/app/layout.tsx`

Update Bonus Priority list:

- Change:

```md
1. CSV export for responses.
```

to:

```md
1. CSV export for responses - Completed in Priority 4.
```

Update manual verification:

- Use `/templates` instead of `explore`.
- Include `/pricing`.
- Include landing page.
- Include OAuth only if configured.

## Final Verification Sequence

Run after fixes:

```bash
pnpm check-types
pnpm build
```

Run seed only if DB state needs final refresh:

```bash
pnpm db:seed
```

Manual verification:

- `/` loads and links work.
- `/pricing` loads and links work.
- `/templates` shows only public published forms.
- `/dashboard` requires auth.
- Sidebar logout works.
- `/dashboard/forms` works.
- `/dashboard/forms/[id]` works.
- `/dashboard/forms/[id]/submissions` works and CSV export works.
- `/f/[slug]` works.
- `/form/[form_id]` does not expose draft/unpublished form fields.
- Old `submitForm` is not used by public UI.
- API boots without OAuth env vars if OAuth is intended to be optional.

## Completion Criteria

These fixes are complete when:

- Legacy ID public route no longer exposes form fields directly.
- Public submissions only use secure slug submission flow.
- OAuth missing-env deployment does not crash the app.
- Login/signup show OAuth buttons only for configured providers.
- Dashboard contains no misleading `--` fake metrics.
- `docs/plan.md` reflects current project status.
- `pnpm check-types` passes.
- `pnpm build` passes.

Only after this should bonus features continue.
