# Typeform-Style Form Builder SaaS Plan

## Current Repo Baseline

- Monorepo uses `pnpm`, Turborepo, Next.js web app, Express API app, tRPC, Drizzle, Zod, and Scalar/OpenAPI.
- Apps:
  - `apps/web`: Next.js frontend.
  - `apps/api`: Express backend with `/trpc`, `/api`, `/openapi.json`, and `/docs`.
- Packages:
  - `packages/database`: Drizzle PostgreSQL database layer.
  - `packages/trpc`: shared tRPC router and client types.
  - `packages/services`: business logic layer.
  - `packages/logger`, `packages/eslint-config`, `packages/typescript-config`.
- Existing code has a user table, health router, auth route shell, signup UI, signup backend flow, and Scalar docs plumbing.

## Important Constraint

- Signup page and backend signup flow are already implemented.
- Do not rebuild signup unless bugs are found during verification.
- Auth work should continue from the existing signup implementation.

## Product Goal

Build a production-style Typeform-like SaaS where creators can create, publish, share, and analyze dynamic forms, while public respondents can submit forms without logging in.

## Core Tech Requirements

- Turborepo for monorepo orchestration.
- Separate frontend and backend apps.
- tRPC for type-safe APIs.
- Zod for form schema and response validation.
- Drizzle ORM with PostgreSQL.
- Scalar API documentation.
- Shared packages for schemas, services, database, and typed clients.

## Phase 1: Foundation And Project Cleanup

### Goals

- Rename product branding from starter names to the final SaaS name.
- Confirm app/package dependency flow.
- Add required env documentation.
- Establish consistent folders for forms, responses, themes, analytics, and auth.

### Tasks

1. Choose product name.
2. Update API title and landing copy.
3. Add `.env.example` files where needed.
4. Document local ports:
   - Web: `http://localhost:3000`
   - API: `http://localhost:8000`
   - Docs: `http://localhost:8000/docs`
5. Confirm root scripts:
   - `pnpm dev`
   - `pnpm build`
   - `pnpm lint`
   - `pnpm check-types`
   - `pnpm db:generate`
   - `pnpm db:migrate`
6. Add seed script entrypoint.

### Acceptance Criteria

- Existing app still boots.
- Existing signup flow still works.
- API docs route still works.
- README has correct local setup basics.

## Phase 2: Database Schema Design

### Goals

Create a scalable schema for creators, sessions, forms, fields, themes, responses, analytics, email events, and API keys.

### Tables

1. `users`
   - Keep existing creator identity table.
   - Add optional fields only if required.

2. `sessions`
   - `id`
   - `userId`
   - `tokenHash`
   - `expiresAt`
   - `createdAt`

3. `forms`
   - `id`
   - `ownerId`
   - `title`
   - `description`
   - `slug`
   - `status`: `draft`, `published`, `archived`
   - `visibility`: `public`, `unlisted`
   - `themeId`
   - `thankYouTitle`
   - `thankYouMessage`
   - `passwordHash`
   - `expiresAt`
   - `responseLimit`
   - `publishedAt`
   - `createdAt`
   - `updatedAt`

4. `form_fields`
   - `id`
   - `formId`
   - `order`
   - `type`: `short_text`, `long_text`, `email`, `number`, `single_select`, `multi_select`, `checkbox`, `rating`, `date`
   - `label`
   - `description`
   - `placeholder`
   - `required`
   - `options`
   - `validation`
   - `settings`
   - `createdAt`
   - `updatedAt`

5. `themes`
   - `id`
   - `ownerId`
   - `name`
   - `category`: `movie`, `anime`, `game`, `startup`, `tech`, `os`, `event`, `community`
   - `tokens`
   - `isPublic`
   - `createdAt`

6. `form_responses`
   - `id`
   - `formId`
   - `respondentEmail`
   - `answers`
   - `metadata`
   - `submittedAt`

7. `response_events`
   - `id`
   - `formId`
   - `responseId`
   - `type`: `view`, `start`, `submit`
   - `metadata`
   - `createdAt`

8. `email_events`
   - `id`
   - `formId`
   - `responseId`
   - `recipient`
   - `type`: `creator_notification`, `respondent_confirmation`
   - `status`: `queued`, `sent`, `failed`, `skipped`
   - `error`
   - `createdAt`

9. `api_keys`
   - `id`
   - `userId`
   - `name`
   - `keyHash`
   - `lastUsedAt`
   - `createdAt`
   - `revokedAt`

### Acceptance Criteria

- Drizzle schema exists for all core tables.
- Migration generates successfully.
- Database relations are clear.
- Seed data can reference all tables.

## Phase 3: Shared Zod Schemas

### Goals

Make dynamic forms safe and typeable using Zod.

### Schemas

1. Field schemas:
   - Base field schema.
   - Per-field settings schema.
   - Field validation schema.
   - Option schema for select fields.

2. Form schemas:
   - Create form input.
   - Update form input.
   - Publish form input.
   - Theme assignment input.
   - Field reorder input.

3. Response schemas:
   - Public submit input.
   - Dynamic answer validation from stored form fields.
   - Response filter input.
   - Pagination input.

4. Analytics schemas:
   - Date range input.
   - Form analytics output.
   - Field breakdown output.

### Acceptance Criteria

- All public inputs are validated with Zod.
- Dynamic response validation checks required fields and field type constraints.
- Shared schemas live in `packages/trpc` or a dedicated shared package if needed.

## Phase 4: Complete Authentication

### Existing

- Signup UI exists.
- Signup backend flow exists.

### Remaining Backend Tasks

1. Verify existing signup flow and reuse it.
2. Implement login mutation.
3. Implement logout mutation.
4. Implement session persistence.
5. Add `protectedProcedure` in tRPC context.
6. Add current user endpoint.
7. Read user session from cookie or auth header.

### Remaining Frontend Tasks

1. Login page.
2. Auth state provider or server-side auth helper.
3. Protected dashboard redirects.
4. User menu and logout.
5. Demo credential shortcut.

### Acceptance Criteria

- Existing signup keeps working.
- Creator can log in after signup.
- Creator session persists.
- Dashboard routes require auth.
- Public form routes do not require auth.

## Phase 5: Creator Dashboard

### Goals

Build the main SaaS dashboard for creators.

### Pages

1. `/dashboard`
   - Form list.
   - Stats summary.
   - Create form CTA.

2. `/dashboard/forms/new`
   - Create form flow.

3. `/dashboard/forms/[formId]`
   - Form overview.
   - Publish status.
   - Share link.
   - Response count.
   - Conversion metrics.

4. `/dashboard/forms/[formId]/builder`
   - Dynamic field builder.
   - Field reorder.
   - Field settings.
   - Validation config.
   - Theme selector.
   - Preview panel.

5. `/dashboard/forms/[formId]/responses`
   - Response table.
   - Response detail drawer.
   - Filtering.
   - Pagination.
   - CSV export.

6. `/dashboard/forms/[formId]/analytics`
   - Views.
   - Starts.
   - Submissions.
   - Completion rate.
   - Field-level summaries.

7. `/dashboard/themes`
   - Theme gallery.
   - Preview cards.

### Acceptance Criteria

- Creator can manage forms end-to-end.
- Builder supports required field types.
- UI is responsive and usable.

## Phase 6: Form Builder

### Goals

Allow creators to build dynamic forms without code.

### Field Types

Required:

- Short text.
- Long text.
- Email.
- Number.
- Single select.
- Multi select.

Encouraged:

- Checkbox.
- Dropdown.
- Rating.
- Date.

### Builder Features

1. Add field.
2. Edit field label.
3. Edit description.
4. Edit placeholder.
5. Toggle required.
6. Configure options.
7. Configure min/max length.
8. Configure number min/max.
9. Configure rating scale.
10. Reorder fields.
11. Delete field.
12. Preview before publishing.

### Acceptance Criteria

- Saved form schema can generate a public form.
- Invalid builder inputs are blocked.
- Creator can publish only forms with at least one valid field.

## Phase 7: Public Form Filling

### Goals

Public respondents can fill published forms without logging in.

### Routes

1. `/f/[slug]`
   - Public form page.

2. `/f/[slug]/thank-you`
   - Confirmation screen.

### Backend Tasks

1. Public form lookup.
2. Public response submission.
3. Dynamic Zod validation.
4. Rate limiting by IP and form.
5. Basic spam protection.
6. Response limit check.
7. Expiry check.
8. Password check if enabled.

### Frontend Tasks

1. Render dynamic form fields.
2. Theme public form page.
3. Handle loading, error, expired, closed, and not found states.
4. Submit response.
5. Show thank-you screen.

### Acceptance Criteria

- Public users can submit without auth.
- Draft/unpublished forms are inaccessible.
- Invalid answers return useful errors.
- Submission flow ends in a confirmation screen.

## Phase 8: Publishing And Sharing

### Goals

Creators can publish, unpublish, and share forms.

### Features

1. Publish/unpublish toggle.
2. Public/unlisted visibility.
3. Custom slug.
4. Copy share link.
5. QR code sharing.
6. Optional password protection.
7. Optional expiry date.
8. Optional response limit.

### Acceptance Criteria

- Published forms are accessible by link.
- Unlisted forms are not shown in public discovery but work by URL.
- Slug conflicts are handled.
- Share UI is demo-friendly.

## Phase 9: Themes And Templates

### Goals

Make the product visually memorable and hackathon-demo friendly.

### Seeded Theme Categories

1. Movie theme.
2. Anime theme.
3. Game theme.
4. Startup theme.
5. Tech company theme.
6. Operating system theme.
7. Event/community theme.

### Theme Tokens

- Background.
- Foreground.
- Card color.
- Accent color.
- Font style.
- Border radius.
- Button style.
- Progress style.

### Template Forms

Seed at least 3:

1. Anime convention feedback form.
2. Startup product-market fit survey.
3. Gaming tournament registration form.

### Acceptance Criteria

- Public forms visually change based on theme.
- Templates can be cloned into user forms.
- Seed data includes themes, forms, responses, and analytics.

## Phase 10: Responses And Analytics

### Goals

Creators need useful insights.

### Response Management

1. Response list.
2. Response detail.
3. Search/filter by date and answer.
4. Pagination.
5. CSV export.
6. Delete response if needed.

### Analytics

1. Total views.
2. Total starts.
3. Total submissions.
4. Completion rate.
5. Submission trend chart.
6. Field answer distribution.
7. Average rating.
8. Select option breakdown.

### Acceptance Criteria

- Analytics page renders seeded and real data.
- Charts use existing `recharts`.
- Response table handles many responses with pagination.

## Phase 11: Email Notification Flow

### Goals

Add production-style email behavior without requiring a paid provider.

### Email Types

1. Creator notification after new response.
2. Respondent confirmation if respondent email exists.

### Implementation

1. Create email service abstraction.
2. In development, log email content.
3. In production, allow provider env config later.
4. Store email events in database.
5. Do not block form submission if email fails.

### Acceptance Criteria

- Submission creates email event records.
- Creator notification can be inspected in logs or DB.
- Failure does not break response submission.

## Phase 12: API Documentation With Scalar

### Goals

Expose documented HTTP-compatible API endpoints.

### Public API Endpoints

1. Health check.
2. Get public form by slug.
3. Submit public response.
4. Creator form list.
5. Creator form detail.
6. Creator response list.
7. Analytics endpoint.

### Tasks

1. Add OpenAPI metadata to tRPC procedures.
2. Ensure `trpc-to-openapi` supports selected procedures.
3. Keep `/openapi.json` working.
4. Keep `/docs` Scalar UI working.
5. Link API docs in README and landing page.

### Acceptance Criteria

- `/docs` loads Scalar.
- OpenAPI JSON includes real endpoints.
- README includes API docs URL.

## Phase 13: Landing, Pricing, And Marketing Pages

### Goals

Make the app feel like a real SaaS.

### Pages

1. `/`
   - Hero.
   - Product preview.
   - Use cases.
   - Theme showcase.
   - CTA to signup/demo.

2. `/pricing`
   - Free.
   - Pro.
   - Team.
   - Note: real payments not required.

3. `/templates`
   - Theme/template gallery.

4. `/docs`
   - Link or redirect to API docs.

### Acceptance Criteria

- Pages are responsive.
- Landing communicates product clearly.
- Pricing page is polished but does not need payment.

## Phase 14: Seed Data And Demo Credentials

### Goals

Judges should review quickly without setup friction.

### Seed Content

1. Demo creator:
   - Email: `demo@example.com`
   - Password: `password123`

2. Sample forms:
   - Anime convention feedback.
   - Startup product-market fit survey.
   - Gaming tournament registration.

3. Sample themes:
   - Anime neon.
   - Retro arcade.
   - Startup minimal.
   - Movie premiere.
   - OS terminal.

4. Sample responses:
   - At least 20 responses per form.
   - Include realistic answer data.
   - Include view/start/submit events.

### Acceptance Criteria

- `pnpm db:seed` populates demo data.
- README includes demo credentials.
- Dashboard immediately shows analytics.

## Phase 15: Rate Limiting And Spam Protection

### Goals

Protect public submission APIs.

### Features

1. IP-based submit rate limit.
2. Form-level rate limit.
3. Honeypot field.
4. Optional minimum time-to-submit check.
5. Request metadata capture.
6. Friendly error response.

### Acceptance Criteria

- Repeated rapid submissions are blocked.
- Legitimate submissions still work.
- Rate limit applies only to public submission endpoints.

## Phase 16: Bonus Features

### Priority Bonus List

1. Form preview before publishing.
2. CSV export.
3. Custom form slugs.
4. QR code sharing.
5. Form expiry.
6. Response limit.
7. Theme gallery.
8. Response filtering and pagination.
9. Form clone/archive.
10. Password-protected forms.
11. Conditional logic.
12. Multi-page form experience.
13. Admin dashboard.

### Recommended Bonus Order

1. Preview.
2. CSV export.
3. Custom slug.
4. QR code.
5. Expiry/response limit.
6. Clone/archive.
7. Password protection.
8. Conditional logic.

## Phase 17: Deployment

### Goals

Make demo judge-friendly.

### Recommended Deployment

- Web: Vercel.
- API: Render, Railway, Fly.io, or similar.
- Database: Neon, Supabase Postgres, Railway Postgres, or Render Postgres.

### Tasks

1. Configure production env vars.
2. Run migrations on production DB.
3. Run seed script on production DB.
4. Set CORS for deployed frontend.
5. Verify API docs URL.
6. Verify demo login.
7. Verify public form link.
8. Add deployed links to README.

### Acceptance Criteria

- Public deployed app works.
- Demo credentials work.
- API docs are accessible.
- Public form submission works.

## Phase 18: README And Final Submission

### README Must Include

1. Project overview.
2. Tech stack.
3. Monorepo structure.
4. Local setup.
5. Environment variables.
6. Database setup.
7. Scripts.
8. Demo credentials.
9. API docs link.
10. Deployment link.
11. Seed data description.
12. Feature checklist.
13. Known limitations.

### Final Submission Must Include

1. Public GitHub repository.
2. Deployed frontend link.
3. Deployed API docs link.
4. Demo credentials.
5. Proper README.

## Suggested Build Order

1. Database schema and migrations.
2. Shared Zod schemas.
3. Complete auth from existing signup flow.
4. Form CRUD.
5. Field builder APIs.
6. Dashboard form list.
7. Builder UI.
8. Publish/unpublish.
9. Public form rendering.
10. Public response submission.
11. Response list.
12. Analytics.
13. Themes.
14. Seed data.
15. Email flow.
16. Rate limiting.
17. Scalar API docs polish.
18. Landing and pricing pages.
19. README.
20. Deployment verification.

## Definition Of Done

- Existing signup flow remains working.
- Creator can log in and log out.
- Creator can create, edit, publish, unpublish, and manage forms.
- Forms support dynamic field schemas and validation.
- Public users can submit forms without logging in.
- Creator can view responses and analytics.
- API docs are available through Scalar.
- Seed data includes at least 3 themed forms with responses and analytics.
- Landing page, pricing page, README, demo credentials, and deployment links exist.
- App passes typecheck, lint, and build.
