# Priority 4 Plan: Responses, Analytics, CSV Export

Goal: creators should clearly see collected responses, useful form analytics, and export response data as CSV. This should be simple, type-safe, and hackathon-evaluator friendly.

Mandatory implementation order:

```txt
DB -> service -> tRPC Procedure -> hook -> UI
```

Principles:

- Keep code simple and powerful.
- Avoid over-engineering.
- No unsafe typecasting.
- Use existing tables where possible.
- Keep end-to-end type safety through Drizzle, Zod, tRPC, and typed hooks.
- CSV export is included as a small bonus feature inside Priority 4.
- Do not build a complex analytics system or admin dashboard yet.

## Current State

Already implemented:

- `form_submissions` stores response values, respondent email, metadata, and submitted timestamp.
- `response_events` stores submit events.
- Public slug submission creates submission rows and submit events.
- Public submission validates answers server-side.
- Basic submissions page exists at `/dashboard/forms/[id]/submissions`.
- `getSubmissions` verifies creator ownership.

Current gaps:

- Response page is still basic.
- No pagination.
- No response detail view.
- No analytics service.
- No analytics tRPC procedure.
- No analytics hooks.
- No analytics cards on builder/dashboard.
- Multi-select values can still appear as raw JSON strings.
- CSV export does not exist yet.

## Step 1: DB

No new DB migration is required for core Priority 4.

Use existing tables:

- `form_submissions` for response rows.
- `response_events` for submit/view event counts.
- `form_fields` for field labels, field types, options, and validation metadata.
- `forms` for ownership and form metadata.

Reason:

- `form_submissions` already has all required response data.
- `response_events` already supports analytics counters.
- Avoiding DB changes keeps Priority 4 faster and safer.

DB acceptance:

- No migration is needed.
- Existing submissions are enough for response management and analytics.
- Existing response events are enough for submit counts and future view tracking.

## Step 2: Service

Files:

- `packages/services/form-submission/model.ts`
- `packages/services/form-submission/index.ts`

Keep implementation in `FormSubmissionService` for simplicity. Do not create a separate analytics service unless this file becomes too large.

### 2.1 Add Shared Response Schemas

Add schemas in `packages/services/form-submission/model.ts`:

```ts
export const listResponsesInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const getFormAnalyticsInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
});

export const exportResponsesCsvInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
});
```

### 2.2 Add `listResponses`

Method:

```ts
listResponses({ formId, userId, page, pageSize })
```

Flow:

1. Parse input with Zod.
2. Verify form belongs to `userId`.
3. Fetch fields for the form.
4. Fetch paginated submissions with `limit` and `offset`.
5. Count total submissions.
6. Return fields, responses, and pagination metadata.

Output shape:

```ts
{
  fields: [
    {
      id: string,
      label: string,
      type: string,
      options: FieldOption[] | null,
      validation: FieldValidation | null,
    }
  ],
  responses: [
    {
      id: string,
      respondentEmail: string | null,
      values: FormSubmissionValueRow | null,
      metadata: FormSubmissionMetadata | null,
      submittedAt: Date | null,
      createdAt: Date | null,
    }
  ],
  pagination: {
    page: number,
    pageSize: number,
    total: number,
    totalPages: number,
  }
}
```

Notes:

- Keep existing `getSubmissionsByFormId` temporarily for backwards compatibility.
- New UI should use `listResponses`.
- Use the same owner verification pattern already added for `getSubmissionsByFormId`.

### 2.3 Add Analytics Helpers

Add safe helper functions in service file:

```ts
parseStringArray(value: string): string[]
getAnswerValue(values, fieldId): string | undefined
getOptionLabel(field, value): string
```

Rules:

- Use Zod to parse JSON arrays.
- Do not use unsafe typecasting.
- If parsing fails, treat invalid response values as empty for analytics instead of crashing the whole analytics request.

### 2.4 Add `getFormAnalytics`

Method:

```ts
getFormAnalytics({ formId, userId })
```

Flow:

1. Parse input with Zod.
2. Verify form belongs to `userId`.
3. Load fields.
4. Load submissions.
5. Load response events for the form.
6. Calculate analytics.

Metrics:

```ts
{
  totalResponses: number,
  totalSubmissions: number,
  totalViews: number,
  completionRate: number,
  submissionsByDay: Array<{
    date: string,
    count: number,
  }>,
  fieldBreakdown: Array<{
    fieldId: string,
    label: string,
    type: string,
    responseCount: number,
    options?: Array<{
      label: string,
      value: string,
      count: number,
    }>,
    averageRating?: number,
  }>,
}
```

Metric rules:

- `totalResponses`: count from `form_submissions`.
- `totalSubmissions`: count `response_events.type = "submit"`.
- `totalViews`: count `response_events.type = "view"`.
- `completionRate`: if views > 0, `submits / views * 100`; else if responses > 0, `100`; else `0`.
- `submissionsByDay`: group submissions by `submittedAt` date.
- `fieldBreakdown`:
  - `SINGLE_SELECT`: count option values.
  - `MULTI_SELECT`: parse JSON array and count every selected option value.
  - option-based `CHECKBOX`: parse JSON array and count every selected option value.
  - boolean `CHECKBOX`: count `true` and `false`.
  - `RATING`: calculate average rating.
  - text/email/date/number: count non-empty answers.

### 2.5 Add `exportResponsesCsv`

This is the bonus feature for extra marks.

Method:

```ts
exportResponsesCsv({ formId, userId })
```

Flow:

1. Parse input with Zod.
2. Verify form belongs to `userId`.
3. Fetch form title.
4. Fetch all fields.
5. Fetch all responses.
6. Build CSV string.
7. Return filename and CSV content.

Output shape:

```ts
{
  filename: string,
  csv: string,
}
```

CSV columns:

```txt
Submitted At, Respondent Email, Field 1, Field 2, Field 3...
```

CSV formatting rules:

- Escape quotes by doubling them.
- Wrap values in quotes if they contain comma, quote, or newline.
- Empty values should be empty strings.
- Single select should show option label.
- Multi select should show option labels joined by comma.
- Checkbox group should show option labels joined by comma.
- Boolean checkbox should show `Yes` or `No`.
- Rating should show the rating value.
- Date/text/email/number should show raw value.

Example output:

```ts
{
  filename: "hackathon-feedback-responses.csv",
  csv: "Submitted At,Respondent Email,Name,Rating\n..."
}
```

### Service Acceptance

- `listResponses` returns paginated response data.
- `getFormAnalytics` returns useful analytics.
- `exportResponsesCsv` returns downloadable CSV content.
- All methods verify form ownership.
- No unsafe typecasting is used.

## Step 3: tRPC Procedure

Files:

- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`

### 3.1 Add tRPC Schemas

Add input/output schemas:

```ts
listResponsesInputSchema
listResponsesOutputSchema
getFormAnalyticsInputSchema
getFormAnalyticsOutputSchema
exportResponsesCsvInputSchema
exportResponsesCsvOutputSchema
```

Input schemas should not include `userId`. The tRPC layer adds `ctx.user.id`.

Example:

```ts
export const listResponsesInputSchema = z.object({
  formId: z.string(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
```

### 3.2 Add Protected Procedures

Add:

```ts
listResponses
getFormAnalytics
exportResponsesCsv
```

Each procedure:

- must be `protectedProcedure`
- must pass `userId: ctx.user.id`
- must include OpenAPI metadata for Scalar

OpenAPI paths:

```txt
/form/listResponses
/form/getFormAnalytics
/form/exportResponsesCsv
```

### tRPC Acceptance

- Response/analytics/export APIs are protected.
- User can only access own form data.
- Scalar docs include response list, analytics, and CSV export endpoints.

## Step 4: Hook

File:

- `apps/web/hooks/api/form/index.ts`

Add hooks:

```ts
useResponses(formId: string, page?: number)
useFormAnalytics(formId: string)
useExportResponsesCsv()
```

Suggested shape:

```ts
export const useResponses = (formId: string, page = 1) => {
  const query = trpc.form.listResponses.useQuery({
    formId,
    page,
    pageSize: 20,
  });

  return {
    responsesData: query.data,
    responsesError: query.error,
    responsesIsLoading: query.isLoading,
    responsesIsFetching: query.isFetching,
  };
};
```

CSV hook:

```ts
export const useExportResponsesCsv = () => {
  const mutation = trpc.form.exportResponsesCsv.useMutation();
  return {
    exportResponsesCsvAsync: mutation.mutateAsync,
    exportResponsesCsvIsPending: mutation.isPending,
    exportResponsesCsvError: mutation.error,
  };
};
```

Update invalidations:

- After `submitPublicResponse`, invalidate:
  - `getPublicFormBySlug`
  - `getSubmissions`
  - `listResponses`
  - `getFormAnalytics`

### Hook Acceptance

- Response page can fetch paginated responses.
- Builder page can fetch analytics.
- UI can trigger CSV export mutation.

## Step 5: UI

Files:

- `apps/web/app/dashboard/forms/[id]/submissions/page.tsx`
- `apps/web/app/dashboard/forms/[id]/page.tsx`

### 5.1 Responses Page

Update `/dashboard/forms/[id]/submissions`.

Changes:

- Rename heading from `Submissions` to `Responses`.
- Use `useResponses(formId, page)`.
- Add `Export CSV` button.
- Add pagination controls.
- Format values nicely.

Table columns:

```txt
Submitted At | Respondent Email | Dynamic Field Columns
```

Pagination UI:

- Previous button.
- Next button.
- `Page X of Y` text.
- Disable buttons at boundaries.

CSV button behavior:

1. Call `exportResponsesCsvAsync({ formId })`.
2. Create browser Blob.
3. Trigger download.

Client download logic:

```ts
const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = filename;
link.click();
URL.revokeObjectURL(url);
```

Value formatting rules:

- Empty: `-`
- Single select: option label.
- Multi select: option labels joined by comma.
- Checkbox group: option labels joined by comma.
- Boolean checkbox: `Yes` / `No`.
- Rating: `4 / 5`.
- Text/email/date/number: raw value.

### 5.2 Builder Analytics Cards

Update `/dashboard/forms/[id]/page.tsx`.

Add analytics card section near the top:

- Total responses
- Submissions
- Views
- Completion rate

If no data:

- show `0`
- avoid scary empty states

### 5.3 Field Breakdown UI

Add simple field breakdown section below analytics cards or near fields.

Display:

- Select/multi/checkbox option counts.
- Rating average.
- Text/email/date/number filled response count.

Keep UI simple:

- Cards and lists are enough.
- Recharts can be added later, but not required for Priority 4 done criteria.

### UI Acceptance

- Creator sees paginated responses.
- Creator sees analytics cards.
- Creator sees field-level breakdown.
- Creator can export CSV and download it.
- Values are readable, not raw JSON.

## Step 6: Verification

Commands:

```sh
pnpm check-types
pnpm build
```

No DB migration expected unless we decide to add columns.

Manual verification:

1. Publish a form.
2. Submit 3-5 responses from `/f/[slug]`.
3. Open builder page:

```txt
/dashboard/forms/[id]
```

4. Confirm analytics cards show non-zero values.
5. Confirm field breakdown shows option/rating counts.
6. Open responses page:

```txt
/dashboard/forms/[id]/submissions
```

7. Confirm formatted responses show correctly.
8. Click `Export CSV`.
9. Open downloaded CSV.
10. Confirm headers and values are correct.
11. Login as another user and confirm responses/analytics/export are blocked.

## Done Criteria

Priority 4 is complete when:

- `listResponses` service exists.
- `getFormAnalytics` service exists.
- `exportResponsesCsv` service exists.
- tRPC procedures exist.
- hooks exist.
- responses page uses paginated response API.
- analytics cards show real data.
- field breakdown shows useful data.
- CSV export downloads correctly.
- owner checks work.
- `pnpm check-types` passes.
- `pnpm build` passes.

## Recommended Implementation Slices

### Slice A: Service

Implement:

- `listResponses`
- `getFormAnalytics`
- `exportResponsesCsv`

Also add helpers:

- owner verification helper
- safe JSON string-array parser
- field option label resolver
- response value formatter for CSV
- CSV escaping helper

Run after Slice A:

```sh
pnpm check-types
```

### Slice B: tRPC + Hooks

Implement:

- tRPC schemas
- `listResponses` procedure
- `getFormAnalytics` procedure
- `exportResponsesCsv` procedure
- `useResponses`
- `useFormAnalytics`
- `useExportResponsesCsv`

Update invalidations after public response submit.

Run after Slice B:

```sh
pnpm check-types
```

### Slice C: Responses UI

Implement:

- paginated responses page
- formatted response values
- CSV export button and browser download

Run after Slice C:

```sh
pnpm check-types
```

### Slice D: Analytics UI

Implement:

- analytics cards on builder page
- field breakdown section
- clean empty states

Run after Slice D:

```sh
pnpm check-types
pnpm build
```

### Slice E: Manual Verification

Verify:

- 3-5 public submissions are visible.
- analytics values update.
- CSV downloads.
- CSV content is readable.
- another user cannot access responses/analytics/export.
