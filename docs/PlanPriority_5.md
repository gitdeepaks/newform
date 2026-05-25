# Priority 5 Plan: Themes, Templates, Seed Data

Goal: make the product demo-ready with visible themes, a public templates gallery, and seeded demo data.

Mandatory implementation order for every feature:

`DB -> service -> tRPC Procedure -> hook -> UI`

Chosen public listing route: `/templates`.

Reason: `/templates` is clearer for judges and users than `/explore`, matches the Typeform-style product mental model, and is also referenced by the Priority 6 landing-page plan.

## Scope

Priority 5 includes:

- Theme database model and migration.
- Theme service methods.
- tRPC procedures for listing and assigning themes.
- Typed frontend hooks.
- Theme selector in form builder settings.
- Theme styling on public form pages.
- Public `/templates` page that lists only `published + public` forms.
- Seed script for demo user, themes, forms, fields, submissions, and analytics events.

Priority 5 does not include:

- Conditional logic.
- Payments.
- Admin dashboard.
- Full theme editor UI.
- Private custom theme creation UI.

## Implementation Order

## 1. DB

### Add Themes Table

Create:

- `packages/database/models/theme.ts`

Table: `themes`

Columns:

- `id`: UUID primary key, default random.
- `name`: varchar, required.
- `category`: varchar, required.
- `tokens`: JSON, required.
- `isPublic`: boolean, default `true`.
- `createdBy`: nullable UUID referencing `users.id`.
- `createdAt`: timestamp, default now.
- `updatedAt`: timestamp, `$onUpdate`.

Theme token shape should stay small and practical:

```ts
{
  background: string;
  card: string;
  text: string;
  mutedText: string;
  accent: string;
  accentText: string;
  border: string;
}
```

### Export Schema

Update:

- `packages/database/schema.ts`

Add:

```ts
export * from "./models/theme";
```

### Form Theme Link

Existing column:

- `forms.themeId`

Preferred implementation:

- Add FK reference from `forms.themeId` to `themes.id` if migration generation stays clean.

Fallback implementation:

- Keep `forms.themeId` as nullable UUID and enforce theme existence/ownership in service.

Reason for fallback: this is hackathon-speed work, and `themeId` already exists in the DB plan.

### Migration

Run:

```bash
pnpm db:generate
```

Then user/agent applies migration later with:

```bash
pnpm db:migrate
```

## 2. Service

### Add Theme Service Model

Create:

- `packages/services/theme/model.ts`

Schemas:

- `themeTokensSchema`
- `listThemesInputSchema`
- `getThemeInputSchema`
- `assignThemeInputSchema`

Types:

- `ThemeTokensSchemaType`
- `ListThemesInputSchemaType`
- `GetThemeInputSchemaType`
- `AssignThemeInputSchemaType`

### Add Theme Service

Create:

- `packages/services/theme/index.ts`

Methods:

```ts
listThemes()
getTheme({ themeId })
assignTheme({ formId, userId, themeId })
```

Rules:

- `listThemes()` returns public themes and, if needed later, user-owned themes.
- `getTheme({ themeId })` returns one theme or throws if missing.
- `assignTheme({ formId, userId, themeId })` must verify the form belongs to `userId`.
- `assignTheme` must verify the theme exists.
- `assignTheme` allows assignment only when theme is public or created by the same user.
- `assignTheme` updates `forms.themeId`.

### Update Form Service

Update:

- `packages/services/form/index.ts`

Include optional theme data in:

- `getFormById`
- `getFormByOwner`
- `getPublicFormBySlug`
- `listPublicForms`

Returned theme shape:

```ts
theme: {
  id: string;
  name: string;
  category: string;
  tokens: ThemeTokens;
} | null
```

Important behavior:

- Public slug form should include theme tokens so `/f/[slug]` can style itself.
- `/templates` should receive theme info for each card.
- Unlisted forms should not be returned by `listPublicForms`.

## 3. tRPC Procedure

### Register Service

Update:

- `packages/trpc/server/services/index.ts`

Add:

```ts
import ThemeService from "@repo/services/theme";

export const themeService = new ThemeService();
```

### Update Form Router Schemas

Update:

- `packages/trpc/server/routes/form/model.ts`

Add theme schemas:

- `themeTokensOutputSchema`
- `themeOutputSchema`
- `listThemesInputSchema`
- `listThemesOutputSchema`
- `assignThemeInputSchema`
- `assignThemeOutputSchema`

Update existing form output schemas to include:

```ts
theme: themeOutputSchema.nullable().optional()
```

### Add Procedures

Update:

- `packages/trpc/server/routes/form/route.ts`

Add procedures under existing `formRouter` for speed and consistency:

```ts
listThemes: publicProcedure
assignTheme: protectedProcedure
```

Procedure behavior:

- `listThemes` returns available public themes.
- `assignTheme` calls `themeService.assignTheme({ ...input, userId: ctx.user.id })`.

OpenAPI metadata:

- Add `GET /form/listThemes`.
- Add `POST /form/assignTheme` protected.

## 4. Hooks

Update:

- `apps/web/hooks/api/form/index.ts`

Add:

```ts
useThemes()
useAssignTheme()
```

`useThemes()` returns:

- `themes`
- `themesError`
- `themesIsLoading`
- `themesIsFetching`

`useAssignTheme()` returns:

- `assignThemeAsync`
- `assignTheme`
- `assignThemeError`
- `assignThemeIsPending`

Invalidate after theme assignment:

- `form.getFormForOwner`
- `form.getPublicFormBySlug`
- `form.listPublicForms`
- `form.listForms` if form cards display theme later.

## 5. UI

## Builder Theme Selector

Update:

- `apps/web/app/dashboard/forms/[id]/page.tsx`

Add a theme selector inside builder settings.

Recommended simple UI:

- Section title: `Theme`
- Dropdown or compact theme cards.
- Show current selected theme.
- Include color swatches for `background`, `card`, and `accent`.
- Save immediately on selection using `assignTheme`.

Acceptance:

- Creator can assign a theme to their form.
- Selector shows loading and disabled state while saving.
- Builder refetches after save.

## Public Form Theme Styling

Update:

- `apps/web/app/f/[slug]/page.tsx`

Apply theme tokens to visible page styles.

Minimal practical styling:

- Page background uses `theme.tokens.background`.
- Card background uses `theme.tokens.card`.
- Main text uses `theme.tokens.text`.
- Muted text uses `theme.tokens.mutedText` where easy.
- Primary submit/accent buttons use `theme.tokens.accent` and `theme.tokens.accentText`.
- Card border uses `theme.tokens.border`.

Keep existing UI components. Prefer inline `style` values or CSS variables on the page wrapper for speed.

Acceptance:

- Public form visibly changes when a different theme is assigned.
- Public form still works without a theme.

## Templates Page

Create:

- `apps/web/app/templates/page.tsx`

Use:

- `usePublicForms()`

Behavior:

- Show only forms returned by `listPublicForms`.
- Backend should already filter to `published + public`.
- Each card links to `/f/[slug]`.
- Show theme colors on cards.
- Include empty state if no public templates exist.
- Include loading and error states.

Recommended page copy:

- Title: `Templates`
- Subtitle: `Start from polished public forms built with NewForm.`
- Card CTA: `Open form`

Acceptance:

- Published public forms appear.
- Published unlisted forms do not appear.
- Draft forms do not appear.
- Cards link to correct public slug URLs.

## 6. Seed Data

## Scripts

Update root:

- `package.json`

Add:

```json
"db:seed": "dotenv -- pnpm --filter @repo/database db:seed"
```

Update database package:

- `packages/database/package.json`

Add:

```json
"db:seed": "dotenv -- tsx seed.ts"
```

Create:

- `packages/database/seed.ts`

## Seed Content

Seed user:

- Email: `demo@example.com`
- Password: `password123`
- Full name: `Demo Creator`

Password hashing must match existing `UserService` logic:

- Generate salt with `randomBytes(16).toString("hex")`.
- Hash with `createHmac("sha256", salt).update(password).digest("hex")`.

Seed themes:

- `Aurora Studio`
- `Midnight Arcade`
- `Paper Garden`

Seed forms:

- Public published: `Anime Convention Feedback`
- Public published: `Startup Product-Market Fit Survey`
- Public published: `Gaming Tournament Registration`
- Unlisted published: `Private Beta Feedback`
- Draft: `Internal Team Retro`

Seed fields:

- Include a mix of text, email, number, select, multi-select, checkbox, rating, and date.
- Keep fields realistic for each form.

Seed submissions:

- At least 20 submissions per main public form.
- Store values using current `form_submissions.values` shape.
- Include `respondentEmail`, `metadata`, and `submittedAt`.

Seed analytics events:

- Add `response_events` for submissions.
- Add extra view events so completion rate is meaningful.

Idempotency strategy:

- Before seeding, delete only known seeded forms by slug and known seeded themes by name.
- Keep existing user-created data untouched.
- Reuse existing demo user if `demo@example.com` already exists.

Known seeded slugs:

- `anime-convention-feedback`
- `startup-product-market-fit-survey`
- `gaming-tournament-registration`
- `private-beta-feedback`
- `internal-team-retro`

## 7. Plan Update

After implementation and verification, update:

- `docs/plan.md`

Mark Priority 5 as completed and add completed files plus verification results.

## Verification Checklist

Run verification in this order.

### DB Verification

Generate migration:

```bash
pnpm db:generate
```

Apply migration:

```bash
pnpm db:migrate
```

Seed demo data:

```bash
pnpm db:seed
```

Expected result:

- Migration creates `themes` table.
- Seed creates/reuses `demo@example.com`.
- Seed creates 3 themes.
- Seed creates 5 known demo forms.
- Seed creates fields, submissions, and response events.
- Running `pnpm db:seed` twice should not duplicate seeded demo forms.

### Type And Build Verification

Run:

```bash
pnpm check-types
```

Expected result:

- TypeScript passes.

Run:

```bash
pnpm build
```

Expected result:

- API and web build pass.

Known lint note:

- `pnpm lint` may still be blocked by pre-existing ESLint v9 config/warning issues unrelated to Priority 5.

### Manual UI Verification

Start app:

```bash
pnpm dev
```

Login:

- Email: `demo@example.com`
- Password: `password123`

Check dashboard:

- Open `/dashboard/forms`.
- Confirm seeded forms are visible.
- Confirm published/unlisted/draft statuses look correct.

Check theme selector:

- Open one seeded form builder: `/dashboard/forms/[id]`.
- Change theme in the settings area.
- Confirm selection saves without error.
- Refresh page and confirm selected theme remains.

Check public form theme:

- Open the form public link: `/f/[slug]`.
- Confirm background/card/accent colors match the selected theme.
- Submit a response and confirm thank-you state still works.

Check templates page:

- Open `/templates`.
- Confirm the 3 public published demo forms appear.
- Confirm `Private Beta Feedback` does not appear because it is unlisted.
- Confirm `Internal Team Retro` does not appear because it is draft.
- Click a template card and confirm it opens `/f/[slug]`.

Check analytics seed:

- Open a seeded form builder.
- Confirm analytics cards show non-zero responses.
- Open responses page.
- Confirm seeded responses are listed.
- Export CSV and confirm a file downloads.

### Security Verification

Owner access:

- Create or log in as another user.
- Try to access a demo form builder URL from the other user account.
- Expected: access is rejected.

Templates visibility:

- Confirm `/templates` only shows forms with `status = published` and `visibility = public`.
- Confirm unlisted form works only by direct `/f/[slug]` link.

Theme assignment:

- Confirm a user cannot assign a private theme owned by another user if private themes are added later.

## Completion Criteria

Priority 5 is complete when:

- `themes` table exists and is exported.
- Theme service exists and enforces form ownership.
- tRPC procedures exist with typed inputs/outputs.
- Hooks exist and invalidate relevant queries.
- Builder can assign a theme.
- Public form visibly applies the assigned theme.
- `/templates` lists only public published forms.
- Seed script creates a judge-friendly demo dataset.
- `pnpm db:seed`, `pnpm check-types`, and `pnpm build` pass.
