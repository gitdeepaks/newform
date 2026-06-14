# Backend Refactor And Hardening Plan

Goal: improve backend maintainability and production readiness without changing product behavior.

Out of scope for this pass:

- Password hashing upgrade.
- JWT expiry/session model changes.
- Large-scale analytics SQL/materialization work.
- Redis/distributed rate limiting.

## Current Backend Concerns

### 1. Multi-page Migration Missing Snapshot

Current migration folder:

```txt
packages/database/drizzle/20260526143000_multi_page_forms/
```

Issue:

- It currently has `migration.sql` only.
- Existing generated migrations include `snapshot.json`.
- Deploying an incomplete migration folder can break or confuse Drizzle migration history.

Target:

- Regenerate or repair the migration using the repo's normal Drizzle flow.
- Ensure the migration folder includes the expected metadata files.
- Confirm the migration still adds:
  - `form_fields.page_index`
  - `form_fields.visibility_condition`
  - unique constraint on `form_id`, `page_index`, `index`

Verification:

- `pnpm db:generate` or equivalent migration command works cleanly.
- `pnpm db:migrate` works on a local database.
- `pnpm check-types` passes.

## Phase 1: Atomic Public Submission Writes

File:

```txt
packages/services/form-submission/index.ts
```

Current issue:

- `submitPublicResponse` inserts the submission first.
- Then it inserts the response event.
- Then it inserts email events.
- If a later insert fails, data can become inconsistent.

Desired behavior:

- Keep validation and rate-limit checks before persistence.
- Wrap persistence in `db.transaction`:
  - insert `form_submissions`
  - insert `response_events`
  - insert `email_events`
- Return the created submission ID only after all writes succeed.

Implementation notes:

- Avoid adding transaction abstractions unless necessary.
- Either make `createEmailEvents` accept a transaction client or inline the email event insert inside the transaction.
- Keep no `any`, no `as any`, no `as unknown as`.

Verification:

- Public submission still works.
- Response event is created for every successful submission.
- Email events are created when creator/respondent email exists.
- If event insertion fails, submission insert rolls back.
- `pnpm check-types` passes.

## Phase 2: Response Limit Race Hardening

File:

```txt
packages/services/form-submission/index.ts
```

Current issue:

- Response limit is checked with a count query before insert.
- Concurrent submissions can both pass the check and exceed the limit.

Preferred minimal fix:

- Move response limit check inside the same transaction used for submission persistence.
- Lock the form row before counting submissions.
- Re-check `status`, `expiresAt`, and `responseLimit` inside the transaction if practical.

Suggested SQL/Drizzle direction:

- Use a transaction.
- Select the target form row with a lock if Drizzle supports it in the current setup.
- If direct row lock is awkward, use a raw SQL lock statement inside the transaction for the form ID.

Acceptance criteria:

- Two concurrent submissions cannot exceed `responseLimit`.
- Error remains user-friendly: `This form has reached its response limit`.
- Existing form expiry and published-state checks still work.

## Phase 3: Split Large Service Files

Large files:

```txt
packages/services/form-submission/index.ts
packages/services/admin/index.ts
packages/services/form/index.ts
```

Problem:

- These files mix validation, formatting, visibility rules, analytics, CSV, moderation, and persistence.
- This makes future SaaS maintenance harder.

### 3.1 Split Form Submission Service Helpers

Recommended files:

```txt
packages/services/form-submission/answer-validation.ts
packages/services/form-submission/conditional-visibility.ts
packages/services/form-submission/csv.ts
packages/services/form-submission/analytics.ts
packages/services/form-submission/rate-limit.ts
```

Move:

- `validateAnswer` -> `answer-validation.ts`
- `isFieldVisibleForSubmission` -> `conditional-visibility.ts`
- `parseJsonArray`, `parseStringArray` if shared -> helper file or keep near consumers.
- `formatResponseValueForCsv`, `escapeCsvValue` -> `csv.ts`
- analytics field breakdown logic -> `analytics.ts`
- in-memory rate limit helper -> `rate-limit.ts`

Keep `index.ts` responsible for:

- Parsing inputs.
- Calling helper functions.
- Database orchestration.
- Returning service outputs.

### 3.2 Split Admin Service By Domain

Recommended files:

```txt
packages/services/admin/dashboard.ts
packages/services/admin/users.ts
packages/services/admin/forms.ts
packages/services/admin/submissions.ts
packages/services/admin/audit.ts
packages/services/admin/shared.ts
```

Move:

- dashboard metrics/list summaries -> `dashboard.ts`
- user listing/detail/role/status mutations -> `users.ts`
- form listing/detail/moderation -> `forms.ts`
- submissions listing -> `submissions.ts`
- transactional audit helper/shared select helpers -> `shared.ts` or `audit.ts`

Keep `index.ts` as a facade if tRPC imports `adminService` today.

Acceptance criteria:

- No behavior changes.
- Admin mutations remain transactional.
- Audit logs remain atomic with mutations.
- `adminService` public method names remain stable unless all call sites are updated.

### 3.3 Split Form Service If Needed

Recommended files:

```txt
packages/services/form/form-queries.ts
packages/services/form/form-lifecycle.ts
packages/services/form/form-clone.ts
packages/services/form/form-public.ts
packages/services/form/shared.ts
```

Move:

- clone logic -> `form-clone.ts`
- publish/unpublish/update lifecycle -> `form-lifecycle.ts`
- public slug/redirect/list public -> `form-public.ts`
- owner/public query builders -> `form-queries.ts`
- slug/theme helpers -> `shared.ts`

Keep changes minimal if time is short. Form service is less urgent than submission/admin service.

Verification after each split:

- `pnpm check-types`.
- `pnpm build` after all splits.
- Existing UI flows still compile.

## Phase 4: Format tRPC Admin Router

File:

```txt
packages/trpc/server/routes/admin/route.ts
```

Current issue:

- Procedures are one-liners.
- This is type-safe but hard to review and maintain.

Target style:

- Match `packages/trpc/server/routes/form/route.ts` multi-line procedure style.
- Keep procedure names and input/output schemas unchanged.
- No behavior changes.

Acceptance criteria:

- `adminProcedure` remains used for every admin endpoint.
- Actor user ID continues to come from `ctx.user.id`, never client input.
- `pnpm check-types` passes.

## Phase 5: Database Model Cleanup Plan

### 5.1 Enum/Constraint Hardening

Current examples:

```txt
packages/database/models/user.ts
packages/database/models/form.ts
```

Current issue:

- Role/status/visibility fields are plain `varchar`.
- Service Zod parsing catches invalid values, but DB allows invalid values.

Future target:

- Add Postgres enums or check constraints for:
  - `users.role`: `user`, `admin`
  - `users.status`: `active`, `suspended`
  - `forms.status`: `draft`, `published`, `archived`
  - `forms.visibility`: `public`, `unlisted`

Recommended approach:

- Do this in a dedicated migration.
- First inspect existing data for invalid values.
- Add constraints after data is clean.

### 5.2 Legacy `form_submissions.formFieldId`

File:

```txt
packages/database/models/form-submission.ts
```

Current issue:

- `formFieldId` appears legacy or unused because submissions now store all answers in `values`.

Plan:

- Confirm no code reads/writes `formSubmissionsTable.formFieldId`.
- If unused, create future migration to drop it.
- If keeping temporarily, add a short code comment marking it as legacy.

### 5.3 Narrow Database Package Exports

File:

```txt
packages/database/index.ts
```

Current issue:

```ts
export * from "drizzle-orm/node-postgres";
```

Plan:

- Prefer explicit exports only.
- Keep currently used Drizzle operators exported from one place.
- Remove broad exports only after confirming no package imports hidden members from `@repo/database`.

Verification:

- `pnpm check-types` catches missing exports.

## Phase 6: Naming Cleanup

File:

```txt
packages/services/user/index.ts
```

Current issue:

```ts
singnInUserWithEmailAndPassword
```

Target:

```ts
signInUserWithEmailAndPassword
```

Plan:

- Rename method.
- Update all call sites.
- No alias needed unless external package consumers depend on the typo.

Verification:

- `pnpm check-types`.

## Recommended Execution Order

1. Fix/generate complete Drizzle migration metadata.
2. Make public submission persistence transactional.
3. Harden response limit concurrency.
4. Format `admin/route.ts` for maintainability.
5. Rename typo in user service method.
6. Split `form-submission` helpers.
7. Split `admin` service by domain.
8. Optionally split `form` service.
9. Add DB enum/check constraint migration later.
10. Remove legacy `form_submissions.formFieldId` later if confirmed unused.
11. Narrow database exports later.

## Global Verification

Run after each backend phase when feasible:

```bash
pnpm check-types
```

Run before considering the backend refactor complete:

```bash
pnpm build
git diff --check
```

Manual verification:

- Create, edit, publish, unpublish form.
- Submit public form response.
- Submit form at response limit.
- Submit expired/closed form and confirm graceful error.
- View responses.
- Export CSV.
- View analytics.
- Admin user role/status mutation still writes audit logs.
- Admin form moderation still writes audit logs.

## Implementation Notes

Completed in this pass:

- [x] Public submission persistence now uses a database transaction for submission, response event, and email event writes.
- [x] Response limit check now runs inside the transaction after locking the form row.
- [x] Form status and expiry are re-checked inside the submission transaction.
- [x] `form-submission` helpers were split into focused modules:
  - `answer-validation.ts`
  - `conditional-visibility.ts`
  - `csv.ts`
  - `rate-limit.ts`
- [x] Admin tRPC router was reformatted into maintainable multi-line procedures.
- [x] `singnInUserWithEmailAndPassword` was renamed to `signInUserWithEmailAndPassword` and call sites were updated.
- [x] Verification passed: `pnpm check-types`, `pnpm build`, and `git diff --check`.

Blocked/deferred:

- [ ] Drizzle migration metadata repair is still pending because `pnpm db:generate` requires an interactive TTY in this environment. The existing SQL migration was restored unchanged. Run migration generation from a normal terminal before deploying the multi-page migration.
