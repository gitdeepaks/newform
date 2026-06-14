# Newform Trust-First Production Plan

Newform already has a strong Typeform-style SaaS foundation: Turborepo monorepo, Next.js web app, Express/tRPC API, Drizzle/PostgreSQL, JWT cookie authentication, OAuth support, public form submission, multi-page forms, conditional logic, themes, analytics, CSV export, QR sharing, seeded demo data, and an admin panel.

The next phase should not be high-end SaaS features first. The next phase should make the app trustworthy.

Trust means creators can publish a form, collect responses, export data, review analytics, and depend on the result without worrying that schema edits, hidden fields, invalid answers, rate-limit gaps, or storage shortcuts corrupted the data.

Important planning assumption: the current database is still in development. We do not need to preserve existing data, migrations, or schema compatibility. Prefer clean production-ready schema design over incremental compatibility work. It is acceptable to reset migrations, rename tables/columns, replace JSON answer storage with normalized tables, and seed fresh demo data.

## Product Principle

Do not build "next-level SaaS" features until the form engine is trustworthy.

The right order is:

1. Make the core form system correct.
2. Make submissions safe and queryable.
3. Make validation schema-driven and test-covered.
4. Make public abuse protection deployment-safe.
5. Make builder ordering reliable.
6. Then add teams, billing, integrations, templates, and premium analytics.

## Trust Layer Definition

Newform becomes trustworthy when these guarantees are true:

- Published form schemas are immutable through `form_versions`.
- Public submissions validate against the active published version, not mutable draft fields.
- Hidden conditional fields are filtered before required validation and before storage.
- Invalid answers return field-level validation errors.
- Response answers are stored in normalized, queryable rows.
- `form_submissions.values` is not the primary answer source.
- Response limits are enforced transactionally.
- Rate limiting works across multiple API instances and serverless cold starts.
- Admin routes are fully visible in Scalar/OpenAPI docs.
- Field/page ordering is persisted through backend mutations, not only UI state.
- Tests cover required fields, optional fields, hidden fields, invalid types, invalid options, and boundary validations.

## Current Strengths To Preserve

- Clear monorepo separation across `apps/api`, `apps/web`, and shared packages.
- Typed API surface through tRPC with Zod input/output schemas.
- Service layer keeps business logic outside route handlers.
- Form builder supports 9 field types, validation settings, pages, themes, preview, publish controls, slug sharing, cloning, QR sharing, expiry, and response limits.
- Public submission pipeline already includes honeypot protection, rate limiting, server-side validation, hidden-field filtering, and transaction safety around response limits.
- Creator analytics already include response totals, views, completion rate, daily submissions, field summaries, pagination, and CSV export.
- Admin panel covers user moderation, form moderation, audit logs, and protected admin procedures.
- Seeded demo data and documented credentials make the product easy to evaluate.

## Current Trust Gaps

- Response validation is imperative in `packages/services/form-submission/answer-validation.ts`; there is no dynamic runtime Zod compiler per form version.
- Admin tRPC routes in `packages/trpc/server/routes/admin/route.ts` lack `.meta({ openapi })`, so admin endpoints are missing from Scalar.
- Field ordering is table/action based in `apps/web/custom/components/forms/builder/form-fields-card.tsx`; there is no drag-and-drop reorder with persisted backend order.
- Rate limiting is process-local memory in `packages/services/form-submission/rate-limit.ts`, so it will not work reliably across production instances.
- Responses are stored as JSON rows in `form_submissions.values`; this should be replaced with normalized answer storage while the database is still disposable.
- There is no immutable form schema snapshot/version table, so historical responses can become ambiguous after fields are edited.
- Tests do not yet fully lock down the public submission engine.

## Best Database Direction

Do not keep `form_submissions.values` as the primary answer source.

At most, keep a raw payload/debug snapshot if it is useful for support or audit. The production source of truth should be `form_submissions` plus `response_answers`.

### `form_versions`

Purpose: immutable published schema snapshots.

Recommended columns:

- `id`
- `form_id`
- `version_number`
- `status` such as `active`, `superseded`, `archived`
- `schema_snapshot jsonb`
- `published_at`
- `created_by`
- `created_at`

Rules:

- Create a new version whenever a form is published or republished.
- Public form rendering should use the active published version.
- Public submission validation should use the active published version.
- Historical submissions should always point to the version they used.

### `form_submissions`

Purpose: one row per respondent submission.

Recommended columns:

- `id`
- `form_id`
- `form_version_id`
- `respondent_email`
- `status` such as `completed`, `spam`, `deleted`, `partial` if save/resume is added later
- `submitted_at`
- `metadata jsonb`
- `created_at`
- `updated_at`

Optional only if useful:

- `raw_payload jsonb` for debug/audit snapshot, not for primary analytics or response rendering.

Indexes:

- `(form_id, submitted_at)`
- `(form_version_id)`
- `(respondent_email)` where useful
- `(status)` where moderation/filtering is added

### `response_answers`

Purpose: normalized, queryable answers for filters, CSV, analytics, and search.

Recommended columns:

- `id`
- `submission_id`
- `form_id`
- `form_version_id`
- `field_id`
- `field_key`
- `field_label_snapshot`
- `field_type`
- `raw_value jsonb`
- `normalized_text`
- `normalized_number`
- `normalized_date`
- `option_values jsonb`
- `created_at`

Rules:

- Insert answer rows transactionally with the submission.
- Store field label/key/type snapshots so exports and historical views survive field edits.
- Use normalized columns for search, filters, sorting, and analytics.
- Use `option_values jsonb` for multi-select and checkbox groups.

Indexes:

- `(form_id, field_id)`
- `(form_id, created_at)`
- `(submission_id)`
- `(form_version_id, field_id)`
- Optional indexes on `normalized_text`, `normalized_number`, and `normalized_date` when filtering is implemented.

### `response_events`

Purpose: analytics event stream.

Recommended event types:

- `view`
- `start`
- `field_focus`
- `field_complete`
- `page_complete`
- `submit`
- `abandon`

Recommended metadata:

- `form_version_id`
- `slug`
- `anonymous_session_id`
- `ip_hash`
- `user_agent`
- `referrer`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `device_type`

## 10-Day Ruthless Trust Plan

### Day 1-2: Schema Redesign

Goal: replace early flexible storage with a production-ready submission model.

Tasks:

- Reset and consolidate development migrations.
- Add `form_versions`.
- Redesign `form_submissions` around `form_id`, `form_version_id`, `respondent_email`, `status`, `submitted_at`, and `metadata jsonb`.
- Add `response_answers` with raw and normalized answer columns.
- Keep or refine `response_events` for analytics tracking.
- Remove `form_submissions.values` as primary storage.
- Update Drizzle models and exported schema types.
- Update seed data to use the new schema.

Acceptance criteria:

- New schema supports immutable form versions.
- New submissions can be represented without JSON answer arrays.
- Seed script creates forms, versions, submissions, answers, and events cleanly.

### Day 3-4: Dynamic Zod Compiler

Goal: compile each published form version into a runtime validation schema.

Tasks:

- Create `packages/services/form-submission/response-schema.ts`.
- Implement `buildResponseSchema(fields)`.
- Implement `buildFieldSchema(field)`.
- Implement `formatValidationErrors(error)`.
- Support all current field types:
  - `SHORT_TEXT`
  - `LONG_TEXT`
  - `EMAIL`
  - `NUMBER`
  - `SINGLE_SELECT`
  - `MULTI_SELECT`
  - `CHECKBOX`
  - `RATING`
  - `DATE`
- Validate required fields only after conditional visibility has been resolved.
- Return field-level errors usable by the public form UI.

Acceptance criteria:

- Every field type has schema-generated validation.
- Invalid answers produce a stable field id/key and message.
- The old imperative validation path can be removed or reduced to small reusable parsing helpers.

### Day 5: Submission Pipeline Refactor

Goal: make public submissions versioned, validated, filtered, and transaction-safe.

Tasks:

- Load public form by slug.
- Load active `form_version` and its schema snapshot.
- Resolve visible fields from conditional logic.
- Reject unknown submitted field ids.
- Drop answers for hidden fields before validation and storage.
- Validate visible answers with the dynamic Zod schema.
- Derive respondent email from the visible email field if configured.
- Insert `form_submissions` inside a transaction.
- Insert `response_answers` rows inside the same transaction.
- Insert `response_events` submit event inside the same transaction.
- Keep response-limit checks transaction-safe.

Acceptance criteria:

- Public submissions always reference a form version.
- Hidden answers are not stored.
- Invalid visible answers are rejected before insert.
- Submission and answers are inserted atomically.
- Response limit enforcement still works under concurrency.

### Day 6: Tests

Goal: lock down the form engine before adding more product surface.

Test coverage:

- Required fields fail when missing.
- Optional fields pass when missing.
- Hidden required fields do not block submission.
- Unknown field ids are rejected.
- Invalid email is rejected.
- Invalid single-select option is rejected.
- Invalid multi-select value is rejected.
- Invalid checkbox option is rejected.
- Number min/max validation works.
- Rating min/max validation works.
- Date min/max validation works.
- Expired forms reject submissions.
- Response limit rejects extra submissions.
- Valid submission creates one submission row plus matching answer rows.

Acceptance criteria:

- Submission validation tests run in CI.
- Critical response pipeline behavior is protected from regressions.

### Day 7: Admin OpenAPI And Scalar Cleanup

Goal: make the API docs honest and complete.

Tasks:

- Add OpenAPI metadata to every admin procedure.
- Use `Admin` tag for all admin routes.
- Use consistent route names and HTTP methods.
- Confirm `/openapi.json` includes admin routes.
- Confirm `/docs` shows admin routes in Scalar.
- Check that protected/admin routes clearly indicate authentication.

Acceptance criteria:

- All admin procedures are visible in Scalar.
- API docs match the implemented API surface.

### Day 8: Redis/Upstash Rate Limiting

Goal: replace local memory protection with deployment-safe abuse protection.

Tasks:

- Replace process-local `Map` limiter with Redis or Upstash Redis.
- Use key shape based on `slug`, `ip`, and optionally user-agent hash.
- Add env config:
  - `SUBMISSION_RATE_LIMIT_WINDOW_MS`
  - `SUBMISSION_RATE_LIMIT_MAX_ATTEMPTS`
  - `RATE_LIMIT_REDIS_URL` or provider equivalent
- Add documented local Redis setup or minimal dev-only fallback.
- Return a clear rate-limit error that maps to `429` behavior.
- Log rate-limit hits for abuse visibility.

Acceptance criteria:

- Rate limits survive restarts.
- Rate limits work across multiple deployed instances.
- Local development behavior is documented.

### Day 9-10: Drag-And-Drop Reorder With Backend Persistence

Goal: make the builder feel credible and ensure order changes are durable.

Tasks:

- Add accessible drag-and-drop field cards.
- Support reorder within a page.
- Support moving fields across pages.
- Add keyboard reorder fallback.
- Add backend `reorderFields` mutation.
- Persist `pageIndex` and stable order transactionally.
- Replace `numeric("index", { scale: 2 })` with a cleaner integer or lexicographic ordering approach if useful during schema reset.

Acceptance criteria:

- Creators can reorder fields visually.
- Creators can move fields between pages.
- Reordering persists after refresh.
- Backend validates field ownership before reorder.

## P0 Implementation Checklist

- Reset development migrations.
- Add `form_versions`.
- Redesign `form_submissions`.
- Add `response_answers`.
- Keep `response_events` as analytics event stream.
- Update seed data.
- Implement dynamic Zod compiler.
- Refactor public submission pipeline.
- Insert normalized answers transactionally.
- Add submission validation tests.
- Add admin OpenAPI metadata.
- Replace in-memory rate limiting with Redis/Upstash.
- Add backend field reorder mutation.
- Add drag-and-drop reorder UI.

## What To Defer Until Trust Layer Is Complete

These features are valuable, but should not happen before the trust layer is done:

- Billing and plan limits.
- Workspaces and team roles.
- Native integrations.
- Webhooks.
- API keys for customers.
- Template marketplace.
- Advanced branding.
- Save and resume.
- Scheduled exports.
- Advanced funnel dashboards.
- AI form generation.

## Next-Level SaaS Plan After Trust Layer

Once the trust layer is complete, move into product growth and monetization.

### Phase 2: Creator Experience

- Autosave for drafts.
- Field duplication.
- Reusable blocks.
- Better page management.
- Command palette.
- Improved preview and publish flow.

### Phase 3: Response Management

- Search responses using normalized answers.
- Filter by date, answer, status, source, and device.
- Sort by submitted date or selected answer fields.
- Saved response views.
- CSV export by filtered segment.

### Phase 4: Analytics

- Start rate.
- Completion rate.
- Drop-off by page.
- Drop-off by field.
- Median completion time.
- Source/UTM analytics.
- Device breakdown.

### Phase 5: SaaS Foundation

- Workspaces.
- Team roles.
- Invites.
- Billing.
- Plan limits.
- Account settings.
- Password reset.
- Email verification.

### Phase 6: Workflow Automation

- Webhooks.
- Google Sheets integration.
- Slack integration.
- Email notification settings.
- Scheduled reports.

## Success Metrics For Trust Layer

Engineering metrics:

- Submission pipeline test coverage exists for every field type.
- Public submission success rate is measurable.
- Public submission validation failures are structured and field-specific.
- Rate-limit hits are measurable.
- Admin routes are visible in Scalar.
- Response exports use normalized answers.

Product metrics:

- Published forms can collect responses without schema ambiguity.
- Creators can trust CSV exports after editing a form.
- Hidden fields do not create confusing stored answers.
- Analytics can be built from queryable data instead of JSON array scans.

Reliability metrics:

- P95 public submission latency.
- API error rate.
- Database transaction failure rate.
- Rate limiter availability.
- Response insert consistency between `form_submissions` and `response_answers`.

## Final Recommendation

Build trust first.

The immediate goal is not to make Newform look like a huge SaaS. The immediate goal is to make the core form engine correct enough that a huge SaaS can be built on top of it.

Execute the 10-day trust plan first: schema redesign, form versions, dynamic Zod validation, submission pipeline refactor, tests, admin docs, distributed rate limiting, and drag-and-drop persistence. After that, the product can safely move toward templates, analytics, workspaces, billing, integrations, and premium growth features.
