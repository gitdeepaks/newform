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
- Landing page exists at `/`.
- Pricing page exists at `/pricing`.
- Templates page exists at `/templates` and consumes public published forms.
- Themes and seeded demo data exist.
- Theme switching and sidebar logout exist.
- Creator can create forms.
- Creator can list forms.
- Creator can add/edit/delete basic fields.
- Legacy public form ID route at `/form/[form_id]` redirects to `/f/[slug]` when the form is published and never renders fields directly.
- Public slug form page exists at `/f/[slug]`.
- Public form submission uses the secure slug path.
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
- CSV export for responses is implemented in Priority 4.

Important gaps:

- README polish, deployment, and final Scalar docs verification remain.
- Optional bonus features remain after final verification. QR code sharing is completed as a UI-only builder feature using existing public slug URLs. Admin panel foundation is completed.

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
- Admin dashboard is completed as a bonus feature.
- Skip real payment.
- Skip real email provider; store/log email events only.
- Implement QR/password only after core is stable. CSV export is already completed.

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
- [x] Redirect `/form/[form_id]` to the slug route without exposing fields.

Acceptance:

- [x] Published public form opens by slug.
- [x] Published unlisted form opens by slug.
- [x] Draft/unpublished form cannot be opened through public slug lookup.
- [x] Invalid slug has graceful error state.
- [x] Explore/templates UI consumes `listPublicForms` so unlisted forms stay hidden from public listings.

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

## Priority 4: Responses And Analytics - Completed

Target: hours 24-32.

### DB

Use:

- `form_submissions` for responses.
- `response_events` for views/submissions.

### Service

Add:

- [x] `listResponses({ formId, userId, page, pageSize })`.
- [ ] `getResponse({ responseId, userId })` optional.
- [x] `getFormAnalytics({ formId, userId })`.
- [x] `exportResponsesCsv({ formId, userId })`.

Analytics should calculate:

- [x] total views.
- [x] total submissions.
- [x] completion rate.
- [x] submissions by day.
- [x] select/rating breakdown.

### tRPC Procedure

Add protected procedures:

- [x] `listResponses`.
- [x] `getFormAnalytics`.
- [x] `exportResponsesCsv`.

### Hook

Add:

- [x] `useResponses(formId)`.
- [x] `useFormAnalytics(formId)`.
- [x] `useExportResponsesCsv(formId)`.

### UI

Improve submissions page:

- [x] Rename visible copy to `Responses`.
- [x] Add pagination.
- [ ] Add response detail drawer/card if time allows.

Add analytics UI:

- [x] Cards on form builder/detail page.
- [ ] Chart using existing `recharts` components if time allows.
- [x] Empty state for forms with no data.

Acceptance:

- [x] Creator can see responses.
- [x] Creator can see analytics.
- [x] Creator cannot see another creator's responses.
- [x] Creator can export responses as CSV.

Completed files:

- `packages/services/form-submission/model.ts`
- `packages/services/form-submission/index.ts`
- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`
- `apps/web/hooks/api/form/index.ts`
- `apps/web/app/dashboard/forms/[id]/page.tsx`
- `apps/web/app/dashboard/forms/[id]/submissions/page.tsx`
- `apps/web/app/f/[slug]/page.tsx`

Verification completed:

- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.

## Priority 5: Themes, Templates, Seed Data - Completed

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
- `/templates` page showing only `published + public` forms.

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
- Public forms appear on templates.
- Unlisted forms do not appear publicly.
- Themes are visually visible on public form pages.

Completed files:

- `packages/database/models/theme.ts`
- `packages/database/schema.ts`
- `packages/database/index.ts`
- `packages/database/drizzle/20260525182447_cooing_korg/migration.sql`
- `packages/database/seed.ts`
- `packages/database/package.json`
- `package.json`
- `packages/services/theme/model.ts`
- `packages/services/theme/index.ts`
- `packages/services/form/index.ts`
- `packages/trpc/server/services/index.ts`
- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`
- `apps/web/hooks/api/form/index.ts`
- `apps/web/app/dashboard/forms/[id]/page.tsx`
- `apps/web/app/f/[slug]/page.tsx`
- `apps/web/app/templates/page.tsx`

Verification results:

- `pnpm db:generate` passed and generated the `themes` migration.
- `pnpm db:migrate` passed and applied migrations.
- `pnpm db:seed` passed twice, verifying idempotent reseeding of known demo data.
- `pnpm check-types` passed.
- `pnpm build` passed.

## Priority 6: Landing, Pricing, Docs, README, Deployment - Partially Completed

Target: hours 40-47.

### Landing And Pricing

Flow: UI only unless fetching public forms for templates.

Update:

- [x] `/` landing page with product pitch, CTAs, demo credentials, templates link, docs link.
- [x] `/pricing` with Free, Pro, Team cards.
- [x] `/templates` with seeded public forms.
- [x] Dashboard/sidebar polish, theme switcher, and logout navigation.

Completed files:

- `apps/web/app/page.tsx`
- `apps/web/app/pricing/page.tsx`
- `apps/web/app/templates/page.tsx`
- `apps/web/components/public-header.tsx`
- `apps/web/components/theme-switcher.tsx`
- `apps/web/components/app-sidebar.tsx`
- `apps/web/components/nav-main.tsx`
- `apps/web/components/nav-user.tsx`
- `apps/web/components/site-header.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/providers/global.tsx`
- `apps/web/app/layout.tsx`

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

1. CSV export for responses - Completed in Priority 4.
2. Form preview before publishing - Completed.
3. QR code sharing - Completed. UI-only flow using existing `/f/[slug]` public URLs.
4. Form expiry/response limit UI - Completed. Backend fields and submission checks already existed; builder settings and public closed states were added.
5. Clone form - Completed. Creators can duplicate owned forms into new draft forms with fields/theme copied and responses excluded.
6. Password-protected forms.
7. Conditional logic.
8. Multi-page form experience.
9. Admin dashboard.

Completed files for form preview:

- `apps/web/app/dashboard/forms/[id]/page.tsx`

Verification completed for form preview:

- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.

Completed files for QR code sharing:

- `apps/web/custom/components/forms/form-builder-page.tsx`
- `apps/web/package.json`
- `pnpm-lock.yaml`

Verification completed for QR code sharing:

- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.

Completed files for form expiry/response limit UI:

- `packages/services/form/index.ts`
- `apps/web/custom/components/forms/form-builder-page.tsx`
- `apps/web/custom/components/public-form/public-form-page.tsx`

Verification completed for form expiry/response limit UI:

- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.

Completed files for clone form:

- `packages/services/form/model.ts`
- `packages/services/form/index.ts`
- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`
- `apps/web/hooks/api/form/index.ts`
- `apps/web/custom/components/forms/forms-page.tsx`

Verification completed for clone form:

- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.

## Bonus: Admin Panel - Completed

Implemented admin panel foundation:

- [x] Role-based admin access with backend `adminProcedure` enforcement.
- [x] Suspended users are blocked from protected procedures.
- [x] Seeded admin account: `admin@example.com` / `password123`.
- [x] Admin dashboard metrics.
- [x] User management for role and status changes.
- [x] Form moderation for force-unpublish, archive, and restore.
- [x] Submission metadata list without answer values.
- [x] Audit logs for admin mutations.
- [x] Admin sidebar link only appears for admin users.
- [x] Admin mutations and audit logs are atomic via database transactions.
- [x] Admin one-click destructive actions replaced with confirmation dialogs.
- [x] Admin list pages include practical filters, empty states, and pagination controls.
- [x] Admin service non-null assertions removed.

Verification completed for admin panel:

- [x] `pnpm db:generate` passed.
- [x] `pnpm db:migrate` passed.
- [x] `pnpm db:seed` passed twice.
- [x] `pnpm check-types` passed.
- [x] `pnpm build` passed.
- [x] Admin hardening verification: `pnpm check-types`, `pnpm build`, and `git diff --check` passed.

## Final Feature Checklist

Core required:

- Auth and protected creator dashboard.
- Create/edit/publish/unpublish/manage forms.
- Dynamic fields with required/optional settings.
- Zod validation for builder and response submission.
- Field types: text, email, number, select, checkbox, rating, date.
- Public and unlisted visibility modes.
- Public forms visible in templates.
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

- Open `/` and confirm primary links work.
- Open `/pricing` and confirm links work.
- Open `/templates` and confirm only public published forms show.
- Login with `demo@example.com` / `password123`.
- Open dashboard and see seeded forms.
- Confirm sidebar logout works.
- Open a form builder.
- Publish/unpublish a form.
- Copy public slug link.
- Submit public form while logged out.
- See new response in dashboard.
- See analytics update.
- Export responses CSV from a form.
- Confirm public form appears in `/templates`.
- Confirm unlisted form does not appear in `/templates` but works by direct link.
- Confirm `/form/[form_id]` does not expose draft/unpublished form fields.
- Test OAuth only when the provider is configured.
- Open Scalar docs.
