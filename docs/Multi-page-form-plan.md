# Multi-Page Forms + Conditional Logic Plan

Goal: add a real multi-page form experience with simple conditional visibility while keeping the existing form builder, public form submission, analytics, responses, CSV export, expiry/limit, QR sharing, clone, and admin features working.

This feature has two parts:

1. **Multi-page forms**: fields can be grouped into pages/steps.
2. **Conditional logic**: a field can be shown only when another field has a specific answer.

The implementation must stay type-safe end-to-end and follow the project order:

```txt
DB -> service -> tRPC procedure/schema -> hook -> UI -> verification
```

## Simple Product Explanation

### Multi-Page Form

Instead of showing all questions on one page, a form can be split into steps:

```txt
Page 1: Personal info
Page 2: Preferences
Page 3: Feedback
```

Respondent sees:

```txt
Step 1 of 3
[questions]
Next
```

Then:

```txt
Step 2 of 3
Back / Next
```

Then final page:

```txt
Step 3 of 3
Back / Submit
```

### Conditional Logic

A field can depend on a previous answer.

Example:

```txt
Question: Are you a student?
Options: Yes, No

Question: What school do you attend?
Show only if: Are you a student? equals Yes
```

If the respondent selects `No`, the school field stays hidden and is not required.

## V1 Scope

Add:

- Page index on each field.
- Builder page tabs.
- Add page button.
- Field dialog page selector.
- Public next/back flow.
- Progress text/bar.
- Per-page required validation.
- Conditional visibility per field.
- Conditional logic based on simple source fields.
- Server-side conditional required validation.
- Clone support for pages and conditions.

Do not add in V1:

- Named pages stored in DB.
- Page descriptions stored in DB.
- Drag-and-drop page reorder.
- Complex AND/OR condition groups.
- Page-level branching.
- Calculations.
- Conditional redirects.
- Conditional email notifications.

## Recommended V1 Data Model

Use the existing `form_fields` table and add two columns:

```txt
page_index integer not null default 0
visibility_condition json nullable
```

Why this approach:

- Existing forms automatically become single-page forms.
- No new page table needed.
- Faster to implement safely.
- Lower migration risk.
- Good enough for a polished V1.

## Page Model

Pages are implicit from field `pageIndex` values.

Example fields:

```txt
Field A: pageIndex 0, index 1.00
Field B: pageIndex 0, index 2.00
Field C: pageIndex 1, index 1.00
Field D: pageIndex 1, index 2.00
```

Public UI shows:

```txt
Page 1: Field A, Field B
Page 2: Field C, Field D
```

## Conditional Logic Model

Each field can have one optional visibility condition:

```ts
type FormFieldVisibilityCondition = {
  sourceFieldId: string;
  operator: "equals" | "not_equals";
  value: string;
};
```

Meaning:

```txt
Show this field when [source field] [operator] [value]
```

Examples:

```txt
Show School Name when Are you a student? equals yes
Show Company Name when User type equals business
Show Follow-up feedback when Rating equals 1
```

## Supported Conditional Source Fields In V1

Recommended source field types:

- `SINGLE_SELECT`
- `CHECKBOX`
- `RATING`

Reason:

- Their answer values are predictable.
- Builder UI is easier.
- Validation is safer.
- Enough for a strong demo and useful SaaS feature.

Do not use as source in V1:

- `LONG_TEXT`
- `MULTI_SELECT`
- `SHORT_TEXT`
- `EMAIL`
- `NUMBER`
- `DATE`

These can be supported later with operators like `contains`, `greater_than`, `before`, etc.

## DB Changes

### Step 1: Update Field Model

File:

```txt
packages/database/models/form-field.ts
```

Add import:

```ts
integer
```

Add type:

```ts
export type FormFieldVisibilityCondition = {
  sourceFieldId: string;
  operator: "equals" | "not_equals";
  value: string;
};
```

Add columns:

```ts
pageIndex: integer("page_index").notNull().default(0),
visibilityCondition: json("visibility_condition").$type<FormFieldVisibilityCondition | null>(),
```

Keep existing unique constraint:

```ts
unique().on(table.formId, table.index)
```

Recommended improvement:

```ts
unique().on(table.formId, table.pageIndex, table.index)
```

Why:

- `index` can restart at `1.00` on each page.
- Without changing unique constraint, two pages cannot both have field index `1.00` in same form.

Migration should alter unique constraint accordingly.

### Step 2: Generate Migration

Run:

```bash
pnpm db:generate
```

Inspect migration.

Expected:

- Add `page_index` to `form_fields` default `0` not null.
- Add `visibility_condition` json nullable.
- Update unique constraint if implemented.

### Step 3: Apply Migration

Run:

```bash
pnpm db:migrate
```

Verify:

- Existing fields get `page_index = 0`.
- Existing forms still work as single-page forms.

## Service Schema Changes

### Step 4: Update Form Field Service Model

File:

```txt
packages/services/form-field/model.ts
```

Add visibility schema:

```ts
export const formFieldVisibilityConditionSchema = z.object({
  sourceFieldId: z.string().uuid(),
  operator: z.enum(["equals", "not_equals"]),
  value: z.string().min(1),
});
```

Add to `createFieldInputSchema`:

```ts
pageIndex: z.number().int().min(0).optional(),
visibilityCondition: formFieldVisibilityConditionSchema.nullable().optional(),
```

Add to `updateFieldInputSchema`:

```ts
pageIndex: z.number().int().min(0).optional(),
visibilityCondition: formFieldVisibilityConditionSchema.nullable().optional(),
```

Export types:

```ts
export type FormFieldVisibilityConditionSchemaType = z.infer<typeof formFieldVisibilityConditionSchema>;
```

## Form Field Service Changes

### Step 5: Update Create Field

File:

```txt
packages/services/form-field/index.ts
```

When parsing create input, include:

```ts
pageIndex
visibilityCondition
```

Insert:

```ts
pageIndex: pageIndex ?? 0,
visibilityCondition: visibilityCondition ?? null,
```

### Step 6: Update Get Fields

Select:

```ts
pageIndex: formFieldsTable.pageIndex,
visibilityCondition: formFieldsTable.visibilityCondition,
```

Order by:

```ts
.orderBy(formFieldsTable.pageIndex, formFieldsTable.index)
```

### Step 7: Update Field Update

Allow update payload to set:

```ts
pageIndex
visibilityCondition
```

When updating, include these values through existing `updates` object.

### Step 8: Validate Conditions In Service

Add validation helper:

```ts
async function validateVisibilityCondition(
  formId: string,
  fieldId: string | null,
  condition: FormFieldVisibilityConditionSchemaType | null | undefined,
) { ... }
```

Validation rules:

- If condition is null/undefined, valid.
- Source field must belong to same form.
- Source field cannot be the same field being updated.
- Source field type must be one of:
  - `SINGLE_SELECT`
  - `CHECKBOX`
  - `RATING`
- For `SINGLE_SELECT`, condition value must match one option value.
- For `CHECKBOX`, condition value must be `true` or `false`.
- For `RATING`, condition value must be within rating range.

If this is too much for first pass, at minimum validate same-form and not-self.

## tRPC Schema Changes

### Step 9: Update Form Route Model

File:

```txt
packages/trpc/server/routes/form/model.ts
```

Add visibility condition schema:

```ts
export const formFieldVisibilityConditionOutputSchema = z.object({
  sourceFieldId: z.string(),
  operator: z.enum(["equals", "not_equals"]),
  value: z.string(),
});
```

Add to `formFieldSchema`:

```ts
pageIndex: z.number(),
visibilityCondition: formFieldVisibilityConditionOutputSchema.nullable(),
```

Add to create/update field input schemas:

```ts
pageIndex: z.number().int().min(0).optional(),
visibilityCondition: formFieldVisibilityConditionOutputSchema.nullable().optional(),
```

Add to response field schemas if admin/responses return fields.

## Form Service Changes

### Step 10: Include Fields In Owner/Public Form Output

File:

```txt
packages/services/form/index.ts
```

Where `getFormById` selects field data, add:

```ts
pageIndex: formFieldsTable.pageIndex,
visibilityCondition: formFieldsTable.visibilityCondition,
```

Order by:

```ts
.orderBy(formFieldsTable.pageIndex, formFieldsTable.index)
```

### Step 11: Update Clone Form

File:

```txt
packages/services/form/index.ts
```

When selecting source fields, include:

```ts
pageIndex
visibilityCondition
```

When inserting cloned fields, copy:

```ts
pageIndex: field.pageIndex,
visibilityCondition: field.visibilityCondition,
```

Result:

- Cloned forms preserve multi-page structure and conditional logic.

## Submission Service Changes

### Why This Is Required

Frontend will not submit hidden conditional fields.

But backend currently validates required fields across all fields. If a required field is hidden by a condition, backend must not reject the submission.

So backend must understand conditional visibility too.

### Step 12: Add Server Visibility Helper

File:

```txt
packages/services/form-submission/index.ts
```

Add helper using submitted string values:

```ts
function isFieldVisibleForSubmission(
  field: Field,
  answerByFieldId: Map<string, string>,
): boolean {
  const condition = field.visibilityCondition;
  if (!condition) return true;

  const sourceValue = answerByFieldId.get(condition.sourceFieldId);
  if (sourceValue === undefined) return false;

  if (condition.operator === "equals") return sourceValue === condition.value;
  return sourceValue !== condition.value;
}
```

Actual `Field` type should come from local selected field shape, not `any`.

### Step 13: Update Required Validation

Build answer map:

```ts
const answerByFieldId = new Map(values.map((value) => [value.formFieldId, value.value]));
```

Filter visible fields:

```ts
const visibleFields = fields.filter((field) => isFieldVisibleForSubmission(field, answerByFieldId));
```

Required check should use `visibleFields`, not all fields.

### Step 14: Ignore Hidden Submitted Values

If malicious client submits hidden field answers, do not store them.

Create visible field id set:

```ts
const visibleFieldIds = new Set(visibleFields.map((field) => field.id));
```

When preparing values for insert:

- keep only values where `visibleFieldIds.has(formFieldId)`.

Reason:

- Hidden fields should not be submitted.
- Keeps data clean.

### Step 15: Validate Source Field Chain Carefully

For V1, avoid circular dependency complexity by enforcing in builder/service:

- A field can only depend on fields before it in form order.

If server does not enforce this initially, at least builder should.

Recommended server validation later:

- Source field must have lower page/index order than dependent field.

## Admin Service Changes

### Step 16: Admin Form Detail Fields

File:

```txt
packages/services/admin/index.ts
```

When selecting fields in admin form detail, include:

```ts
pageIndex
visibilityCondition
```

Update tRPC admin field output schema accordingly if returned.

## Builder UI Changes

Main file currently:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

### Step 17: Extend Field Form Schema

Add to builder `fieldSchema`:

```ts
pageIndex: z.string(),
hasVisibilityCondition: z.boolean(),
conditionSourceFieldId: z.string().optional(),
conditionOperator: z.enum(["equals", "not_equals"]).optional(),
conditionValue: z.string().optional(),
```

Use `superRefine`:

- If `hasVisibilityCondition` is true:
  - source is required
  - operator is required
  - value is required

### Step 18: Extend Default Field Values

Add:

```ts
pageIndex: "0",
hasVisibilityCondition: false,
conditionSourceFieldId: "",
conditionOperator: "equals",
conditionValue: "",
```

### Step 19: Add Page State

Inside `FormBuilderPage`:

```ts
const [selectedPageIndex, setSelectedPageIndex] = useState(0);
```

Helpers:

```ts
function getPageIndexes(fields: BuilderField[] | undefined): number[] {
  const indexes = new Set<number>();
  indexes.add(0);
  for (const field of fields ?? []) indexes.add(field.pageIndex ?? 0);
  return Array.from(indexes).sort((a, b) => a - b);
}

function getFieldsForPage(fields: BuilderField[] | undefined, pageIndex: number): BuilderField[] {
  return (fields ?? []).filter((field) => (field.pageIndex ?? 0) === pageIndex);
}
```

### Step 20: Add Page Tabs Above Fields

In builder before fields table:

Render:

```txt
Page 1 | Page 2 | + Add page
```

Add page behavior:

```ts
const nextPageIndex = Math.max(...pageIndexes) + 1;
setSelectedPageIndex(nextPageIndex);
```

Note:

- Empty pages are UI-only until a field is added.
- This is acceptable in V1.

### Step 21: Create Field On Selected Page

When opening create dialog, reset form with:

```ts
pageIndex: selectedPageIndex.toString()
```

When creating field:

```ts
const pageIndex = Number(values.pageIndex);
const fieldsOnPage = getFieldsForPage(fields, pageIndex);
index: `${(fieldsOnPage.length + 1).toFixed(2)}`,
pageIndex,
visibilityCondition: buildVisibilityCondition(values),
```

### Step 22: Edit Field Page And Condition

When opening edit dialog:

```ts
pageIndex: field.pageIndex.toString(),
hasVisibilityCondition: field.visibilityCondition !== null,
conditionSourceFieldId: field.visibilityCondition?.sourceFieldId ?? "",
conditionOperator: field.visibilityCondition?.operator ?? "equals",
conditionValue: field.visibilityCondition?.value ?? "",
```

When updating:

```ts
pageIndex: Number(values.pageIndex),
visibilityCondition: buildVisibilityCondition(values),
```

### Step 23: Add Page Selector In Field Dialog

Add `NativeSelect` field:

```txt
Page: [Page 1, Page 2, ...]
```

Options come from page indexes.

Pass page indexes into `FieldDialog`.

### Step 24: Add Conditional Visibility Controls In Field Dialog

Add section:

```txt
Conditional visibility
[switch] Show this field only when...
Source field: [select]
Operator: [equals / does not equal]
Value: [select]
```

Source field options:

- all fields except current field
- only supported source types
- ideally only fields before this field in page/index order

Supported source types:

- `SINGLE_SELECT`
- `CHECKBOX`
- `RATING`

Condition value UI:

- For `SINGLE_SELECT`: select from source field options.
- For `CHECKBOX`: select `true` / `false`.
- For `RATING`: select numbers `1` to `ratingMax`.

### Step 25: Build Condition Helper

Add helper:

```ts
type FieldVisibilityCondition = {
  sourceFieldId: string;
  operator: "equals" | "not_equals";
  value: string;
};

function buildVisibilityCondition(values: FieldValues): FieldVisibilityCondition | null {
  if (!values.hasVisibilityCondition) return null;
  if (!values.conditionSourceFieldId || !values.conditionOperator || !values.conditionValue) return null;
  return {
    sourceFieldId: values.conditionSourceFieldId,
    operator: values.conditionOperator,
    value: values.conditionValue,
  };
}
```

Because schema validation ensures completeness, returning null here only protects unexpected state.

### Step 26: Fields Table Shows Selected Page

Use:

```ts
const selectedFields = getFieldsForPage(fields, selectedPageIndex);
```

Render selected fields instead of all fields.

Empty state:

```txt
No fields on Page X yet.
Add a field to this page.
```

### Step 27: Field Table Conditional Badge

If a field has `visibilityCondition`, show small badge:

```txt
Conditional
```

Useful for builder clarity.

## Public Form UI Changes

File:

```txt
apps/web/custom/components/public-form/public-form-page.tsx
```

### Step 28: Add Grouping Helpers

Add types:

```ts
type PublicFormPageGroup = {
  pageIndex: number;
  fields: Field[];
};
```

Helper:

```ts
function groupFieldsByPage(fields: Field[]): PublicFormPageGroup[] {
  const groups = new Map<number, Field[]>();

  for (const field of fields) {
    const pageIndex = field.pageIndex ?? 0;
    const pageFields = groups.get(pageIndex) ?? [];
    pageFields.push(field);
    groups.set(pageIndex, pageFields);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageIndex, fields]) => ({ pageIndex, fields }));
}
```

### Step 29: Add Visibility Helper

Use public answers:

```ts
function isFieldVisible(field: Field, answers: PublicAnswers): boolean {
  const condition = field.visibilityCondition;
  if (!condition) return true;

  const answer = answers[condition.sourceFieldId];
  if (answer === undefined) return false;

  const answerValue = Array.isArray(answer) ? answer.join(",") : `${answer}`;

  if (condition.operator === "equals") return answerValue === condition.value;
  return answerValue !== condition.value;
}
```

Since V1 does not support `MULTI_SELECT` source fields, array join should rarely be used, but keeps helper safe.

### Step 30: Add Visible Pages Helper

```ts
function getVisiblePages(pages: PublicFormPageGroup[], answers: PublicAnswers): PublicFormPageGroup[] {
  return pages
    .map((page) => ({ ...page, fields: page.fields.filter((field) => isFieldVisible(field, answers)) }))
    .filter((page) => page.fields.length > 0);
}
```

This auto-skips empty pages caused by conditional logic.

### Step 31: Add Current Page State

Inside `PublicFormPage`:

```ts
const [currentPagePosition, setCurrentPagePosition] = useState(0);
```

Derived:

```ts
const pages = form ? groupFieldsByPage(form.fields) : [];
const visiblePages = getVisiblePages(pages, answers);
const currentPage = visiblePages[Math.min(currentPagePosition, Math.max(visiblePages.length - 1, 0))];
const isFirstPage = currentPagePosition <= 0;
const isLastPage = currentPagePosition >= visiblePages.length - 1;
```

If visible pages shrink after an answer changes, clamp current page position with an effect.

### Step 32: Clear Hidden Answers

When answers change, hidden dependent answers should be removed.

Implement helper:

```ts
function removeHiddenAnswers(fields: Field[], answers: PublicAnswers): PublicAnswers {
  const nextAnswers: PublicAnswers = {};
  for (const field of fields) {
    if (!isFieldVisible(field, answers)) continue;
    const answer = answers[field.id];
    if (answer !== undefined) nextAnswers[field.id] = answer;
  }
  return nextAnswers;
}
```

In `setAnswer`, after setting value, clean hidden answers:

```ts
setAnswers((prev) => {
  const next = { ...prev, [fieldId]: value };
  return form ? removeHiddenAnswers(form.fields, next) : next;
});
```

Do similar for `toggleArrayAnswer`.

### Step 33: Per-Page Validation

Add helper:

```ts
function getMissingRequiredFields(fields: Field[], answers: PublicAnswers): Field[] {
  return fields.filter((field) => isMissingRequiredAnswer(field, answers[field.id]));
}
```

Next button:

```ts
function goNext() {
  if (!currentPage) return;
  const missing = getMissingRequiredFields(currentPage.fields, answers);
  if (missing.length > 0) {
    toast.error(`Please complete: ${missing.map((field) => field.label).join(", ")}`);
    return;
  }
  setCurrentPagePosition((position) => Math.min(position + 1, visiblePages.length - 1));
}
```

Back button:

```ts
function goBack() {
  setCurrentPagePosition((position) => Math.max(0, position - 1));
}
```

Submit:

- validate all visible fields
- submit only visible fields

```ts
const visibleFields = visiblePages.flatMap((page) => page.fields);
const missing = getMissingRequiredFields(visibleFields, answers);
```

Payload:

```ts
values: visibleFields.flatMap((field) => {
  const answer = answers[field.id];
  if (answer === undefined) return [];
  return [{ formFieldId: field.id, value: serializeAnswer(answer) }];
})
```

### Step 34: Render Current Page Only

Replace:

```tsx
form.fields.map(...)
```

With:

```tsx
currentPage.fields.map(...)
```

Render progress:

```tsx
<p>Step {currentPagePosition + 1} of {visiblePages.length}</p>
<div className="h-2 rounded-full bg-muted">
  <div className="h-full rounded-full bg-primary" style={{ width: `${((currentPagePosition + 1) / visiblePages.length) * 100}%` }} />
</div>
```

Render navigation:

```tsx
{!isFirstPage ? <Button type="button" variant="outline" onClick={goBack}>Back</Button> : null}
{isLastPage ? <Button type="submit">Submit</Button> : <Button type="button" onClick={goNext}>Next</Button>}
```

Important:

- `Next` button must be `type="button"`.
- `Submit` button only appears on last visible page.

## Preview Dialog Changes

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

### Step 35: Update Preview

Simplest V1 preview:

- Group fields by page.
- Render page headings.
- Show conditional badge on conditional fields.

Example:

```txt
Page 1
- Name
- Are you a student?

Page 2
- School name [Conditional]
```

Do not implement full interactive conditional preview unless time remains.

## Response/Analytics/CSV Impact

No major change needed.

Existing response model is field-based, not page-based.

Keep:

- Response table as field columns.
- CSV as field columns.
- Analytics as field breakdown.

Optional later:

- Group response table columns by page.

## Admin Impact

Admin form detail should show page index and conditional badge if fields are listed.

Do not add admin editing for multi-page/conditions in V1.

## Clone Impact

Clone must copy:

- `pageIndex`
- `visibilityCondition`

Manual verification should include clone preserving pages/conditions.

## Implementation Order

Follow this exact order:

1. Update DB model.
2. Generate migration.
3. Run migration.
4. Update form-field service schemas.
5. Update form-field service create/update/get.
6. Update tRPC field schemas.
7. Update form service `getFormById` field select/order.
8. Update clone form field copy.
9. Update form-submission service conditional validation.
10. Update admin form detail field select/schema if needed.
11. Update builder UI for page tabs and page selector.
12. Update builder UI for conditional controls.
13. Update public form for pages and navigation.
14. Update public form for conditional visibility.
15. Update preview dialog.
16. Run type/build checks.
17. Manual verification.

## Verification Commands

Run:

```bash
pnpm db:generate
pnpm db:migrate
pnpm check-types
pnpm build
```

If seed data needs page/condition examples, update seed and run:

```bash
pnpm db:seed
```

## Manual Verification Checklist

### Existing Single-Page Forms

- Existing forms open in builder.
- Existing fields appear on Page 1.
- Existing public forms behave like before.
- Submission still works.
- Responses still show.
- CSV still exports.

### Multi-Page Builder

- Add Page 2.
- Add a field to Page 2.
- Switch between Page 1 and Page 2.
- Fields table updates per selected page.
- Edit a field and move it to another page.
- Publish form works.
- Preview shows page grouping.

### Multi-Page Public Form

- Public form shows Step 1 of N.
- Next button appears on non-final pages.
- Back button appears after first page.
- Submit button appears only on final page.
- Required field on current page blocks Next.
- Answers persist when navigating back and forward.
- Submission succeeds from final page.

### Conditional Builder

- Create source field: `Are you a student?` single select with `yes/no`.
- Create dependent field: `School name`.
- Set condition: show `School name` when source equals `yes`.
- Edit condition and save.
- Remove condition and save.
- Conditional badge appears in builder.

### Conditional Public Form

- Initially dependent field is hidden.
- Select source value `yes`; dependent field appears.
- Select source value `no`; dependent field hides.
- If dependent field is required, it only blocks when visible.
- Hidden field answer is not submitted.

### Multi-Page Conditional

- Source field on Page 1.
- Dependent field on Page 2.
- If source answer hides all Page 2 fields, Page 2 is skipped.
- If source answer shows Page 2 fields, Page 2 appears.
- Back/Next still works after changing source answer.

### Server Validation

- Hidden required field does not block submission.
- Visible required field blocks submission.
- Malicious/stale hidden answer is ignored or not stored.

### Clone

- Clone multi-page form.
- Cloned fields preserve page assignment.
- Cloned fields preserve conditions.
- Clone is still draft/unlisted.

### Admin

- Admin form detail still loads.
- Admin form moderation still works.
- Archived/unpublished public forms still blocked.

### Other Features

- Expiry still closes form.
- Response limit still closes form.
- QR still points to public form.
- Templates page still loads.
- Public legacy redirect still works.

## Edge Cases

### Empty Pages

Builder:

- Empty page can exist temporarily in UI.
- After refresh it disappears unless it has a field.

Public:

- Empty pages are skipped.

### All Pages Hidden

If conditional logic hides every field:

- Show a friendly message:

```txt
No questions are available based on your answers.
```

Do not submit an empty response unless product wants that.

### Source Answer Changes

If source answer changes and dependent fields become hidden:

- Clear dependent answers.
- Recalculate visible pages.
- Clamp current page position.

### Condition Points To Deleted Source Field

If source field is deleted:

- Dependent field should behave as hidden on public form.
- Builder should show condition as invalid/missing source if possible.
- Later improvement: clear conditions when deleting source field.

### Circular Conditions

Avoid in V1 by builder rules:

- Only allow condition source fields before current field.

If somehow circular condition exists:

- Server/public helper should not recurse, so no infinite loop.
- Field visibility only reads direct source answer.

## Type Safety Checklist

- No `any`.
- No `as any`.
- No `as unknown as`.
- Avoid non-null assertions.
- Parse DB string values with Zod schemas.
- Explicit helper return types.
- Use tRPC inferred types in hooks/UI.
- Keep metadata/JSON types explicit.

## Completion Criteria

Feature is complete when:

- `form_fields.page_index` exists.
- `form_fields.visibility_condition` exists.
- Existing forms default to Page 1.
- Builder can create fields on different pages.
- Builder can move fields between pages.
- Builder can configure simple field visibility condition.
- Public form shows one page at a time.
- Public form supports Back/Next/Submit.
- Public form applies conditional visibility.
- Server validation respects conditional hidden fields.
- Hidden answers are not submitted/stored.
- Clone preserves pages and conditions.
- `pnpm check-types` passes.
- `pnpm build` passes.
- Manual verification checklist passes.

## Recommended V1 Decision

Use this V1:

```txt
Implicit pages via field.pageIndex
Simple one-condition visibility per field
Source field types: SINGLE_SELECT, CHECKBOX, RATING
Operators: equals, not_equals
No named pages yet
No complex AND/OR logic yet
```

This gives a strong multi-page + conditional feature without turning the project into a full rules engine immediately.
