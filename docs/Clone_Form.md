# Clone Form Plan

Goal: let an authenticated creator duplicate an existing form into a new draft form with the same fields and design, without copying responses or analytics.

This feature should follow the project implementation order:

```txt
DB -> service -> tRPC procedure -> hook -> UI -> verification
```

No DB migration should be needed because the existing form and field tables already support the required data.

## Product Behavior

When a user clones a form:

- A new form is created for the same user.
- The new form is a draft.
- The new form gets a new unique slug.
- The new form title is prefixed with `Copy of`.
- Fields are copied in the same order.
- Field labels, descriptions, placeholders, required flags, types, options, and validation are copied.
- Theme is copied if the source form has one.
- Thank-you title/message are copied.
- Responses/submissions are not copied.
- Analytics are not copied.
- Published state is not copied.
- `publishedAt` is not copied.
- Expiry is not copied by default.
- Response limit is not copied by default.
- Visibility should default to `unlisted` for safety.

Recommended cloned form defaults:

```txt
title: Copy of [source title]
description: source description
status: draft
visibility: unlisted
slug: generated unique slug from copied title
publishedAt: null
expiresAt: null
responseLimit: null
themeId: source themeId
thankYouTitle: source thankYouTitle
thankYouMessage: source thankYouMessage
```

## Why Clone Form Next

- It is demo-visible.
- It makes the product feel mature.
- It reuses existing schema and service patterns.
- It unlocks a future `Use template` feature with minimal extra work.
- It is more valuable than archive if time is limited.

## Scope

Add:

- Protected clone form backend service method.
- Protected tRPC mutation.
- Typed frontend hook.
- Clone action in forms list.
- Optional clone action in builder page.
- Redirect to cloned form builder after success.

Do not add in the first pass:

- Cloning responses.
- Cloning analytics.
- Cloning public URL/slug exactly.
- Cloning `publishedAt`.
- Cloning status as published.
- Cloning expiry/response limit.
- Bulk clone.
- Clone history.
- Template marketplace behavior.

## Files To Inspect First

Before editing, inspect:

```txt
packages/database/models/form.ts
packages/database/models/form-field.ts
packages/services/form/index.ts
packages/services/form/model.ts
packages/trpc/server/routes/form/model.ts
packages/trpc/server/routes/form/route.ts
apps/web/hooks/api/form/index.ts
apps/web/custom/components/forms/forms-page.tsx
apps/web/custom/components/forms/form-builder-page.tsx
```

Confirm:

- Form table columns.
- Form field table columns.
- Existing create form service logic.
- Existing unique slug generation helper.
- Existing field create/copy patterns.
- Existing tRPC protected procedures.
- Existing hook invalidation style.
- Existing forms list action UI.

## Step 1: Confirm DB Support

Files:

```txt
packages/database/models/form.ts
packages/database/models/form-field.ts
```

Confirm `forms` table has:

- `id`
- `title`
- `description`
- `slug`
- `status`
- `visibility`
- `thankYouTitle`
- `thankYouMessage`
- `themeId`
- `createdBy`
- `publishedAt`
- `expiresAt`
- `responseLimit`
- timestamps

Confirm `formFields` table has:

- `id`
- `formId`
- `label`
- `description`
- `labelKey`
- `placeholder`
- `isRequired`
- `index`
- `type`
- `options`
- `validation`
- timestamps

Expected result:

- No migration required.
- Clone can be implemented with insert/select operations.

Stop condition:

- If a required field is not available, decide whether it should be skipped or added properly through schema/migration. Do not use partial unsafe inserts.

## Step 2: Define Clone Input/Output In Service Model

File:

```txt
packages/services/form/model.ts
```

Add schemas:

```ts
export const cloneFormInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
});

export type CloneFormInputSchemaType = z.infer<typeof cloneFormInputSchema>;
```

Output can be inferred from service return, or explicitly typed if this file already follows that pattern.

Recommended output shape:

```ts
{
  id: string;
  slug: string;
}
```

Check:

- Names match existing schema naming style.
- No `any`.
- Export is available to service file.

## Step 3: Add tRPC Clone Schemas

File:

```txt
packages/trpc/server/routes/form/model.ts
```

Add:

```ts
export const cloneFormInputSchema = z.object({
  formId: z.string().describe("The id of the form to clone"),
});

export const cloneFormOutputSchema = z.object({
  id: z.string().describe("The id of the cloned form"),
  slug: z.string().describe("The slug of the cloned form"),
});
```

Check:

- Use protected user context in procedure, not client-provided `userId`.
- Keep input minimal.

## Step 4: Implement Service Method

File:

```txt
packages/services/form/index.ts
```

Add method to `FormService`:

```ts
public async cloneForm(input: CloneFormInputSchemaType) {
  ...
}
```

High-level flow:

1. Parse input with `cloneFormInputSchema`.
2. Assert current user owns the source form.
3. Load source form row.
4. Load source fields ordered by `index`.
5. Generate cloned title.
6. Generate unique slug.
7. Insert new form as draft/unlisted.
8. Insert cloned fields with new `formId`.
9. Return new form id and slug.

### Step 4.1: Parse And Authorize

Use existing owner assertion:

```ts
const { formId, userId } = await cloneFormInputSchema.parseAsync(input);
await this.assertFormOwner(formId, userId);
```

Reason:

- First version only clones forms owned by current user.
- Public template cloning can be added later.

Check:

- User cannot clone another private user's form.

### Step 4.2: Load Source Form

Select the columns needed for the new form:

- `title`
- `description`
- `thankYouTitle`
- `thankYouMessage`
- `themeId`

Also load `id` for safety.

Do not load or copy:

- `status`
- `visibility`
- `publishedAt`
- `expiresAt`
- `responseLimit`

Example intent:

```ts
const sourceRows = await db
  .select({ ... })
  .from(formsTable)
  .where(eq(formsTable.id, formId))
  .limit(1);

const sourceForm = sourceRows[0];
if (!sourceForm) throw new Error(`Form With ${formId} Not Found`);
```

Check:

- Missing source throws a clear error.

### Step 4.3: Load Source Fields

Select all cloneable field columns:

- `label`
- `description`
- `labelKey`
- `placeholder`
- `isRequired`
- `index`
- `type`
- `options`
- `validation`

Order by `index`.

Do not copy:

- `id`
- `createdAt`
- `updatedAt`

Check:

- Zero-field form can still be cloned if it exists.
- Field order remains the same.

### Step 4.4: Generate Title And Slug

Title rule:

```txt
Copy of [source title]
```

Title max length is `55`, so helper should trim safely.

Recommended helper:

```ts
private cloneTitle(title: string) {
  const nextTitle = `Copy of ${title}`;
  return nextTitle.length > 55 ? nextTitle.slice(0, 55).trim() : nextTitle;
}
```

Slug rule:

- Generate base slug from cloned title.
- Use existing unique slug helper if available.
- Do not copy original slug.

If existing service already has `generateSlug`/`ensureUniqueSlug`, reuse it.

Expected examples:

```txt
Original: customer-feedback
Clone: copy-of-customer-feedback
If taken: copy-of-customer-feedback-1
```

Check:

- Slug is unique.
- Slug follows existing slug rules.
- Long titles do not produce invalid slug.

### Step 4.5: Insert New Form

Insert into `formsTable`:

```txt
title: clonedTitle
description: sourceForm.description
slug: clonedSlug
status: draft
visibility: unlisted
thankYouTitle: sourceForm.thankYouTitle
thankYouMessage: sourceForm.thankYouMessage
themeId: sourceForm.themeId
createdBy: userId
publishedAt: null
expiresAt: null
responseLimit: null
```

Return:

- `id`
- `slug`

Check:

- New form belongs to current user.
- New form is draft.
- New form is not public in templates.

### Step 4.6: Insert Cloned Fields

If source form has fields, bulk insert into `formFieldsTable`.

For each field:

```txt
formId: clonedForm.id
label: source label
description: source description
labelKey: source labelKey
placeholder: source placeholder
isRequired: source isRequired
index: source index
type: source type
options: source options
validation: source validation
```

Do not generate new `labelKey` unless existing rules require uniqueness per form.

Reason:

- Label keys are stable field identifiers inside a form.
- Since cloned fields belong to a new form, duplicate label keys across forms are acceptable unless DB has a global unique constraint.

Check:

- Options arrays are preserved.
- Validation objects are preserved.
- Field types remain valid.

### Step 4.7: Transaction Consideration

Preferred:

- Use DB transaction if the project already uses Drizzle transactions.

Reason:

- Avoid creating a form without fields if field insert fails.

If transaction style is not established and adding it is noisy:

- Keep implementation simple but handle errors clearly.
- For production-quality correctness, transaction is better.

Recommended:

```ts
await db.transaction(async (tx) => {
  ...insert form...
  ...insert fields...
});
```

Check:

- If field insert fails, cloned form should not remain half-created.

## Step 5: Add tRPC Procedure

File:

```txt
packages/trpc/server/routes/form/route.ts
```

Add protected mutation:

```ts
cloneForm: protectedProcedure
  .input(cloneFormInputSchema)
  .output(cloneFormOutputSchema)
  .mutation(async ({ input, ctx }) => {
    return formService.cloneForm({ ...input, userId: ctx.user.id });
  }),
```

Adjust `ctx.user.id` to match existing protected procedure context naming.

Check existing procedures before writing:

- How `userId` is read.
- How service is instantiated/imported.
- Existing mutation naming style.

Check:

- Procedure is protected.
- Client cannot pass arbitrary `userId`.
- Output matches service return.

## Step 6: Add Frontend Hook

File:

```txt
apps/web/hooks/api/form/index.ts
```

Add hook:

```ts
export const useCloneForm = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.cloneForm.useMutation({
    onSuccess: async () => {
      await utils.form.listForms.invalidate();
    },
  });

  return {
    cloneFormAsync: mutation.mutateAsync,
    cloneForm: mutation.mutate,
    cloneFormError: mutation.error,
    cloneFormIsPending: mutation.isPending,
  };
};
```

Optional invalidations:

- `utils.form.getFormForOwner.invalidate()` if user navigates immediately to cloned form and stale cache is a concern.
- Usually not needed because new ID has no cached data.

Check:

- Hook naming follows existing style.
- Invalidation updates forms list.

## Step 7: Add UI In Forms List

File:

```txt
apps/web/custom/components/forms/forms-page.tsx
```

Add clone action in forms table row.

UI behavior:

- Button label/icon: `Clone`.
- Disable while clone is pending.
- On click:
  - call `cloneFormAsync({ formId })`
  - toast success
  - route to `/dashboard/forms/[clonedId]`

Use Next router:

```ts
import { useRouter } from "next/navigation";
```

Handler:

```ts
async function onCloneForm(formId: string) {
  try {
    const clonedForm = await cloneFormAsync({ formId });
    toast.success("Form cloned");
    router.push(`/dashboard/forms/${clonedForm.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clone form";
    toast.error(message);
  }
}
```

Check:

- Clone button does not break row layout.
- Existing Builder button still works.
- Existing Copy link still works.

## Step 8: Optional UI In Builder Page

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Optional first-pass feature:

- Add a `Clone form` button in builder header or settings actions.

Recommendation:

- Add clone only to forms list first.
- If time remains, add builder-page clone button using the same hook.

Reason:

- Forms list is the natural place for duplicate/manage actions.
- Builder page is already crowded with settings, QR, expiry, preview, publish controls.

## Step 9: Optional Template Integration Later

After owner-form clone works, add `Use template` from `/templates`.

This requires a separate permission rule:

- User can clone own forms.
- User can clone published public forms as templates.

Do not implement in first pass unless clone is stable.

Future service option:

```txt
cloneFormForUser(formId, userId)
```

Authorization:

- allow if owner
- or allow if source status is `published` and visibility is `public`

UI:

- `/templates` card button: `Use template`
- Requires auth or redirects to signup/login.

## Step 10: Type Check

Run:

```bash
pnpm check-types
```

Pass criteria:

- Service model exports resolve.
- tRPC route compiles.
- Client hook sees `trpc.form.cloneForm`.
- UI payload/output are correctly typed.
- No `any` added.
- No unsafe casts added.

If failing:

- Fix schema/procedure exports.
- Regenerate or rebuild typegen if project requires it.
- Do not silence types.

## Step 11: Build Check

Run:

```bash
pnpm build
```

Pass criteria:

- API/services build.
- Web build.
- Existing routes still generate.
- No server/client boundary issues.

Known unrelated issue:

- `pnpm lint` may still be blocked by existing ESLint config/warnings. Do not treat lint as required unless config is fixed separately.

## Manual Verification Checklist

Use an authenticated demo user.

### Basic Clone

- Create or choose a form with multiple fields.
- Open `/dashboard/forms`.
- Click `Clone` on that form.
- Success toast appears.
- App navigates to `/dashboard/forms/[newId]`.
- New form title is `Copy of ...`.
- New form is draft.
- New form visibility is unlisted.
- New form has a different slug.

### Fields

- Original fields are present in clone.
- Field order is preserved.
- Field types are preserved.
- Required flags are preserved.
- Descriptions are preserved.
- Placeholders are preserved.
- Options are preserved for select/checkbox fields.
- Validation is preserved for text/number/rating/date fields.

### Theme And Settings

- Theme is preserved if source had a theme.
- Thank-you title is preserved.
- Thank-you message is preserved.
- Expiry is empty on clone.
- Response limit is empty on clone.

### Publishing

- Clone is not published automatically.
- Public link should not be available as published until user publishes.
- Publish clone works.
- Clone public URL opens after publishing.

### Original Form Safety

- Editing cloned title does not change original.
- Editing cloned fields does not change original.
- Publishing clone does not publish original.
- Deleting/editing clone fields does not affect original.

### Responses And Analytics

- Original responses are not copied.
- Clone responses page starts empty.
- Clone analytics starts at zero/no data.
- CSV export for clone has no original responses.

### Authorization

- User can clone own form.
- User cannot clone another user's private form.
- Unauthenticated user cannot call clone mutation.

### Edge Cases

- Clone a form with zero fields.
- Clone a form with a very long title.
- Clone a form whose copied slug base already exists.
- Clone a draft form.
- Clone a published form.
- Clone a form with no theme.
- Clone a form with all field types.

## Error Handling

Expected user-facing errors:

- `Failed to clone form` fallback.
- Source not found/unauthorized message from backend.

UI should:

- Toast error.
- Keep user on current page.
- Re-enable clone button after mutation settles.

Service should:

- Throw if source does not exist.
- Throw if user does not own source.
- Avoid partial clones if using transaction.

## Transaction Checklist

If transaction is implemented:

- Insert form and fields inside same transaction.
- Return cloned form id and slug from transaction callback.
- Use transaction client for all reads/writes inside callback if needed.

If transaction is not implemented:

- Document why.
- Prefer adding transaction because clone is multi-write.

## Anti-Regression Rules

- Do not rename existing routes.
- Do not change public slug behavior.
- Do not alter create form behavior.
- Do not alter publish/unpublish behavior.
- Do not copy submissions.
- Do not copy analytics.
- Do not make cloned forms public by default.
- Do not clone into another user account.
- Do not add unsafe casts.

## Completion Criteria

Clone Form is complete when:

- Service has protected clone logic.
- tRPC exposes protected `cloneForm` mutation.
- Web hook `useCloneForm` exists.
- Forms list exposes clone action.
- Clone creates a new draft form.
- Clone copies fields and theme/settings correctly.
- Clone does not copy responses/analytics/published state.
- New slug is unique.
- User is redirected to cloned builder page.
- `pnpm check-types` passes.
- `pnpm build` passes.
- Manual verification checklist passes.

## Update After Completion

After implementation and verification, update:

```txt
docs/plan.md
```

Mark Clone Form as completed in the bonus list.

Optional note:

```txt
Clone Form completed: creators can duplicate owned forms into new draft forms with fields/theme copied and responses excluded.
```
