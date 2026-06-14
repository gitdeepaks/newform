# Schema Redesign And Dynamic Zod Compiler Plan

This document is the implementation plan for the first two trust-layer milestones from `docs/prod_level_features.md`:

- Day 1-2: Schema Redesign
- Day 3-4: Dynamic Zod Compiler

The database is still disposable, so prefer a clean production-ready design over compatibility with existing local data or migrations.

## Current State

The current submission engine stores answers primarily in `form_submissions.values` as JSON. Public submission validation is implemented imperatively in `packages/services/form-submission/answer-validation.ts` and validates mutable `form_fields` rows instead of immutable published snapshots.

Key files that will change:

- `packages/database/models/form-submission.ts`
- `packages/database/models/response-event.ts`
- `packages/database/schema.ts`
- `packages/database/seed.ts`
- `packages/services/form/index.ts`
- `packages/services/form-submission/index.ts`
- `packages/services/form-submission/answer-validation.ts`
- `packages/services/form-submission/csv.ts`
- `packages/services/form-submission/conditional-visibility.ts`
- `packages/services/admin/index.ts`

New files to add:

- `packages/database/models/form-version.ts`
- `packages/database/models/response-answer.ts`
- `packages/services/form-submission/response-schema.ts`

## Target Guarantees

- Published forms create immutable `form_versions` snapshots.
- Public rendering and submission use the active `form_versions.schema_snapshot`.
- Submissions always reference `form_version_id`.
- Answers are stored in `response_answers`, not primarily in `form_submissions.values`.
- Hidden conditional fields are removed before validation and storage.
- Runtime validation is compiled from the version snapshot with Zod.
- Validation errors are stable and field-specific.

## Phase 1: Schema Redesign

### 1. Define Shared Snapshot Types

Add explicit TypeScript types near the database models or in a small shared service module.

Recommended shape:

```ts
export type FormVersionFieldSnapshot = {
  id: string;
  label: string;
  labelKey: string;
  description: string | null;
  placeholder: string | null;
  type: string;
  isRequired: boolean | null;
  pageIndex: number;
  index: string | number;
  options: FormFieldOption[] | null;
  validation: FormFieldValidation | null;
  visibilityCondition: FormFieldVisibilityCondition | null;
};

export type FormVersionSchemaSnapshot = {
  form: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    thankYouTitle: string | null;
    thankYouMessage: string | null;
  };
  fields: FormVersionFieldSnapshot[];
  createdAt: string;
};
```

Keep the snapshot intentionally close to what public rendering and submission validation need. Do not include mutable database-only fields unless they are required to reproduce the published form.

### 2. Add `form_versions`

Create `packages/database/models/form-version.ts`.

Columns:

- `id uuid primary key defaultRandom()`
- `form_id uuid references forms.id not null`
- `version_number integer not null`
- `status varchar(20) not null default "active"`
- `schema_snapshot jsonb/json typed as FormVersionSchemaSnapshot not null`
- `published_at timestamp defaultNow()`
- `created_by uuid references users.id`
- `created_at timestamp defaultNow()`

Constraints and indexes:

- Unique `(form_id, version_number)`.
- Index `(form_id, status)`.
- Optional partial unique active version per form if Drizzle migration support is convenient. Otherwise enforce active/superseded status in a transaction during publish.

Export it from `packages/database/schema.ts`.

### 3. Redesign `form_submissions`

Update `packages/database/models/form-submission.ts`.

Remove these as primary storage:

- `formFieldId`
- `values`

Add/keep:

- `id uuid primary key defaultRandom()`
- `form_id uuid references forms.id not null`
- `form_version_id uuid references form_versions.id not null`
- `respondent_email varchar(255)`
- `status varchar(20) not null default "completed"`
- `submitted_at timestamp defaultNow()`
- `metadata json/jsonb typed as FormSubmissionMetadata | null`
- `raw_payload json/jsonb` optional debug snapshot only
- `created_at timestamp defaultNow()`
- `updated_at timestamp on update`

Indexes:

- `(form_id, submitted_at)`
- `(form_version_id)`
- `(status)`
- Optional `(respondent_email)`

Update the exported types. Remove `FormSubmissionValueRow` as the persisted shape; if input still uses `{ formFieldId, value }[]`, keep that type in the service/model layer instead of the database model.

### 4. Add `response_answers`

Create `packages/database/models/response-answer.ts`.

Columns:

- `id uuid primary key defaultRandom()`
- `submission_id uuid references form_submissions.id not null`
- `form_id uuid references forms.id not null`
- `form_version_id uuid references form_versions.id not null`
- `field_id uuid not null`
- `field_key varchar(100) not null`
- `field_label_snapshot varchar/text not null`
- `field_type varchar(30) not null`
- `raw_value json/jsonb`
- `normalized_text text`
- `normalized_number numeric/double precision`
- `normalized_date timestamp/date`
- `option_values json/jsonb typed as string[] | null`
- `created_at timestamp defaultNow()`

Indexes:

- `(submission_id)`
- `(form_id, field_id)`
- `(form_id, created_at)`
- `(form_version_id, field_id)`

Do not reference `form_fields.id` from `response_answers.field_id`. Historical answers should remain valid even if a draft field is later deleted. Store the snapshot label/key/type on each answer row.

Export it from `packages/database/schema.ts`.

### 5. Update `response_events`

Update `packages/database/models/response-event.ts` to include `form_version_id`.

Recommended columns:

- Existing `id`, `form_id`, `submission_id`, `type`, `metadata`, `created_at`
- New `form_version_id uuid references form_versions.id`

For `view` events, `submission_id` can remain nullable. For `submit` events, write `submission_id` and `form_version_id`.

### 6. Reset Migrations

Because the project allows disposable development data, reset the migration set instead of preserving compatibility.

Steps:

1. Confirm the current Drizzle migration workflow in `package.json` and database config.
2. Remove old generated migrations only if they are development-only.
3. Generate a fresh migration from the new schema.
4. Apply it to a clean local database.
5. Verify the generated SQL has the expected tables, foreign keys, unique constraints, and indexes.

### 7. Update Publishing To Create Versions

Find the publish/update status flow in `packages/services/form/index.ts`.

When a form is published or republished:

1. Load the form and all fields ordered by `pageIndex`, then `index`.
2. Build a `FormVersionSchemaSnapshot` from those rows.
3. In one transaction:
   - Mark current active versions for the form as `superseded`.
   - Compute the next `version_number`.
   - Insert the new active `form_versions` row.
   - Update `forms.status = "published"` and `forms.published_at`.

Do not mutate old `form_versions.schema_snapshot` rows.

### 8. Update Public Form Loading

Public form rendering should use the active version snapshot, not live `form_fields`.

Steps:

1. Load `forms` by slug.
2. Join or separately fetch active `form_versions` by `form_id` and `status = "active"`.
3. Return fields from `schema_snapshot.fields`.
4. Continue returning form-level data such as expiry and response limit from `forms` because those are operational controls.

If the app has a creator draft builder, keep it using live `form_fields`. Only public published render/submission must use the immutable snapshot.

### 9. Update Seed Data

Update `packages/database/seed.ts` so demo data matches the new model.

Seed sequence:

1. Create users.
2. Create forms.
3. Create draft fields.
4. Create active `form_versions` snapshots for published demo forms.
5. Create `form_submissions` with `form_version_id`.
6. Create matching `response_answers` rows.
7. Create `response_events` with `form_version_id`.

Acceptance check: no seeded response should depend on `form_submissions.values`.

### 10. Update Read Paths For Responses, Analytics, CSV, Admin

Replace reads from `formSubmissionsTable.values` with joins to `responseAnswersTable`.

Affected areas:

- Creator response list in `packages/services/form-submission/index.ts`.
- CSV export in `packages/services/form-submission/csv.ts` and callers.
- Field analytics and option counts.
- Admin response details/counts in `packages/services/admin/index.ts`.

Implementation approach:

1. Query submissions as parent rows.
2. Query answers for those submission IDs.
3. Group answers by `submission_id` in service code.
4. Format answers from `raw_value`, `normalized_*`, and `option_values`.

This keeps the API response shape stable for the UI while changing the storage layer underneath.

## Phase 2: Dynamic Zod Compiler

### 1. Add `response-schema.ts`

Create `packages/services/form-submission/response-schema.ts`.

Exports:

- `buildResponseSchema(fields)`
- `buildFieldSchema(field)`
- `formatValidationErrors(error)`
- Optionally `normalizeAnswerValue(field, value)` if normalization is not kept in the submission service.

Input fields should use the snapshot field type, not live database rows.

### 2. Define Validation Input Shape

The public submit input currently arrives as an array like:

```ts
{ formFieldId: string; value: string }[]
```

For validation, convert it to an object keyed by stable field id:

```ts
{
  [fieldId]: value
}
```

This makes Zod object validation and field-level error formatting simpler. Keep the external API shape unchanged unless the frontend is changed in the same PR.

### 3. Compile The Response Object Schema

`buildResponseSchema(fields)` should:

1. Create one Zod schema per visible field with `buildFieldSchema(field)`.
2. Use `z.object(shape).strict()` or explicitly reject unknown IDs before parsing.
3. Make optional fields optional or allow empty values depending on field type.
4. Apply required validation after conditional visibility filtering, not before.

Recommended behavior:

- Required scalar fields reject missing values and empty strings.
- Optional scalar fields allow `undefined`, `null`, or empty string and normalize later.
- Required multi-value fields reject empty arrays.
- Optional multi-value fields allow missing/empty arrays.

### 4. Implement Field Schemas

Support every current field type.

`SHORT_TEXT` and `LONG_TEXT`:

- Input: string.
- Required: non-empty trimmed string.
- Optional: allow empty string.
- Validation: `minLength`, `maxLength`.

`EMAIL`:

- Input: string.
- Required: non-empty and valid email.
- Optional: empty allowed, non-empty must be valid email.

`NUMBER`:

- Input from API may be string.
- Use `z.coerce.number()` for non-empty values.
- Reject non-numeric values.
- Apply `validation.min` and `validation.max`.
- Optional empty value should not coerce to `0`.

`SINGLE_SELECT`:

- Input: string.
- Must be one of `field.options[].value` when non-empty.
- Required rejects empty/missing.

`MULTI_SELECT`:

- Input may be JSON string today; support parsing into `string[]`.
- Must be an array of option values.
- Required rejects empty array.
- Reject any value not in `field.options[].value`.

`CHECKBOX`:

- If options exist, treat as multi-value `string[]` and validate option values.
- If no options exist, treat as boolean-like checkbox and accept only `true`/`false` or boolean if the client sends boolean later.
- Required no-options checkbox should require checked `true` if product semantics are agreement/consent.

`RATING`:

- Input from API may be string.
- Coerce to number only for non-empty values.
- Must be an integer from `1` to `validation.ratingMax ?? 5`.
- Required rejects missing/empty.

`DATE`:

- Input: ISO-like date string.
- Reject invalid date strings.
- Apply `validation.dateMin` and `validation.dateMax` using string comparison only if the app stores `YYYY-MM-DD`; otherwise parse dates consistently.
- Required rejects missing/empty.

### 5. Stable Error Formatting

`formatValidationErrors(error)` should return errors that the public UI can map to fields.

Recommended shape:

```ts
export type FieldValidationError = {
  fieldId: string;
  fieldKey: string;
  message: string;
};
```

Implementation notes:

- Use the Zod issue path as `fieldId`.
- Look up `fieldKey` from the visible snapshot field map.
- Return deterministic messages such as `Required`, `Invalid email address`, `Invalid option value`, `Number is too small`.
- Avoid exposing generic Zod internals to the client.

### 6. Replace Imperative Validation In Submission Flow

Update `packages/services/form-submission/index.ts`.

New public submission sequence:

1. Parse API input.
2. Reject honeypot.
3. Rate limit.
4. Load form by slug.
5. Load active `form_versions` row.
6. Read fields from `schema_snapshot.fields`.
7. Convert submitted array to `answerByFieldId`.
8. Reject submitted field IDs that are not in the version snapshot.
9. Resolve conditional visibility using snapshot fields.
10. Drop answers for hidden fields.
11. Compile schema with `buildResponseSchema(visibleFields)`.
12. Validate visible answers.
13. Format and throw field-level validation errors on failure.
14. Derive respondent email from the first visible email field, or a configured email field if added later.
15. Normalize answers for storage.
16. In one transaction:
    - Lock the form row for response-limit enforcement.
    - Re-check status, expiry, and response limit.
    - Insert `form_submissions` with `form_version_id` and optional `raw_payload`.
    - Insert `response_answers` rows.
    - Insert `response_events` submit event with `form_version_id`.
    - Insert email events if still needed.

The old `validateAnswer` function can be removed once all callers use `response-schema.ts`. Keep `parseStringArray` only if CSV/export still needs it; otherwise move parsing into `response-schema.ts`.

### 7. Normalize Answers For Storage

Add a small mapping step after validation and before insert.

For each visible submitted answer, create a `response_answers` row:

- `field_id`: snapshot field id
- `field_key`: snapshot `labelKey`
- `field_label_snapshot`: snapshot `label`
- `field_type`: snapshot `type`
- `raw_value`: validated value or original submitted value
- `normalized_text`: text/email/single-select/date display value where useful
- `normalized_number`: number/rating values
- `normalized_date`: date value when valid
- `option_values`: multi-select/checkbox-group selected option values

Skip optional empty answers unless product wants explicit blank rows. Prefer skipping blanks to keep analytics simpler, but ensure CSV can still render empty cells by comparing fields against answer rows.

### 8. Conditional Visibility Order

Visibility must be resolved before required validation.

Keep `packages/services/form-submission/conditional-visibility.ts`, but update its `PublicField` type to use snapshot fields. It should evaluate against the raw submitted answers map before hidden answers are dropped.

Rules:

- Unknown submitted field IDs are rejected before visibility filtering.
- Hidden field answers are ignored and not stored.
- Hidden required fields do not block submission.
- A visible field whose visibility depends on a hidden or missing source should follow the existing conditional logic semantics.

### 9. Tests To Add With This Work

Add unit tests for `response-schema.ts` first, then service tests for public submission.

Minimum compiler tests:

- Required short text fails when missing.
- Optional short text passes when missing.
- Invalid email fails.
- Number min/max works.
- Single-select rejects unknown option.
- Multi-select rejects unknown option.
- Checkbox group rejects unknown option.
- Rating rejects values outside range.
- Date min/max works.
- `formatValidationErrors` returns field id and field key.

Minimum pipeline tests:

- Submission uses active form version.
- Unknown field id is rejected.
- Hidden required field does not block submission.
- Hidden submitted answer is not stored.
- Valid submission creates one `form_submissions` row and matching `response_answers` rows.
- Response limit still rejects extra submissions transactionally.

## Suggested Implementation Order

1. Add `form_versions` and `response_answers` database models.
2. Redesign `form_submissions` and update `response_events`.
3. Export new models from `packages/database/schema.ts`.
4. Reset/generate migrations and apply to a clean database.
5. Update publish flow to create active immutable versions.
6. Update seed data to create versions, submissions, answers, and events.
7. Add `response-schema.ts` with unit tests.
8. Update conditional visibility to work with snapshot fields.
9. Refactor public submission to load active version and validate with compiled Zod schema.
10. Insert `response_answers` transactionally with `form_submissions`.
11. Update response list, analytics, CSV export, and admin reads to use `response_answers`.
12. Run typecheck, tests, seed, and a manual public submission smoke test.

## Acceptance Checklist

- `form_versions` exists and stores immutable published snapshots.
- Publishing creates a new active version and supersedes the previous one.
- Public form rendering uses the active version snapshot.
- `form_submissions` requires `form_version_id` and no longer uses `values` as primary answer storage.
- `response_answers` stores one row per visible answered field.
- Public submission validates against the active version snapshot.
- Hidden answers are removed before validation and storage.
- Field-level validation errors include stable field id/key data.
- CSV/export/analytics/admin response reads no longer depend on `form_submissions.values`.
- Seed data runs cleanly with the new schema.
- Tests cover every field type and core submission pipeline behavior.

## Verification Commands

Use the actual package scripts from this repo, but the expected verification set is:

```bash
bun run typecheck
bun run test
bun run db:generate
bun run db:migrate
bun run db:seed
```

If script names differ, check the root `package.json` and package-level `package.json` files before running them.
