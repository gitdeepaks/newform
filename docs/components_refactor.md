# Components Refactor Plan

Goal: keep all `apps/web/app/**/page.tsx` and `layout.tsx` files minimal by moving custom UI and helpers into a global custom layer:

```txt
apps/web/custom/components/
apps/web/custom/lib/
```

This refactor should happen before adding more bonus features like Form Expiry / Response Limit UI, because the builder page is already too large and future changes should land in focused components.

## Core Rules

- Keep route files minimal and route-focused.
- Use kebab-case for all custom component/helper file names.
- Use PascalCase for React component exports.
- Group custom components by domain under `apps/web/custom/components`.
- Group custom helpers by domain under `apps/web/custom/lib`.
- Preserve existing routes and behavior.
- Keep everything type-safe.
- Do not use `any`, `as any`, or `as unknown as`.
- Do not mix refactor with new feature logic in the same phase.
- Verify after each major phase.

## Final Target Structure

```txt
apps/web/custom/
  components/
    dashboard/
      dashboard-shell.tsx
      dashboard-page.tsx
      dashboard-hero.tsx
      dashboard-metric-cards.tsx
      dashboard-demo-chart.tsx
      recent-forms-table.tsx

    forms/
      forms-page.tsx
      forms-table.tsx
      forms-empty-state.tsx
      create-form-dialog.tsx
      form-builder-page.tsx
      form-builder-header.tsx
      form-settings-card.tsx
      form-theme-selector.tsx
      form-fields-card.tsx
      field-dialog.tsx
      form-analytics-card.tsx
      form-preview-dialog.tsx
      preview-field.tsx

    responses/
      responses-page.tsx
      responses-table.tsx
      responses-pagination.tsx
      responses-empty-state.tsx
      export-csv-button.tsx

    public-form/
      public-form-page.tsx
      public-form-card.tsx
      public-form-field.tsx
      public-form-thank-you.tsx
      public-form-unavailable.tsx
      legacy-form-redirect-page.tsx

    marketing/
      landing-page.tsx
      landing-hero.tsx
      landing-stats.tsx
      landing-flow-section.tsx
      landing-features-section.tsx
      landing-templates-preview.tsx
      landing-demo-cta.tsx
      pricing-page.tsx
      pricing-hero.tsx
      pricing-card.tsx
      pricing-faq.tsx
      templates-page.tsx
      template-card.tsx
      templates-empty-state.tsx

    auth/
      login-form.tsx
      signup-form.tsx
      social-auth-buttons.tsx
      password-field.tsx

  lib/
    dashboard/
      dashboard-formatting.ts
      dashboard-demo-data.ts

    forms/
      field-config.ts
      field-options.ts
      field-validation.ts
      form-settings-schema.ts
      form-settings-dates.ts
      form-preview-utils.ts
      create-form-schema.ts

    responses/
      response-formatting.ts

    public-form/
      public-answer-utils.ts
      public-form-theme.ts

    marketing/
      landing-content.ts
      pricing-content.ts
```

## Route File Target

After refactor, `apps/web/app` should mostly contain routing only:

```txt
apps/web/app/
  page.tsx
  pricing/page.tsx
  templates/page.tsx
  dashboard/page.tsx
  dashboard/forms/page.tsx
  dashboard/forms/[id]/page.tsx
  dashboard/forms/[id]/submissions/page.tsx
  f/[slug]/page.tsx
  form/[form_id]/page.tsx
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  layout.tsx
```

Example page after refactor:

```tsx
import { LandingPage } from "@/custom/components/marketing/landing-page";

export default function Home() {
  return <LandingPage />;
}
```

Example dynamic client page after refactor:

```tsx
"use client";

import { use } from "react";
import { FormBuilderPage } from "@/custom/components/forms/form-builder-page";

type FormBuilderPageProps = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: FormBuilderPageProps) {
  const { id } = use(params);
  return <FormBuilderPage formId={id} />;
}
```

## Type-Safety Standards

Mandatory:

- No `any`.
- No `as any`.
- No `as unknown as`.
- No forced casts to silence TypeScript.
- Use Zod for form schemas and parsing helpers.
- Use explicit helper return types for conversions.
- Keep props narrow and domain-specific.
- Use `import type` for types.
- Prefer `React.CSSProperties` variables over inline style casts.

Good examples:

```ts
export function dateTimeLocalToDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function responseLimitToNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
```

Bad examples:

```ts
const data = value as any;
const form = unknownValue as unknown as Form;
```

## Current Page Size Snapshot

| File | Approx Lines | Priority |
|---|---:|---|
| `apps/web/app/dashboard/forms/[id]/page.tsx` | 1336 | Highest |
| `apps/web/app/dashboard/forms/page.tsx` | 285 | High |
| `apps/web/app/f/[slug]/page.tsx` | 277 | High |
| `apps/web/app/dashboard/page.tsx` | 231 | Medium |
| `apps/web/app/dashboard/forms/[id]/submissions/page.tsx` | 220 | Medium |
| `apps/web/app/page.tsx` | 202 | Medium |
| `apps/web/app/pricing/page.tsx` | 112 | Low |
| `apps/web/app/templates/page.tsx` | 83 | Low |
| `apps/web/app/form/[form_id]/page.tsx` | 61 | Low |
| `apps/web/app/(auth)/login/page.tsx` | 14 | Already thin |
| `apps/web/app/(auth)/signup/page.tsx` | 22 | Already thin |
| `apps/web/app/layout.tsx` | 32 | Already thin |

Target:

- Most `page.tsx` files should be `5-20` lines.
- `layout.tsx` should stay simple and only handle metadata/fonts/global providers.

## Phase 1: Create Custom Folders And Dashboard Shell

Create:

```txt
apps/web/custom/components/dashboard/dashboard-shell.tsx
```

Responsibilities:

- Render `AuthGate`.
- Render `SidebarProvider`.
- Render `AppSidebar`.
- Render `SidebarInset`.
- Render `SiteHeader`.
- Render `children`.

Use this shell in:

- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/forms/page.tsx`
- `apps/web/app/dashboard/forms/[id]/page.tsx`
- `apps/web/app/dashboard/forms/[id]/submissions/page.tsx`

Suggested implementation style:

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGate } from "@/components/auth/auth-gate";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const dashboardShellStyle: CSSProperties = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
};

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate mode="auth">
      <SidebarProvider style={dashboardShellStyle}>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
```

If TypeScript rejects CSS custom properties on `CSSProperties`, use a typed helper with a local custom type, not `any`:

```ts
type DashboardShellStyle = CSSProperties & {
  "--sidebar-width": string;
  "--header-height": string;
};
```

## Phase 2: Extract Form Builder First

Largest file:

```txt
apps/web/app/dashboard/forms/[id]/page.tsx
```

Move implementation into:

```txt
apps/web/custom/components/forms/
  form-builder-page.tsx
  form-builder-header.tsx
  form-settings-card.tsx
  form-theme-selector.tsx
  form-fields-card.tsx
  field-dialog.tsx
  form-analytics-card.tsx
  form-preview-dialog.tsx
  preview-field.tsx

apps/web/custom/lib/forms/
  field-config.ts
  field-options.ts
  field-validation.ts
  form-settings-schema.ts
  form-settings-dates.ts
  form-preview-utils.ts
```

### `field-config.ts`

Move:

- `fieldTypes`
- `FieldType`
- `optionFieldTypes`
- `formatFieldType`

### `field-options.ts`

Move:

- `FieldOption`
- `slugifyOption`
- `parseOptions`
- `optionsToText`

### `field-validation.ts`

Move:

- `FieldValidation`
- `optionalNumber`
- `buildValidation`
- `validationToFieldValues`

### `form-settings-schema.ts`

Move:

- `settingsSchema`
- `SettingsValues`

Later add expiry/response-limit fields here.

### `field-dialog.tsx`

Move field create/edit dialog.

Props should use `UseFormReturn<FieldValues>` from `react-hook-form`.

### `form-settings-card.tsx`

Responsibilities:

- title
- slug
- visibility
- description
- thank-you title/message
- save/preview/publish/unpublish/copy/open actions
- later expiry/response-limit fields

### `form-theme-selector.tsx`

Responsibilities:

- theme section
- theme swatches
- selected state
- assign callback

### `form-fields-card.tsx`

Responsibilities:

- fields table
- field empty state
- create/edit/delete controls

### `form-analytics-card.tsx`

Responsibilities:

- analytics loading state
- field breakdown
- empty state

### `form-preview-dialog.tsx` and `preview-field.tsx`

Move preview modal implementation.

Keep it disabled/read-only. Do not introduce submission behavior.

### `form-builder-page.tsx`

Responsibilities:

- Own hooks.
- Own page state.
- Own submit handlers.
- Compose the extracted cards/dialogs.

Final route file:

```tsx
"use client";

import { use } from "react";
import { FormBuilderPage } from "@/custom/components/forms/form-builder-page";

type FormBuilderRouteProps = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: FormBuilderRouteProps) {
  const { id } = use(params);
  return <FormBuilderPage formId={id} />;
}
```

## Phase 3: Extract Public Form Renderer

Current:

```txt
apps/web/app/f/[slug]/page.tsx
```

Move into:

```txt
apps/web/custom/components/public-form/
  public-form-page.tsx
  public-form-card.tsx
  public-form-field.tsx
  public-form-thank-you.tsx
  public-form-unavailable.tsx

apps/web/custom/lib/public-form/
  public-answer-utils.ts
  public-form-theme.ts
```

### `public-answer-utils.ts`

Move:

- `PublicAnswer`
- `PublicAnswers`
- `getStringAnswer`
- `getArrayAnswer`
- `serializeAnswer`
- `isMissingRequiredAnswer`

### `public-form-theme.ts`

Move:

- page style generation
- card style generation
- muted style generation
- accent style generation

Use typed style objects.

### `public-form-field.tsx`

Responsibilities:

- Render all public field types.
- Receive answer state and callbacks.
- Respect disabled state during submission.

### `public-form-page.tsx`

Responsibilities:

- Own `usePublicForm` and `useSubmitPublicResponse`.
- Own answer state.
- Own submit handler.
- Compose unavailable/thank-you/card/field components.

Final route file:

```tsx
"use client";

import { use } from "react";
import { PublicFormPage } from "@/custom/components/public-form/public-form-page";

type PublicSlugRouteProps = {
  params: Promise<{ slug: string }>;
};

export default function Page({ params }: PublicSlugRouteProps) {
  const { slug } = use(params);
  return <PublicFormPage slug={slug} />;
}
```

## Phase 4: Extract Forms List Page

Current:

```txt
apps/web/app/dashboard/forms/page.tsx
```

Move into:

```txt
apps/web/custom/components/forms/
  forms-page.tsx
  forms-table.tsx
  forms-empty-state.tsx
  create-form-dialog.tsx

apps/web/custom/lib/forms/
  create-form-schema.ts
```

### `create-form-schema.ts`

Move:

- `createFormSchema`
- `CreateFormValues`

### `forms-page.tsx`

Responsibilities:

- Own `useForms` and `useCreateForm`.
- Own create dialog state.
- Compose table and dialog.

### `forms-table.tsx`

Responsibilities:

- Render table rows.
- Render loading/error/empty states or delegate empty state.
- Copy share link callback.

Final route file:

```tsx
import { FormsPage } from "@/custom/components/forms/forms-page";

export default function Page() {
  return <FormsPage />;
}
```

## Phase 5: Extract Responses Page

Current:

```txt
apps/web/app/dashboard/forms/[id]/submissions/page.tsx
```

Move into:

```txt
apps/web/custom/components/responses/
  responses-page.tsx
  responses-table.tsx
  responses-pagination.tsx
  responses-empty-state.tsx
  export-csv-button.tsx

apps/web/custom/lib/responses/
  response-formatting.ts
```

### `response-formatting.ts`

Move and improve:

- `parseStringArray`
- `getOptionLabel`
- `formatValue`

Replace custom object parser with Zod:

```ts
const stringArraySchema = z.array(z.string());

export function parseStringArray(value: string): string[] {
  try {
    return stringArraySchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
}
```

### `export-csv-button.tsx`

Responsibilities:

- Use `useExportResponsesCsv`.
- Create blob.
- Download CSV.
- Show toast error.

Final route file:

```tsx
"use client";

import { use } from "react";
import { ResponsesPage } from "@/custom/components/responses/responses-page";

type ResponsesRouteProps = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: ResponsesRouteProps) {
  const { id } = use(params);
  return <ResponsesPage formId={id} />;
}
```

## Phase 6: Extract Dashboard Home

Current:

```txt
apps/web/app/dashboard/page.tsx
```

Move into:

```txt
apps/web/custom/components/dashboard/
  dashboard-page.tsx
  dashboard-hero.tsx
  dashboard-metric-cards.tsx
  dashboard-demo-chart.tsx
  recent-forms-table.tsx

apps/web/custom/lib/dashboard/
  dashboard-formatting.ts
  dashboard-demo-data.ts
```

Move:

- `chartBars` to `dashboard-demo-data.ts`.
- `formatRelativeDate` to `dashboard-formatting.ts`.

Final route file:

```tsx
import { DashboardPage } from "@/custom/components/dashboard/dashboard-page";

export default function Page() {
  return <DashboardPage />;
}
```

## Phase 7: Extract Marketing Pages

### Landing

Current:

```txt
apps/web/app/page.tsx
```

Move into:

```txt
apps/web/custom/components/marketing/
  landing-page.tsx
  landing-hero.tsx
  landing-stats.tsx
  landing-flow-section.tsx
  landing-features-section.tsx
  landing-templates-preview.tsx
  landing-demo-cta.tsx

apps/web/custom/lib/marketing/
  landing-content.ts
```

Move content arrays:

- `stats`
- `flow`
- `templates`
- `features`

Final route file:

```tsx
import { LandingPage } from "@/custom/components/marketing/landing-page";

export default function Home() {
  return <LandingPage />;
}
```

### Pricing

Current:

```txt
apps/web/app/pricing/page.tsx
```

Move into:

```txt
apps/web/custom/components/marketing/
  pricing-page.tsx
  pricing-hero.tsx
  pricing-card.tsx
  pricing-faq.tsx

apps/web/custom/lib/marketing/
  pricing-content.ts
```

Move:

- `plans`
- `faqs`

Final route file:

```tsx
import { PricingPage } from "@/custom/components/marketing/pricing-page";

export default function Page() {
  return <PricingPage />;
}
```

### Templates

Current:

```txt
apps/web/app/templates/page.tsx
```

Move into:

```txt
apps/web/custom/components/marketing/
  templates-page.tsx
  template-card.tsx
  templates-empty-state.tsx
```

Final route file:

```tsx
import { TemplatesPage } from "@/custom/components/marketing/templates-page";

export default function Page() {
  return <TemplatesPage />;
}
```

## Phase 8: Move Auth Components Into Custom Folder

Current:

```txt
apps/web/components/login-form.tsx
apps/web/components/signup-form.tsx
```

Move into:

```txt
apps/web/custom/components/auth/
  login-form.tsx
  signup-form.tsx
  social-auth-buttons.tsx
  password-field.tsx
```

Update imports:

- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`

Keep shared UI primitives in:

```txt
apps/web/components/ui/
```

Do not move shadcn/ui primitives into `custom`.

## Phase 9: Extract Legacy Redirect Page

Current:

```txt
apps/web/app/form/[form_id]/page.tsx
```

Move into:

```txt
apps/web/custom/components/public-form/
  legacy-form-redirect-page.tsx
```

Final route file:

```tsx
"use client";

import { use } from "react";
import { LegacyFormRedirectPage } from "@/custom/components/public-form/legacy-form-redirect-page";

type LegacyFormRouteProps = {
  params: Promise<{ form_id: string }>;
};

export default function Page({ params }: LegacyFormRouteProps) {
  const { form_id } = use(params);
  return <LegacyFormRedirectPage formId={form_id} />;
}
```

## Expiry / Response Limit After Refactor

After Phase 2, implement the next bonus in:

```txt
apps/web/custom/components/forms/form-settings-card.tsx
apps/web/custom/lib/forms/form-settings-schema.ts
apps/web/custom/lib/forms/form-settings-dates.ts
```

Add:

- `expiresAt` field.
- `responseLimit` field.
- date conversion helpers.
- response-limit conversion helper.

This keeps the bonus out of route files and inside the form settings domain.

## Verification Strategy

Run after every phase:

```bash
pnpm check-types
```

Run after major milestones:

```bash
pnpm build
```

Recommended verification milestones:

1. After creating custom folders and dashboard shell.
2. After extracting form builder page.
3. After extracting public form page.
4. After extracting forms list and responses pages.
5. After extracting dashboard home.
6. After extracting marketing pages.
7. After moving auth components.

## Manual Regression Checklist

Verify after refactor:

- `/` loads.
- `/pricing` loads.
- `/templates` loads and lists only public published forms.
- `/login` loads.
- `/signup` loads.
- OAuth buttons show with correct configured/disabled states.
- Email/password login works.
- Sidebar logout works.
- `/dashboard` loads after login.
- `/dashboard/forms` loads.
- Create form works.
- `/dashboard/forms/[id]` loads.
- Field create works.
- Field edit works.
- Field delete works.
- Theme assignment works.
- Preview dialog works.
- Settings save works.
- Publish/unpublish works.
- Copy public link works.
- `/f/[slug]` loads.
- Public submission works.
- `/dashboard/forms/[id]/submissions` loads.
- Pagination works.
- CSV export downloads.
- `/form/[form_id]` redirects safely and does not expose fields.

## Anti-Regression Rules

- Do not change service contracts.
- Do not change tRPC schemas.
- Do not rename routes.
- Do not change public URLs.
- Do not change DB schema.
- Do not change response submission behavior.
- Do not combine this refactor with expiry/response-limit in the same phase.
- Keep one phase small enough to verify before continuing.

## Suggested Execution Order

1. Create `apps/web/custom/components` and `apps/web/custom/lib` domain folders.
2. Create `custom/components/dashboard/dashboard-shell.tsx`.
3. Update dashboard pages to use `DashboardShell`.
4. Extract `dashboard/forms/[id]/page.tsx` into `custom/components/forms` and `custom/lib/forms`.
5. Run `pnpm check-types` and `pnpm build`.
6. Extract public form page into `custom/components/public-form` and `custom/lib/public-form`.
7. Extract forms list and responses pages.
8. Run `pnpm check-types` and `pnpm build`.
9. Extract dashboard home.
10. Extract landing, pricing, and templates pages.
11. Move auth forms into `custom/components/auth`.
12. Extract legacy redirect page.
13. Run final `pnpm check-types` and `pnpm build`.
14. Then implement expiry/response-limit bonus.

## Completion Criteria

Refactor is complete when:

- All major `page.tsx` files are thin route wrappers.
- Custom UI lives under `apps/web/custom/components`.
- Custom helper logic lives under `apps/web/custom/lib`.
- Domain folders are used instead of flat dumping all files.
- File names are kebab-case.
- Component exports are PascalCase.
- Shared dashboard shell duplication is removed.
- Form builder page is split into focused components.
- Public form renderer is split into focused components.
- Responses formatting helpers use Zod instead of custom parser object.
- `pnpm check-types` passes.
- `pnpm build` passes.
- Manual regression checklist passes.
