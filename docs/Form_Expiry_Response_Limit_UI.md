# Form Expiry + Response Limit UI Plan

Goal: add creator-facing settings for form expiry and response limit, then show a clear closed state on public forms when either rule blocks responses.

This is a bonus feature with backend groundwork mostly already present. Keep the implementation small, typed, and demo-safe.

## Scope

Add to builder settings:

- Expiry date/time.
- Response limit.
- Ability to clear both settings.
- Save through the existing form update flow.
- Public form closed state for expired forms.
- Public form closed state for forms that reached response limit.

Do not add:

- New DB tables.
- Billing/plan gating.
- Admin dashboard controls.
- Password protection.
- Conditional logic.
- Scheduling UI beyond one expiry datetime input.

## Existing Groundwork

Already exists:

- DB fields:
  - `forms.expiresAt`
  - `forms.responseLimit`
- tRPC input supports:
  - `expiresAt: Date | null | undefined`
  - `responseLimit: number | null | undefined`
- Owner form output includes:
  - `expiresAt`
  - `responseLimit`
- Form update service accepts both values through `updateForm`.
- Submission service blocks expired forms.
- Submission service blocks response-limit reached forms.

Likely missing or incomplete:

- Builder UI fields.
- Browser string-to-Date/string-to-number conversion helpers.
- Public query pre-check for response limit.
- Clear closed-state copy on public form query errors.

## Files To Touch

Expected files:

- `apps/web/custom/components/forms/form-builder-page.tsx`
- `apps/web/custom/components/public-form/public-form-page.tsx`
- `packages/services/form/index.ts`

Optional only if needed:

- `packages/trpc/server/routes/form/model.ts`
- `packages/services/form/model.ts`
- `apps/web/hooks/api/form/index.ts`
- `docs/plan.md`

Do not touch unless a type/build check proves it is needed:

- DB schema/migrations.
- Submission service logic.
- Auth routes.
- Theme service.

## Implementation Order

Follow project order:

1. Confirm DB/service/tRPC groundwork.
2. Add service-level public response-limit pre-check if missing.
3. Add typed UI conversion helpers.
4. Add builder settings fields.
5. Add public closed-state UI.
6. Run type/build checks.
7. Run manual regression checks.

## Step 1: Confirm Existing Backend Types

Check these files before editing:

```txt
packages/database/models/form.ts
packages/services/form/model.ts
packages/trpc/server/routes/form/model.ts
packages/services/form-submission/index.ts
```

Confirm:

- `expiresAt` exists as nullable timestamp.
- `responseLimit` exists as nullable integer.
- `updateFormInputSchema` allows `expiresAt` and `responseLimit`.
- `getFormOutputSchema` includes both values.
- `submitPublicResponse` checks expiry and response limit before creating a submission.

Expected result:

- No DB migration needed.
- No new tRPC procedure needed.
- Use existing `useUpdateForm` hook.

Stop condition:

- If either field is missing from DB/schema, do not hack around it in UI. Add the proper DB/service/tRPC support first.

## Step 2: Add Public Response-Limit Pre-Check

File:

```txt
packages/services/form/index.ts
```

Current public form loading checks status and expiry. It should also reject forms that already reached `responseLimit` so the public page can show a closed state before the respondent fills the form.

Target behavior in `getPublicFormBySlug`:

- If missing or not published: throw existing not-found/unavailable error.
- If expired: throw `This form is closed`.
- If `responseLimit !== null` and submission count is greater than or equal to limit: throw `This form has reached its response limit`.
- Otherwise return `getFormById`.

Implementation notes:

- Select `responseLimit` along with `id`, `status`, and `expiresAt`.
- Count submissions from `formSubmissionsTable` where `formId` matches.
- Reuse the same message as `submitPublicResponse` for consistency.
- Keep this logic small and local.

Check:

- Public form query rejects closed-by-limit forms before rendering fields.
- Submission service remains the final enforcement layer for race conditions.

## Step 3: Add UI Conversion Helpers

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Add small helpers near existing settings schema/helpers.

Required helpers:

```ts
function dateToDateTimeLocalValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function dateTimeLocalValueToDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function responseLimitValueToNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
```

Rationale:

- `datetime-local` expects local datetime string without timezone.
- API expects `Date | null`.
- Response limit input is a string in React Hook Form but API expects `number | null`.

Type-safety rules:

- No `any`.
- No forced casts.
- Explicit return types for helpers.

Check:

- Existing forms with no expiry/limit reset to empty inputs.
- Existing forms with expiry reset to a valid `datetime-local` value.
- Existing response limit reset to string value.

## Step 4: Extend Builder Settings Schema

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Current `settingsSchema` includes:

- `title`
- `description`
- `slug`
- `visibility`
- `thankYouTitle`
- `thankYouMessage`

Add:

```ts
expiresAt: z.string().optional(),
responseLimit: z
  .string()
  .optional()
  .refine((value) => {
    if (!value?.trim()) return true;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0;
  }, "Use a positive whole number"),
```

Do not make expiry required.

Do not reject past dates in UI.

Reason:

- Past expiry is useful for manual demo/testing closed-state behavior.
- Backend remains source of truth.

Check:

- Empty response limit passes.
- `1` passes.
- `0`, `-1`, `1.5`, and text fail with form error.

## Step 5: Extend Settings Defaults And Reset

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Add default values:

```ts
expiresAt: "",
responseLimit: "",
```

When `ownerForm` loads, reset:

```ts
expiresAt: dateToDateTimeLocalValue(ownerForm.expiresAt),
responseLimit: ownerForm.responseLimit?.toString() ?? "",
```

Check:

- Builder load does not dirty the form incorrectly after reset.
- Clearing values and saving sends `null`.
- Reloading after save shows cleared inputs.

## Step 6: Save Expiry And Response Limit

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Update `onSaveSettings` so `updateFormAsync` includes:

```ts
expiresAt: dateTimeLocalValueToDate(values.expiresAt),
responseLimit: responseLimitValueToNumber(values.responseLimit),
```

Final payload should include:

- `formId`
- `title`
- `description`
- `thankYouTitle`
- `thankYouMessage`
- `expiresAt`
- `responseLimit`

Keep existing separate calls for:

- `updateSlugAsync`
- `updateVisibilityAsync`

Check:

- Saving title only still works.
- Saving expiry only works.
- Saving response limit only works.
- Saving both works.
- Saving slug/visibility still works.

## Step 7: Add Builder UI Fields

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Add inputs in Form settings near visibility/description or after thank-you fields.

Expiry input:

```tsx
<FormField
  control={settingsForm.control}
  name="expiresAt"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Expiry date and time</FormLabel>
      <FormControl>
        <Input {...field} type="datetime-local" disabled={lifecycleIsPending} />
      </FormControl>
      <p className="text-sm text-muted-foreground">
        Leave empty to keep this form open until unpublished.
      </p>
      <FormMessage />
    </FormItem>
  )}
/>
```

Response limit input:

```tsx
<FormField
  control={settingsForm.control}
  name="responseLimit"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Response limit</FormLabel>
      <FormControl>
        <Input {...field} type="number" min="1" step="1" inputMode="numeric" disabled={lifecycleIsPending} />
      </FormControl>
      <p className="text-sm text-muted-foreground">
        Leave empty for unlimited responses.
      </p>
      <FormMessage />
    </FormItem>
  )}
/>
```

Optional status hint:

- Show short copy below fields if expiry is set.
- Keep it simple; no countdown needed.

Check:

- UI fits desktop and mobile.
- Inputs disable while save/publish/theme assignment is pending.
- Form layout still looks balanced in the existing two-column grid.

## Step 8: Add Public Closed-State Copy

File:

```txt
apps/web/custom/components/public-form/public-form-page.tsx
```

Current public form error copy is generic:

```txt
This form is unavailable or has not been published.
```

Add helper:

```ts
function getPublicFormErrorMessage(message: string | undefined): string {
  if (message === "This form is closed") {
    return "This form is closed and is no longer accepting responses.";
  }

  if (message === "This form has reached its response limit") {
    return "This form has reached its response limit and is no longer accepting responses.";
  }

  return "This form is unavailable or has not been published.";
}
```

Use it in the `formError` branch.

Optional title helper:

```ts
function getPublicFormErrorTitle(message: string | undefined): string {
  if (message === "This form is closed") return "Form closed";
  if (message === "This form has reached its response limit") return "Response limit reached";
  return "Form unavailable";
}
```

If using title helper, import `AlertTitle` from `@/components/ui/alert`.

Check:

- Expired form shows closed copy.
- Response-limit reached form shows limit copy.
- Draft/unpublished/missing form still shows unavailable copy.

## Step 9: Optional Public Submit Error Copy

File:

```txt
apps/web/custom/components/public-form/public-form-page.tsx
```

Submission service already throws closed/limit errors. The current catch block toasts the raw message.

For better UX, reuse the same helper for submit errors:

```ts
const rawMessage = error instanceof Error ? error.message : undefined;
toast.error(getPublicFormErrorMessage(rawMessage));
```

This handles race conditions where the page loaded while open but became closed before submit.

Check:

- If response limit is reached between load and submit, toast is user-friendly.

## Step 10: Type Check

Run:

```bash
pnpm check-types
```

Pass criteria:

- No TypeScript errors.
- No unsafe casts added.
- `expiresAt` payload type is accepted by tRPC client.
- `responseLimit` payload type is accepted by tRPC client.

If failing:

- Fix types at source.
- Do not silence with `any` or double casts.

## Step 11: Build Check

Run:

```bash
pnpm build
```

Pass criteria:

- Web build succeeds.
- API/services packages build succeeds if included by workspace build.
- Route generation still includes existing routes.

Known unrelated issue:

- `pnpm lint` may remain blocked by existing ESLint config/warnings. Do not use lint as the blocker for this feature unless config has been fixed separately.

## Manual Verification Checklist

Use a published form with at least one field.

### Builder Settings

- Open `/dashboard/forms/[id]`.
- Existing settings load correctly.
- Expiry input is empty when no expiry is set.
- Response limit input is empty when no limit is set.
- Set future expiry and save.
- Reload builder and confirm future expiry persists.
- Clear expiry and save.
- Reload builder and confirm expiry is empty.
- Set response limit to `1` and save.
- Reload builder and confirm response limit persists.
- Clear response limit and save.
- Reload builder and confirm response limit is empty.

### Validation

- Response limit empty passes.
- Response limit `1` passes.
- Response limit `0` fails.
- Response limit `-1` fails.
- Response limit `1.5` fails.
- Response limit text fails.
- Past expiry can be saved for testing.

### Public Form: Future Expiry

- Set expiry to a future date/time.
- Publish form if needed.
- Open `/f/[slug]`.
- Form renders normally.
- Submit response works if response limit allows it.

### Public Form: Past Expiry

- Set expiry to a past date/time.
- Save settings.
- Open `/f/[slug]`.
- Form does not show fields.
- Page shows closed copy.
- Direct submission should also fail if attempted via stale tab.

### Public Form: Response Limit

- Clear expiry.
- Set response limit to the current submission count or lower.
- Save settings.
- Open `/f/[slug]`.
- Form does not show fields.
- Page shows response-limit reached copy.

### Public Form: Limit Race Condition

- Set response limit to current count + 1.
- Open public form in two tabs.
- Submit in first tab.
- Submit in second tab.
- First submit succeeds.
- Second submit shows friendly response-limit error toast.

### Clearing Rules Reopens Form

- Clear expiry.
- Clear response limit.
- Save settings.
- Open `/f/[slug]`.
- Form renders normally again if published.

### Existing Flow Regression

- Title save still works.
- Description save still works.
- Slug save still works.
- Visibility save still works.
- Thank-you title/message save still works.
- Theme assignment still works.
- Preview still works.
- Publish/unpublish still works.
- Copy link still works.
- Public submission still works when not closed.

## Edge Cases

### Empty Values

Expected:

- Empty expiry saves as `null`.
- Empty response limit saves as `null`.
- Public form remains open if published and not otherwise blocked.

### Invalid Date String

Expected:

- Helper returns `null` for invalid date.
- Browser `datetime-local` should prevent most invalid direct input.

### Time Zone

Expected:

- Builder input displays local date/time.
- Saved value is sent as a `Date`.
- Backend compares absolute time with `Date.now()`.

### Existing Response Count Above New Limit

Expected:

- If owner sets limit below existing response count, public form closes immediately.
- This is acceptable and useful.

### Draft Forms

Expected:

- Draft forms remain unavailable publicly regardless of expiry/limit values.

## Completion Criteria

Feature is complete when:

- Builder has expiry datetime input.
- Builder has response limit input.
- Both settings save through existing `updateForm`.
- Both settings can be cleared.
- Public form query blocks expired forms.
- Public form query blocks response-limit reached forms.
- Public UI shows distinct closed/limit/unavailable states.
- Submission mutation still enforces closed/limit rules.
- `pnpm check-types` passes.
- `pnpm build` passes.
- Manual verification checklist passes.

## Update After Completion

After implementation and verification, update:

```txt
docs/plan.md
```

Mark Form Expiry / Response Limit UI as completed in the bonus list and note that backend fields/checks existed while builder/public UI was added.
