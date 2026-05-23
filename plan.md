# 3-Day Build Plan: Typeform-Style Form Builder SaaS

## Current Project Status

This repo is already a Turborepo monorepo with separate frontend and backend apps.

- `apps/web`: Next.js App Router frontend.
- `apps/api`: Express API server with tRPC, OpenAPI JSON, and Scalar docs at `/docs`.
- `packages/trpc`: tRPC routers, Zod input/output schemas, typed client exports.
- `packages/services`: business logic for users, forms, and fields.
- `packages/database`: Drizzle PostgreSQL schema.

Already implemented or partially implemented:

- Email/password signup backend and UI.
- Email/password login backend and UI.
- Cookie-based `protectedProcedure` in tRPC.
- Creator dashboard shell using sidebar components.
- Protected form creation and form listing.
- Protected form field CRUD for basic field types.
- Scalar/OpenAPI plumbing exists in `apps/api/src/server.ts`.

Major missing pieces:

- Proper form lifecycle: draft, published, unpublished/archived.
- Public vs unlisted visibility.
- Public form rendering and public response submission.
- Response storage, response management, analytics.
- Full required field types: long text, single select, multi select, checkbox, rating, date.
- Field options and validation configuration.
- Themes, templates, seed data, demo credentials.
- Landing page, pricing page, explore/templates page.
- Rate limiting and spam protection for public submissions.
- Email notification flow.
- README updates and deployment checklist.

## Strategy

We have only 3 days, so the goal is a complete, judge-friendly MVP first, then polish and bonuses. Avoid overbuilding admin dashboards, conditional logic, complex multi-page forms, and real email/payment integrations unless all core requirements are done.

Priority order:

1. Core product loop: creator creates form, adds fields, publishes, shares link, respondent submits, creator sees responses and analytics.
2. Required compliance: Turborepo, tRPC, Zod, Drizzle, Scalar, auth, public/unlisted visibility, seed data, README.
3. Demo polish: landing, pricing, themes, templates, seeded analytics, demo credentials.
4. Bonus features only if time remains: CSV export, preview, custom slug, QR code, expiry/response limit.

## Day 1: Data Model, Auth Hardening, Form Builder Core

Goal: make the backend schema and creator-side form builder capable of supporting the full product.

### 1. Database Schema

Update `packages/database` with the production tables needed for the app.

Must add or extend:

- `forms`
  - `id`, `title`, `description`, `slug`, `createdBy`
  - `status`: `draft`, `published`, `archived`
  - `visibility`: `public`, `unlisted`
  - `themeId`, `thankYouTitle`, `thankYouMessage`
  - `publishedAt`, `expiresAt`, `responseLimit`
  - `createdAt`, `updatedAt`
- `form_fields`
  - replace/extend field enum to include `SHORT_TEXT`, `LONG_TEXT`, `EMAIL`, `NUMBER`, `SINGLE_SELECT`, `MULTI_SELECT`, `CHECKBOX`, `RATING`, `DATE`
  - add `options` JSON for select/multi-select/checkbox choices
  - add `validation` JSON for min/max length, min/max number, rating scale, date limits
  - keep `label`, `description`, `placeholder`, `isRequired`, `index`, `labelKey`
- `themes`
  - `id`, `name`, `category`, `tokens`, `isPublic`, `createdBy`, `createdAt`
- `form_responses`
  - `id`, `formId`, `respondentEmail`, `answers`, `metadata`, `submittedAt`
- `response_events`
  - `id`, `formId`, `responseId`, `type`, `metadata`, `createdAt`
- `email_events`
  - `id`, `formId`, `responseId`, `recipient`, `type`, `status`, `error`, `createdAt`

Acceptance:

- `pnpm db:generate` works.
- Existing auth and form creation still compile after schema changes.
- Schema supports all required requirements without another migration rewrite.

### 2. Shared Zod Schemas

Keep schemas close to the tRPC route models for speed, but make them reusable and strict.

Add schemas for:

- Create/update form.
- Publish/unpublish form.
- Update visibility.
- Update slug/settings.
- Create/update field with options and validation.
- Public form lookup.
- Public response submission.
- Response list pagination.
- Analytics date filters.

Important validation rules:

- Field type decides what options/validation are allowed.
- Required fields cannot be empty during submission.
- Select answers must match configured options.
- Email must be valid email.
- Number must respect min/max if configured.
- Rating must respect configured scale.

Acceptance:

- All tRPC procedures have Zod input/output schemas.
- Dynamic public response validation is done server-side before insert.

### 3. Auth And Route Protection

Current signup/login exists, so do not rebuild it. Harden what is already there.

Tasks:

- Add logout mutation if missing.
- Ensure dashboard pages redirect unauthenticated users to `/login`.
- Add a simple current-user check in dashboard layout or page shell.
- Add demo credential helper text on login page.
- Confirm public routes do not use `protectedProcedure`.

Acceptance:

- Creator can signup, login, refresh, and stay logged in.
- Creator-only APIs require auth.
- Public form APIs work without auth.

### 4. Creator Form APIs

Expand `packages/trpc/server/routes/form/route.ts` and services.

Required procedures:

- `createForm`
- `listForms`
- `getForm`
- `updateForm`
- `deleteOrArchiveForm`
- `publishForm`
- `unpublishForm`
- `updateVisibility`
- `updateSlug`
- `createField`
- `updateField`
- `deleteField`
- `reorderFields`

Ownership checks are mandatory:

- A creator can only read/update/delete/publish their own forms.
- Field APIs must verify the field belongs to a form owned by the logged-in user.

Acceptance:

- Creator can manage their own forms safely.
- Slug conflicts return a clear error.
- Form cannot publish with zero fields.

### 5. Builder UI

Improve existing `/dashboard/forms` and `/dashboard/forms/[id]` instead of creating too many new pages.

Tasks:

- Show form status, visibility, response count, and share link in form list.
- On builder page, add form settings panel:
  - title, description
  - status publish/unpublish
  - visibility public/unlisted
  - slug
  - thank-you text
  - theme selector placeholder if theme API is not ready yet
- Expand field dialog:
  - all required field types
  - options editor for select/multi-select/checkbox
  - validation fields for text/number/rating
- Add preview panel or preview button using the saved fields.

Acceptance:

- Creator can build a valid form with required field types.
- Creator can publish/unpublish and copy a share link.
- UI has loading/error states and works on mobile.

## Day 2: Public Forms, Responses, Analytics, Themes

Goal: finish the end-to-end product loop and make seeded demo data useful.

### 1. Public Form Flow

Add public frontend routes:

- `/f/[slug]`: public form fill page.
- `/f/[slug]/thank-you`: confirmation screen.

Add public backend procedures:

- `getPublicFormBySlug`
- `submitPublicResponse`
- `trackFormEvent` or automatic view/submit event creation

Visibility rules:

- `draft` or unpublished forms: show unavailable state and reject submissions.
- `published + public`: accessible by URL and visible on public listings.
- `published + unlisted`: accessible by URL but hidden from explore/templates.
- invalid slug: graceful not-found state.
- expired form or response limit reached: graceful closed state.

Submission rules:

- No login required.
- Validate all answers with Zod and stored field schema.
- Insert response and submit event in one backend flow.
- Redirect/show thank-you screen after success.

Acceptance:

- A public respondent can open a link, submit, and see confirmation.
- Invalid/unpublished forms do not accept responses.
- Unlisted forms work by direct link only.

### 2. Rate Limiting And Spam Protection

Implement a simple production-style approach without adding infrastructure unless necessary.

Tasks:

- Add in-memory IP + form slug rate limiter in `apps/api` or service layer.
- Limit public submissions, for example 5 submissions per IP per form per 10 minutes.
- Add honeypot field to public form UI and reject if filled.
- Capture metadata: IP, user agent, submittedAt.

Acceptance:

- Rapid repeated submissions are blocked with a friendly error.
- Logged-in creator APIs are not affected.

### 3. Responses Management

Add creator response APIs:

- `listResponses`
- `getResponse`
- `deleteResponse` optional
- `exportResponsesCsv` if time allows

Add UI:

- `/dashboard/forms/[id]/responses` or tabs inside `/dashboard/forms/[id]`.
- Response table with submitted date, respondent email, answer summary.
- Response detail drawer/card.
- Basic pagination.

Acceptance:

- Creator can view submitted public responses.
- Creator only sees responses for own forms.

### 4. Analytics

Add analytics service from `form_responses` and `response_events`.

Metrics:

- total views
- total submissions
- completion rate
- submissions over time
- field-level breakdown for select/multi-select/checkbox/rating

UI:

- Analytics cards on form detail.
- Reuse existing chart components if possible.
- Seeded data should make charts look populated.

Acceptance:

- Analytics page/card works for seeded and real responses.
- Empty states are handled for new forms.

### 5. Themes And Public Explore

Add minimal theme system that is demo-visible.

Tasks:

- Seed public themes with token JSON.
- Add theme selector to builder/settings.
- Apply theme tokens to `/f/[slug]` page.
- Add `/explore` or `/templates` page showing only `published + public` forms.
- Ensure unlisted forms never appear on explore/templates.

Seed theme examples:

- Anime neon.
- Retro arcade.
- Startup minimal.
- Movie premiere.
- OS terminal.

Acceptance:

- Public forms visually change by theme.
- Public forms appear in explore/templates.
- Unlisted forms are hidden from explore/templates.

## Day 3: Demo Polish, Emails, Docs, Seeds, Deployment

Goal: make the submission judge-friendly and complete all required packaging.

### 1. Seed Data And Demo Credentials

Add `pnpm db:seed` at root and package level.

Seed:

- Demo user:
  - email: `demo@example.com`
  - password: `password123`
- At least 3 themed published forms:
  - Anime convention feedback.
  - Startup product-market fit survey.
  - Gaming tournament registration.
- At least one unlisted published form to prove visibility behavior.
- At least one draft/unpublished form to prove blocked access.
- 20+ realistic responses per main sample form.
- View/start/submit events for analytics.
- Themes used by sample forms.

Acceptance:

- Fresh database plus seed gives a demo-ready product.
- Dashboard immediately shows forms, responses, and analytics.

### 2. Email Notification Flow

No real provider needed for MVP. Build an email abstraction and log/store events.

Tasks:

- Create email service in `packages/services`.
- On successful public submission:
  - create creator notification email event
  - create respondent confirmation email event if respondent email exists
- In dev, log email content.
- Do not fail submission if email event creation/logging fails.

Acceptance:

- Email events are stored.
- Submission is not blocked by email failures.

### 3. Landing, Pricing, Templates, Docs Links

Replace placeholder home page with a real SaaS landing page.

Pages:

- `/`: landing page with hero, product benefits, screenshots/cards, CTA, demo login, docs link.
- `/pricing`: Free, Pro, Team pricing cards with no payment integration.
- `/templates` or `/explore`: public forms/templates gallery.
- Optional `/docs`: redirect/link to API docs URL if frontend route is useful.

Acceptance:

- Product feels complete from the public homepage.
- Mobile layout is usable.
- API docs link is easy to find.

### 4. Scalar API Documentation

Ensure OpenAPI-compatible tRPC procedures have metadata.

Docs should include:

- health
- auth signup/login/current user
- creator form list/detail/create/update/publish
- public form lookup
- public response submission
- response list
- analytics

Acceptance:

- `http://localhost:8000/docs` loads Scalar.
- `http://localhost:8000/openapi.json` includes important endpoints.
- README includes docs URL.

### 5. README And Final Checklist

Rewrite `README.md` for the final product, not the starter repo.

Must include:

- Project overview.
- Tech stack.
- Monorepo structure.
- Local setup.
- Environment variables.
- Database setup and migrations.
- Seed command.
- Demo credentials.
- API docs URL.
- Deployment URL placeholders or final links.
- Feature checklist.
- Known limitations.

Acceptance:

- A judge can run and understand the project from README alone.

### 6. Deployment

Recommended deployment:

- Web: Vercel.
- API: Render/Railway/Fly.
- DB: Neon/Supabase/Railway Postgres.

Deployment tasks:

- Set production `DATABASE_URL`, JWT/auth secret, API base URL, frontend URL.
- Set CORS to deployed frontend.
- Run migrations.
- Run seed.
- Verify demo login.
- Verify public form submission.
- Verify Scalar docs.
- Add final deployed links to README.

Acceptance:

- Public deployed app works without local setup.
- Demo credentials work.
- API docs are accessible.
- Public form links work.

## Bonus Feature Priority If Time Remains

Do these only after core requirements are working.

1. CSV export for responses.
2. Form preview before publishing.
3. Custom slug polish with availability check.
4. QR code sharing.
5. Form expiry and response limit UI.
6. Form clone/archive.
7. Password-protected forms.
8. Conditional logic.
9. Multi-page form experience.
10. Admin dashboard.

## Final Definition Of Done

- Creator can signup/login/logout.
- Dashboard is protected.
- Creator can create, edit, publish, unpublish, and manage forms.
- Forms support dynamic fields with required/optional settings.
- Required field types are supported: short text, long text, email, number, single select, multi select.
- Extra field types are supported if possible: checkbox, rating, date.
- Form schemas and responses are validated with Zod.
- Public users can submit published forms without logging in.
- Public vs unlisted visibility works correctly.
- Unpublished, invalid, expired, and closed form links are handled gracefully.
- Creator can view responses and analytics.
- Rate limiting protects public submission APIs.
- Scalar API docs are available.
- Landing page, pricing page, explore/templates page exist.
- Seeded data includes at least 3 themed forms with responses and analytics.
- Demo credentials are documented.
- README is complete.
- `pnpm lint`, `pnpm check-types`, and `pnpm build` pass before final submission.
