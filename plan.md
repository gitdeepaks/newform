# Remaining Build Plan: Typeform-Style Form Builder SaaS

Time left: `01d 23h 46m 31s`.

Mandatory implementation order for every feature:

`DB -> service -> tRPC Procedure -> hook -> UI`

This plan is based on the current codebase, not just the original requirements.

## Current Code Status

Implemented or partially implemented:

- Monorepo structure is correct: `apps/web`, `apps/api`, `packages/database`, `packages/services`, `packages/trpc`.
- API app already serves tRPC, OpenAPI JSON, and Scalar docs.
- Auth has signup, login, cookies, and `protectedProcedure`.
- Dashboard shell exists.
- Creator can create forms.
- Creator can list forms.
- Creator can add/edit/delete basic fields.
- Public form page exists at `/form/[form_id]`.
- Public slug form page exists at `/f/[slug]`.
- Public form submission exists by form id.
- Submissions table/service/tRPC/hook/UI exists in a basic form.
- Form lifecycle is implemented: `draft`/`published`, visibility, slug, publish/unpublish, owner form lookup, public slug lookup, and public forms listing API.
- Dashboard form list shows status, visibility, and copy share link.
- Builder page has settings for title, description, slug, visibility, thank-you copy, publish/unpublish, copy link, and open public page.
- Dynamic field types are implemented end-to-end: short text, long text, email, number, single select, multi select, checkbox, rating, and date.
- Field options and field validation config are stored in DB, validated in service, exposed through tRPC, and editable in builder UI.
- Public slug form renderer supports all current field types.
- Public slug submission is implemented with server-side validation, honeypot spam protection, IP + slug rate limiting, response event logging, and email event logging.
- Form submissions now store respondent email, request metadata, and submitted timestamp.
- Creator response reads now verify form ownership.

Important gaps:

- `listPublicForms` API exists, but public explore/templates UI is still missing.
- Analytics dashboard, themes, template/explore page, seeded data, landing, pricing, README polish are missing.

## Sprint Strategy

We should not try to implement every bonus. The fastest winning path is to make the complete core loop demo-ready:

1. Creator logs in.
2. Creator creates form.
3. Creator adds dynamic fields with validations.
4. Creator publishes as public or unlisted.
5. Creator copies slug link.
6. Respondent submits without login.
7. Creator sees responses and analytics.
8. Judges can use seeded demo data immediately.

Cut scope if needed:

- Skip conditional logic.
- Skip admin dashboard.
- Skip real payment.
- Skip real email provider; store/log email events only.
- Implement QR/password/CSV only after core is stable.

## Priority 0: Stabilize Foundation

Target: first 2 hours.

### Auth Protection

Flow: service -> tRPC Procedure -> hook -> UI.

- Add `logout` procedure if not present.
- Add `useLogout` hook.
- Add dashboard auth guard using `getLoggedInUserInfo`.
- Add demo credential text on login page.
- Confirm public form routes do not require auth.

Acceptance:

- Unauthenticated users cannot use dashboard pages.
- Demo login flow is obvious.
- Public form page still works without login.

## Priority 1: Form Lifecycle, Visibility, Slugs - Completed

Target: hours 2-8.

This is required before public forms can be correct.

### DB

Extend `forms`:

- [x] `slug` unique.
- [x] `status`: `draft`, `published`, `archived` planned. Current implementation supports string status and uses `draft`/`published`.
- [x] `visibility`: `public`, `unlisted`.
- [x] `publishedAt`.
- [x] `themeId` nullable.
- [x] `thankYouTitle`, `thankYouMessage`.
- [x] `expiresAt` nullable.
- [x] `responseLimit` nullable.

Use Drizzle enums for `status` and `visibility` if fast enough; otherwise `varchar` with Zod validation is acceptable for this deadline.

### Service

Add to `FormService`:

- [x] `getFormByOwner({ formId, userId })`.
- [x] `updateForm({ formId, userId, title, description, thankYouTitle, thankYouMessage })`.
- [x] `publishForm({ formId, userId })`.
- [x] `unpublishForm({ formId, userId })`.
- [x] `updateVisibility({ formId, userId, visibility })`.
- [x] `updateSlug({ formId, userId, slug })` with conflict handling.
- [x] `getPublicFormBySlug({ slug })` with status/expiry checks.
- [x] `listPublicForms()` for explore/templates.

Ownership is mandatory for all creator methods.

### tRPC Procedure

Add procedures:

- [x] `getFormForOwner` protected.
- [x] `updateForm` protected.
- [x] `publishForm` protected.
- [x] `unpublishForm` protected.
- [x] `updateVisibility` protected.
- [x] `updateSlug` protected.
- [x] `getPublicFormBySlug` public.
- [x] `listPublicForms` public.

OpenAPI metadata should be added for Scalar docs.

### Hook

Add hooks:

- [x] `useOwnerForm(formId)`.
- [x] `useUpdateForm()`.
- [x] `usePublishForm()`.
- [x] `useUnpublishForm()`.
- [x] `useUpdateVisibility()`.
- [x] `useUpdateSlug()`.
- [x] `usePublicForm(slug)`.
- [x] `usePublicForms()`.

### UI

Update dashboard form list:

- [x] Show status.
- [x] Show visibility.
- [x] Show share link if published.
- [x] Add open public form button in builder page.

Update builder page:

- [x] Add settings card for title, description, slug, visibility, thank-you text.
- [x] Add publish/unpublish buttons.
- [x] Disable publish when form has zero fields.
- [x] Copy share link using slug.

Add public route:

- [x] Prefer `/f/[slug]` for final share links.
- [x] Keep `/form/[form_id]` temporarily.

Acceptance:

- [x] Published public form opens by slug.
- [x] Published unlisted form opens by slug.
- [x] Draft/unpublished form cannot be opened through public slug lookup.
- [x] Invalid slug has graceful error state.
- [ ] Explore/templates UI still needs to consume `listPublicForms` so unlisted forms stay hidden from public listings.

Completed files:

- `packages/database/models/form.ts`
- `packages/database/drizzle/20260524190437_nostalgic_squirrel_girl/migration.sql`
- `packages/services/form/model.ts`
- `packages/services/form/index.ts`
- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`
- `apps/web/hooks/api/form/index.ts`
- `apps/web/app/dashboard/forms/page.tsx`
- `apps/web/app/dashboard/forms/[id]/page.tsx`
- `apps/web/app/f/[slug]/page.tsx`

Verification completed:

- [x] `pnpm check-types` passed.
- [x] `pnpm db:generate` passed.
- [x] `pnpm build` passed.
- [ ] `pnpm lint` is blocked by pre-existing ESLint config/warnings unrelated to this lifecycle work.

## Priority 2: Field Types, Options, Validations - Completed

Target: hours 8-16.

### DB

Extend `form_fields`:

- [x] Field string values:
  - [x] `SHORT_TEXT`
  - [x] `LONG_TEXT`
  - [x] `EMAIL`
  - [x] `NUMBER`
  - [x] `SINGLE_SELECT`
  - [x] `MULTI_SELECT`
  - [x] `CHECKBOX`
  - [x] `RATING`
  - [x] `DATE`
- [x] Add `options` JSON for select/multi-select/checkbox.
- [x] Add `validation` JSON for text min/max, number min/max, rating scale, date min/max.

Migration note:

- Existing `TEXT` can map to `SHORT_TEXT`.
- Existing `YES_NO` can map to `CHECKBOX` or keep compatibility only if needed for current local data.
- Since this is hackathon demo data, prefer clean enum values and reseed.

### Service

Update `FormFieldService`:

- [x] Validate field options based on type.
- [x] Validate field validation config based on type.
- [x] Verify field form belongs to current user before create/update/delete/get fields.
- [ ] Add `reorderFields({ formId, userId, orderedFieldIds })` only if time allows.

### tRPC Procedure

Update field schemas and procedures:

- [x] `createField` protected accepts `options` and `validation`.
- [x] `updateField` protected accepts `options` and `validation`.
- [x] `deleteField` protected verifies owner.
- [x] `getFields` protected verifies owner.

### Hook

Update existing hooks:

- [x] `useCreateField`.
- [x] `useUpdateField`.
- [x] `useDeleteField`.
- [x] `useFields`.

### UI

Update field dialog:

- [x] Use new field type list.
- [x] Render options editor for `SINGLE_SELECT`, `MULTI_SELECT`, `CHECKBOX`.
- [x] Render validation inputs:
  - [x] short/long text min/max length.
  - [x] number min/max.
  - [x] rating max.
  - [x] date min/max.
- [x] Public form renderer supports all field types.

Acceptance:

- [x] Required field types from the problem statement are supported.
- [x] Options and validation can be configured and saved.
- [x] Public page renders all supported fields.

Completed files:

- `packages/database/models/form-field.ts`
- `packages/database/drizzle/20260525163259_neat_legion/migration.sql`
- `packages/services/form-field/model.ts`
- `packages/services/form-field/index.ts`
- `packages/services/form/index.ts`
- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`
- `apps/web/hooks/api/form/index.ts`
- `apps/web/app/dashboard/forms/[id]/page.tsx`
- `apps/web/app/f/[slug]/page.tsx`
- `apps/web/app/form/[form_id]/page.tsx`

Verification completed:

- [x] `pnpm db:generate` passed.
- [x] `pnpm db:migrate` run by user.
- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.

## Priority 3: Public Submission Validation, Rate Limit, Email Events - Completed

Target: hours 16-24.

### DB

Improve response storage:

- [x] Current `form_submissions` kept and improved.
- [x] Add `respondentEmail` nullable.
- [x] Add `metadata` JSON.
- [x] Add `submittedAt`.
- [x] Add `email_events` table:
  - [x] `id`, `formId`, `submissionId`, `recipient`, `type`, `status`, `error`, `createdAt`.
- [x] Add `response_events` table for submit events and future analytics.

### Service

Update `FormSubmissionService`:

- [x] `submitPublicResponse({ slug, values, honeypot, metadata })`.
- [x] Load form by slug.
- [x] Reject draft/unpublished/archived.
- [x] Reject expired forms.
- [x] Reject response limit reached.
- [x] Validate every answer against stored field schema.
- [x] Required checks happen server-side, including empty multi-select/checkbox arrays.
- [x] Select answers must match configured options.
- [x] Insert submission.
- [x] Insert submit event.
- [x] Create email event rows for creator/respondent.
- [x] Verify owner before reading form submissions.

Add simple rate limiter:

- [x] In-memory map by `ip + slug`.
- [x] Limit: 5 submissions per 10 minutes.
- [x] Honeypot rejection.

### tRPC Procedure

Replace or add:

- [x] `submitPublicResponse` public.
- [x] Keep `submitForm` temporarily for old route compatibility.
- [x] Add OpenAPI metadata.
- [x] Add request metadata to tRPC context from Express request headers.

### Hook

Add:

- [x] `useSubmitPublicResponse()`.

### UI

Update `/f/[slug]`:

- [x] Load with `usePublicForm(slug)`.
- [x] Submit with `useSubmitPublicResponse()`.
- [x] Include hidden honeypot field.
- [x] Show closed/unavailable states.
- [x] Show custom thank-you state.

Acceptance:

- [x] Public users submit without login.
- [x] Server rejects invalid answers.
- [x] Rapid spam is blocked.
- [x] Email events are recorded without breaking submission.

Completed files:

- `packages/database/models/form-submission.ts`
- `packages/database/models/response-event.ts`
- `packages/database/models/email-event.ts`
- `packages/database/schema.ts`
- `packages/database/drizzle/20260525172050_mute_boom_boom/migration.sql`
- `packages/database/drizzle/20260525172050_mute_boom_boom/snapshot.json`
- `packages/services/form-submission/model.ts`
- `packages/services/form-submission/index.ts`
- `packages/trpc/server/context.ts`
- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`
- `apps/web/hooks/api/form/index.ts`
- `apps/web/app/f/[slug]/page.tsx`

Verification completed:

- [x] `pnpm db:migrate` run by user.
- [x] Valid `/f/[slug]` submission works.
- [x] Server-side invalid payload checks verified.
- [x] Required multi-select empty array check verified.
- [x] Honeypot rejection verified.
- [x] Rate limiting verified.
- [x] `form_submissions`, `response_events`, and `email_events` rows verified.
- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.

## Priority 4: Responses And Analytics

Target: hours 24-32.

### DB

Use:

- `form_submissions` for responses.
- `response_events` for views/submissions.

### Service

Add:

- `listResponses({ formId, userId, page, pageSize })`.
- `getResponse({ responseId, userId })` optional.
- `getFormAnalytics({ formId, userId })`.
- `exportResponsesCsv({ formId, userId })` optional if time remains.

Analytics should calculate:

- total views.
- total submissions.
- completion rate.
- submissions by day.
- select/rating breakdown.

### tRPC Procedure

Add protected procedures:

- `listResponses`.
- `getFormAnalytics`.
- `exportResponsesCsv` optional.

### Hook

Add:

- `useResponses(formId)`.
- `useFormAnalytics(formId)`.
- `useExportResponsesCsv(formId)` optional.

### UI

Improve submissions page:

- Rename visible copy to `Responses`.
- Add pagination if quick.
- Add response detail drawer/card if quick.

Add analytics UI:

- Cards on form builder/detail page.
- Chart using existing `recharts` components.
- Empty state for forms with no data.

Acceptance:

- Creator can see responses.
- Creator can see analytics.
- Creator cannot see another creator's responses.

## Priority 5: Themes, Explore, Seed Data

Target: hours 32-40.

### DB

Add `themes` table:

- `id`, `name`, `category`, `tokens`, `isPublic`, `createdBy`, `createdAt`.

Ensure `forms.themeId` exists.

### Service

Add `ThemeService`:

- `listThemes()`.
- `getTheme(themeId)`.
- `assignTheme({ formId, userId, themeId })`.

Add seed script:

- `pnpm db:seed` root script.
- Seed demo user.
- Seed themes.
- Seed forms.
- Seed fields.
- Seed submissions.
- Seed analytics events.

### tRPC Procedure

Add theme procedures:

- `listThemes` public or protected.
- `assignTheme` protected.

Ensure `listPublicForms` returns theme info.

### Hook

Add:

- `useThemes()`.
- `useAssignTheme()`.

### UI

Add:

- Theme selector in builder settings.
- Apply theme tokens on public form page.
- `/explore` or `/templates` page showing only `published + public` forms.

Seed content:

- Demo user: `demo@example.com` / `password123`.
- Anime convention feedback form.
- Startup product-market fit survey.
- Gaming tournament registration form.
- One unlisted published form.
- One draft/unpublished form.
- At least 20 responses per main sample form.

Acceptance:

- Seeded demo immediately looks populated.
- Public forms appear on explore/templates.
- Unlisted forms do not appear publicly.
- Themes are visually visible on public form pages.

## Priority 6: Landing, Pricing, Docs, README, Deployment

Target: hours 40-47.

### Landing And Pricing

Flow: UI only unless fetching public forms for templates.

Update:

- `/` landing page with product pitch, CTAs, demo credentials, explore/templates link, docs link.
- `/pricing` with Free, Pro, Team cards.
- `/templates` or `/explore` with seeded public forms.

### Scalar Docs

Flow: tRPC Procedure -> API docs.

Ensure OpenAPI metadata exists for:

- health.
- auth signup/login/current user/logout.
- form create/list/get/update/publish/unpublish.
- public form lookup.
- public response submit.
- responses list.
- analytics.

### README

Rewrite README for final product:

- Project overview.
- Tech stack.
- Monorepo structure.
- Setup commands.
- Environment variables.
- DB migrate/seed commands.
- Demo credentials.
- API docs URL.
- Deployment URL.
- Feature checklist.
- Known limitations.

### Deployment

Recommended:

- Web: Vercel.
- API: Render/Railway/Fly.
- DB: Neon/Supabase/Railway Postgres.

Verify:

- Demo login.
- Dashboard loads.
- Seed forms exist.
- Public slug submit works.
- Scalar docs load.

Acceptance:

- Final submission is judge-friendly.
- README has deployed links and demo credentials.

## Bonus Priority Only After Core Works

1. CSV export for responses.
2. Form preview before publishing.
3. QR code sharing.
4. Form expiry/response limit UI if DB already exists.
5. Password-protected forms.
6. Clone/archive form.
7. Conditional logic.
8. Multi-page form experience.
9. Admin dashboard.

## Final Feature Checklist

Core required:

- Auth and protected creator dashboard.
- Create/edit/publish/unpublish/manage forms.
- Dynamic fields with required/optional settings.
- Zod validation for builder and response submission.
- Field types: text, email, number, select, checkbox, rating, date.
- Public and unlisted visibility modes.
- Public forms visible in explore/templates.
- Unlisted forms accessible only by direct link.
- Public submission without login.
- Response management.
- Analytics dashboard/cards.
- Email event flow.
- Landing page.
- Pricing page.
- Scalar API documentation.
- Seeded demo data.
- Demo credentials.
- Rate limiting and honeypot for public submissions.
- Graceful states for invalid/unpublished/closed links.
- Responsive UI.
- README with setup, docs, deployment, credentials.

Pre-submit verification:

- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm lint`
- `pnpm check-types`
- `pnpm build`

Manual demo verification:

- Login with `demo@example.com` / `password123`.
- Open dashboard and see seeded forms.
- Open a form builder.
- Publish/unpublish a form.
- Copy public slug link.
- Submit public form while logged out.
- See new response in dashboard.
- See analytics update.
- Confirm public form appears in explore.
- Confirm unlisted form does not appear in explore but works by direct link.
- Open Scalar docs.
