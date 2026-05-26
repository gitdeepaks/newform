# Bonus Plan: Form Preview Before Publishing

Goal: let creators preview the respondent experience from the builder before publishing or sharing the form.

This is the recommended first bonus because it has high demo value, low implementation risk, and should not require DB/service/tRPC changes.

## Product Value

Current builder flow:

- Creator edits settings and fields.
- Creator publishes the form.
- Creator opens `/f/[slug]` to see the public view.

Improved flow:

- Creator edits settings and fields.
- Creator clicks `Preview` inside the builder.
- Creator sees a public-form-like modal/drawer using the same saved form data.
- Creator can verify title, description, theme, required marks, and field controls before publishing.

Demo line:

`Before publishing, creators can preview exactly how respondents will experience the form.`

## Scope

Included:

- Add a `Preview` button to the form builder page.
- Open a modal/dialog with public-form-like rendering.
- Show assigned theme tokens if a theme exists.
- Show form title and description.
- Show all current fields in order.
- Show required marks.
- Render controls for all supported field types.
- Keep all preview controls disabled/read-only.
- Show a disabled submit button.
- Work for draft and published forms.

Not included:

- No DB migration.
- No new service method.
- No new tRPC procedure.
- No new hook.
- No real submission from preview.
- No unsaved draft preview. Preview should reflect saved builder data currently loaded by hooks.
- No separate preview route.

## Implementation Order

Since this bonus is UI-only, the usual backend order does not apply.

Implementation order:

1. Inspect current builder page types and UI imports.
2. Add preview open state.
3. Add `Preview` button in builder actions/settings area.
4. Add preview dialog component in the same file.
5. Add field rendering helper/component for preview fields.
6. Run type/build verification.

## Primary File

Expected file to modify:

- `apps/web/app/dashboard/forms/[id]/page.tsx`

Optional files only if needed:

- `apps/web/components/form-preview-dialog.tsx`

Recommendation:

- Keep it in `apps/web/app/dashboard/forms/[id]/page.tsx` first.
- Extract only if the page becomes too large or repeated logic becomes hard to read.

## Data Source

Use existing typed data already loaded by builder page:

- `ownerForm` from `useOwnerForm(id)`
- `fields` from `useFields(id)`
- `ownerForm.theme?.tokens`

Important:

- Do not fetch public form separately.
- Do not call `/f/[slug]` APIs.
- Do not use raw IDs for public access.
- Do not mutate field/form state from preview.

## Type-Safety Requirements

Mandatory:

- Do not use `any`.
- Do not use unsafe casting like `as any`, `as unknown as`, or broad forced casts.
- Use existing hook return types to infer field/form shape.
- Keep preview helper props typed from existing data.
- Use discriminated checks on `field.type` instead of casting.

Recommended type aliases inside builder page:

```ts
type OwnerForm = NonNullable<ReturnType<typeof useOwnerForm>["form"]>;
type BuilderField = NonNullable<ReturnType<typeof useFields>["fields"]>[number];
type ThemeTokens = NonNullable<OwnerForm["theme"]>["tokens"];
```

If `ReturnType<typeof useOwnerForm>` causes issues because the hook requires an argument in its type context, prefer deriving from actual local values through helper component props:

```ts
function FormPreviewDialog({
  form,
  fields,
}: {
  form: NonNullable<typeof ownerForm>;
  fields: NonNullable<typeof fields>;
}) {
  ...
}
```

If local `typeof ownerForm` cannot be referenced cleanly outside the component, define preview component inside the page file after the page component using structural props:

```ts
type PreviewForm = {
  title: string;
  description: string | null;
  theme?: {
    tokens: {
      background: string;
      card: string;
      text: string;
      mutedText: string;
      accent: string;
      accentText: string;
      border: string;
    };
  } | null;
};
```

Use structural typing only if it matches existing data exactly. Do not widen field values unnecessarily.

## UI Placement

Add `Preview` button near existing form lifecycle actions.

Preferred locations:

- In settings card action row, next to `Save settings`, `Publish`, `Unpublish`, `Open public page`, `Copy link`.
- Or in the builder page top action area if one exists.

Recommended button behavior:

- Always enabled when `ownerForm` exists.
- Disabled while owner form or fields are loading.
- Opens preview even if form is draft.
- Shows latest saved data only.

Button label:

```txt
Preview
```

Optional helper text:

```txt
Preview uses the latest saved fields and settings.
```

## Dialog Design

Use existing UI primitives:

- `Dialog`
- `DialogContent`
- `DialogHeader`
- `DialogTitle`
- `DialogDescription`
- `Button`
- `Input`
- `Textarea`
- `NativeSelect`
- `Switch`
- `Card`
- `Label`

Dialog title:

```txt
Preview form
```

Dialog description:

```txt
This is how respondents will see your saved form.
```

Dialog size:

- Use a wide modal if existing dialog supports it.
- Example class: `sm:max-w-2xl` or `max-w-3xl` if the component accepts `className`.

If the existing DialogContent is too narrow:

- Still keep implementation simple.
- Use the default width and scroll content.

Dialog body:

- Center a public-form-like card.
- Apply theme styles if available.
- Use `max-h-[70vh] overflow-y-auto` for long forms.

## Theme Styling

Use `ownerForm.theme?.tokens`.

If theme exists:

- Preview outer panel background: `theme.background`.
- Preview card background: `theme.card`.
- Preview card border: `theme.border`.
- Text: `theme.text`.
- Muted text: `theme.mutedText`.
- Disabled submit button: `theme.accent` and `theme.accentText`, with opacity.

If no theme:

- Use existing app card/background styles.

Example style objects:

```ts
const previewShellStyle = theme
  ? { backgroundColor: theme.background, color: theme.text }
  : undefined;

const previewCardStyle = theme
  ? { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }
  : undefined;

const mutedStyle = theme ? { color: theme.mutedText } : undefined;

const accentStyle = theme
  ? { backgroundColor: theme.accent, color: theme.accentText }
  : undefined;
```

Type-safety note:

- Let TypeScript infer these objects.
- If explicit typing is needed, use `React.CSSProperties`, not unsafe casts.

## Field Rendering Requirements

Supported types:

- `SHORT_TEXT`
- `LONG_TEXT`
- `EMAIL`
- `NUMBER`
- `SINGLE_SELECT`
- `MULTI_SELECT`
- `CHECKBOX`
- `RATING`
- `DATE`

Every preview field should show:

- Label.
- Required mark if `field.isRequired`.
- Description if present.
- Placeholder where relevant.
- Disabled/read-only input control.

## Field Type Rendering Details

### SHORT_TEXT

Render:

- Disabled `Input`.
- Type: `text`.
- Placeholder: `field.placeholder ?? "Short answer"`.

### LONG_TEXT

Render:

- Disabled `Textarea`.
- Placeholder: `field.placeholder ?? "Long answer"`.

### EMAIL

Render:

- Disabled `Input`.
- Type: `email`.
- Placeholder: `field.placeholder ?? "name@example.com"`.

### NUMBER

Render:

- Disabled `Input`.
- Type: `number`.
- Placeholder: `field.placeholder ?? "0"`.

### DATE

Render:

- Disabled `Input`.
- Type: `date`.

### SINGLE_SELECT

Render:

- Disabled `NativeSelect`.
- First option: `Select an option`.
- Show configured options.
- If no options, show one disabled option: `No options configured`.

### MULTI_SELECT

Render:

- Disabled checkbox list inside bordered box.
- Show each configured option.
- If no options, show muted text: `No options configured`.

### CHECKBOX

Two cases:

1. If `field.options?.length` exists:
   - Render disabled checkbox list, same as multi-select.
2. If no options:
   - Render disabled `Switch` or disabled checkbox confirmation row.

### RATING

Render:

- Disabled row of buttons or pills from `1` to `field.validation?.ratingMax ?? 5`.
- No selected value.
- Button style should be outline/disabled.

## Preview Submit Button

Render disabled button:

```txt
Submit response
```

Requirements:

- `type="button"`.
- `disabled`.
- No `onClick`.
- No form submit wrapper needed.

Add helper text:

```txt
Preview mode only. No response will be submitted.
```

## Empty State

If form has no fields:

Show inside preview:

```txt
No fields yet. Add fields to preview the respondent experience.
```

Still show title/theme so creator sees page shell.

## State Management

Inside builder page:

```ts
const [previewOpen, setPreviewOpen] = useState(false);
```

Preview dialog usage:

```tsx
{ownerForm ? (
  <FormPreviewDialog
    open={previewOpen}
    onOpenChange={setPreviewOpen}
    form={ownerForm}
    fields={fields ?? []}
  />
) : null}
```

Type-safety note:

- If `fields ?? []` causes type widening, define a local typed constant inside component:

```ts
const previewFields = fields ?? [];
```

If TypeScript widens `[]` too much, pass only when fields exists:

```tsx
{ownerForm && fields ? (
  <FormPreviewDialog ... fields={fields} />
) : null}
```

Recommended:

- Render dialog only when both `ownerForm` and `fields` are available.
- Disable Preview button while fields are loading.

## Suggested Component Shape

Within `apps/web/app/dashboard/forms/[id]/page.tsx`:

```tsx
function FormPreviewDialog({
  open,
  onOpenChange,
  form,
  fields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PreviewForm;
  fields: PreviewField[];
}) {
  ...
}
```

Suggested helper:

```tsx
function PreviewField({ field, mutedStyle }: { field: PreviewField; mutedStyle?: React.CSSProperties }) {
  ...
}
```

Avoid:

- Duplicating too much public form submission logic.
- Managing answer state.
- Form submit handlers.

## Acceptance Criteria

Feature is done when:

- Builder page has a visible `Preview` button.
- Preview opens for draft forms.
- Preview opens for published forms.
- Preview displays saved title and description.
- Preview displays assigned theme styling.
- Preview renders every field type.
- Required fields show `*`.
- All controls are disabled/read-only.
- Submit button is disabled and does not submit.
- Empty form preview has graceful empty state.
- Preview works on mobile width.
- Existing builder save/publish/share flows still work.

## Verification Steps

Run:

```bash
pnpm check-types
```

Expected:

- TypeScript passes.

Run:

```bash
pnpm build
```

Expected:

- Next build passes.

Manual verification:

1. Log in with demo user.
2. Open `/dashboard/forms`.
3. Open a draft form.
4. Click `Preview`.
5. Confirm preview opens even though form is not published.
6. Confirm no public slug is required.
7. Add fields:
   - short text
   - long text
   - email
   - number
   - single select
   - multi select
   - checkbox
   - rating
   - date
8. Save fields.
9. Open preview again.
10. Confirm all field types render.
11. Assign a theme.
12. Open preview.
13. Confirm theme colors apply.
14. Try clicking controls.
15. Expected: controls are disabled or have no effect.
16. Try clicking submit.
17. Expected: disabled, no response created.
18. Publish form.
19. Open preview again.
20. Open `/f/[slug]`.
21. Confirm preview and public form are visually consistent.

Regression checks:

- Saving settings still works.
- Publishing/unpublishing still works.
- Copy share link still works.
- Field create/edit/delete still works.
- `/f/[slug]` public submission still works.
- Responses page still works.

## Update Plan After Implementation

After verification, update:

- `docs/plan.md`

Change bonus item:

```md
2. Form preview before publishing.
```

to:

```md
2. Form preview before publishing - Completed.
```

Add completed file:

- `apps/web/app/dashboard/forms/[id]/page.tsx`

Add verification results:

- `pnpm check-types` passed.
- `pnpm build` passed.

## Risk Notes

Main risk:

- Builder page is already large. Keep preview code simple and avoid refactors.

Mitigation:

- Add small local helper components.
- Do not touch public submission logic.
- Do not introduce new state except `previewOpen`.

Secondary risk:

- Preview may drift from `/f/[slug]` renderer over time.

Mitigation:

- Render controls with the same field-type branches as public form, but disable all interaction.
- Keep copy clear: `saved form preview`, not live unsaved editor preview.
