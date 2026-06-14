# QR Code Form Sharing Plan

Goal: add a polished, low-risk QR sharing flow for published forms. The QR code should point to the existing public form URL: `/f/[slug]`.

This is a UI-only bonus feature. It should not change DB schema, services, tRPC procedures, public routing, or submission behavior.

## Dependency

Installed in the web app:

```bash
pnpm --filter web add qrcode
```

Reason:

- The first attempted `pnpm add qrcode` was blocked by pnpm workspace-root guard.
- The feature is used only by `apps/web`, so the dependency belongs in `apps/web/package.json`.
- `qrcode` can generate PNG data URLs directly, which makes download support simple.

## Scope

Add:

- QR code button for published forms in the builder.
- QR code dialog showing the public form URL.
- PNG download for the QR code.
- Copy link remains unchanged.
- Open public page remains unchanged.

Do not add:

- DB fields.
- tRPC procedures.
- Analytics/tracking.
- QR code for draft/unpublished forms.
- QR code on public form pages.
- Short-link generation.
- Dynamic redirect routes.

## Files To Touch

Expected:

- `apps/web/custom/components/forms/form-builder-page.tsx`
- `apps/web/package.json`
- `pnpm-lock.yaml`

Optional only if needed:

- `docs/plan.md`

Do not touch unless needed:

- `packages/services/**`
- `packages/trpc/**`
- `packages/database/**`
- public route files

## User Flow

For a published form:

1. Creator opens `/dashboard/forms/[id]`.
2. Creator sees existing actions:
   - Save settings
   - Preview
   - Unpublish
   - Copy link
   - Open public page
3. Creator also sees a new `QR code` button.
4. Clicking `QR code` opens a dialog.
5. Dialog displays:
   - QR code image.
   - Public URL.
   - Download PNG button.
   - Copy link button or reuse existing link copy behavior if simple.
6. Creator downloads `newform-[slug]-qr.png`.

For a draft/unpublished form:

- Hide QR button.
- Do not generate QR code.
- Existing publish flow stays unchanged.

## Implementation Order

1. Confirm dependency is in `apps/web/package.json`.
2. Add a typed import for `qrcode`.
3. Add QR dialog state to `FormBuilderPage`.
4. Generate public form URL from `window.location.origin` and `ownerForm.slug`.
5. Generate QR PNG data URL when dialog opens for a published form.
6. Render QR dialog.
7. Add download PNG action.
8. Add QR button near existing share actions.
9. Run type/build checks.
10. Run manual verification.

## Step 1: Confirm Dependency

Check:

```txt
apps/web/package.json
pnpm-lock.yaml
```

Expected:

- `qrcode` appears in `apps/web/package.json` dependencies.
- `pnpm-lock.yaml` contains the resolved package.

If TypeScript complains about missing types:

- First inspect whether `qrcode` ships types.
- If needed, add `@types/qrcode` to `apps/web` dev dependencies:

```bash
pnpm --filter web add -D @types/qrcode
```

Do not add custom ambient declarations unless package types are genuinely unavailable.

## Step 2: Add Imports

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Add:

```ts
import QRCode from "qrcode";
```

Existing imports likely already include:

- `Dialog`
- `Button`
- `Input`
- `Spinner`
- `CopyIcon`
- `ExternalLinkIcon`

Add icon if desired:

```ts
import { QrCodeIcon } from "lucide-react";
```

Keep icon usage optional. If importing, preserve existing icon import style.

## Step 3: Add QR State

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Inside `FormBuilderPage`, add state:

```ts
const [qrOpen, setQrOpen] = useState(false);
const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
const [qrError, setQrError] = useState<string | null>(null);
const [qrIsLoading, setQrIsLoading] = useState(false);
```

Reason:

- Dialog open state is separate from preview/field dialogs.
- QR generation is async.
- Errors should be local to QR dialog.

## Step 4: Add Share URL Helper

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Add helper inside component or as local function:

```ts
function getPublicShareUrl(slug: string): string {
  return `${window.location.origin}/f/${slug}`;
}
```

Use it in:

- `copyShareLink`
- QR generation
- QR dialog display

Important:

- Only call this in client-side event/effect paths where `window` exists.
- This component is already a client component.

## Step 5: Generate QR Data URL

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Add function:

```ts
async function openQrDialog() {
  if (!ownerForm?.slug || ownerForm.status !== "published") return;

  setQrOpen(true);
  setQrError(null);
  setQrIsLoading(true);

  try {
    const shareUrl = getPublicShareUrl(ownerForm.slug);
    const dataUrl = await QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });
    setQrDataUrl(dataUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate QR code";
    setQrError(message);
    toast.error(message);
  } finally {
    setQrIsLoading(false);
  }
}
```

Notes:

- Use `toDataURL` to get PNG-compatible image data.
- Keep colors high-contrast so scanners work reliably.
- Avoid theme-colored QR codes unless thoroughly tested.
- Do not generate QR for unpublished forms.

Optional optimization:

- If `qrDataUrl` already exists for the same slug, reuse it.
- Not necessary for hackathon; generation is fast.

## Step 6: Add Download Action

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Add:

```ts
function downloadQrCode() {
  if (!qrDataUrl || !ownerForm?.slug) return;

  const link = document.createElement("a");
  link.href = qrDataUrl;
  link.download = `newform-${ownerForm.slug}-qr.png`;
  link.click();
}
```

Check:

- File name is stable and readable.
- No object URL cleanup needed for data URL.

## Step 7: Add QR Button

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Current published-form share actions are near:

```tsx
{ownerForm.status === "published" ? (
  <Button type="button" variant="secondary" onClick={copyShareLink}>
    <CopyIcon />
    Copy link
  </Button>
) : null}
<Button asChild type="button" variant="ghost">
  <Link href={`/f/${ownerForm.slug}`} target="_blank">
    <ExternalLinkIcon />
    Open public page
  </Link>
</Button>
```

Add QR button only for published forms:

```tsx
{ownerForm.status === "published" ? (
  <Button type="button" variant="outline" onClick={openQrDialog}>
    <QrCodeIcon />
    QR code
  </Button>
) : null}
```

Placement:

- Put it next to `Copy link`.
- Keep `Open public page` available.

Check:

- Button does not appear for draft forms.
- Button appears after publishing.
- Button disappears after unpublishing.

## Step 8: Add QR Dialog Component

File:

```txt
apps/web/custom/components/forms/form-builder-page.tsx
```

Simplest approach:

- Add local component at bottom of file, similar to existing `FormPreviewDialog` and `FieldDialog`.

Component name:

```tsx
function QrCodeDialog(...) { ... }
```

Props:

```ts
type QrCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string | null;
  dataUrl: string | null;
  error: string | null;
  isLoading: boolean;
  onDownload: () => void;
  onCopy: () => Promise<void>;
};
```

Render states:

- Loading: spinner and `Generating QR code...`.
- Error: destructive alert with error message.
- Success: image preview, URL input/read-only text, download button.

Suggested markup:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Share with QR code</DialogTitle>
      <DialogDescription>
        Download or scan this code to open the public form.
      </DialogDescription>
    </DialogHeader>

    {isLoading ? (...loading...) : error ? (...alert...) : dataUrl ? (...success...) : null}

    <DialogFooter>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Close
      </Button>
      <Button type="button" disabled={!dataUrl} onClick={onDownload}>
        Download PNG
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Success state details:

- Use `<img src={dataUrl} alt="QR code for public form" />`.
- Use a bordered white box around QR code for scan reliability.
- Show the public URL in a read-only input or a small code-like block.
- Add a copy button if simple.

Accessibility:

- Use meaningful `alt` text.
- Dialog title must describe purpose.
- Buttons have clear text.

## Step 9: Reuse Copy Link Logic

Current `copyShareLink` can be reused.

Recommended change:

```ts
async function copyShareLink() {
  if (!ownerForm?.slug) return;
  await navigator.clipboard.writeText(getPublicShareUrl(ownerForm.slug));
  toast.success("Share link copied");
}
```

Pass `copyShareLink` into QR dialog as `onCopy` if the dialog includes a copy button.

Check:

- Existing copy link behavior remains unchanged.

## Step 10: Avoid SSR/Window Pitfalls

This component is client-only, but still avoid calling `window` during render.

Good:

- Call `getPublicShareUrl` inside click handlers.
- Store generated URL in state if needed.

Avoid:

```ts
const shareUrl = `${window.location.origin}/f/${ownerForm.slug}`;
```

directly in render unless guarded carefully.

Recommended state:

```ts
const [qrShareUrl, setQrShareUrl] = useState<string | null>(null);
```

When opening QR dialog:

```ts
const shareUrl = getPublicShareUrl(ownerForm.slug);
setQrShareUrl(shareUrl);
```

Then pass `qrShareUrl` to dialog.

## Step 11: Type Check

Run:

```bash
pnpm check-types
```

Pass criteria:

- No TypeScript errors.
- `qrcode` import resolves.
- No `any` added.
- No unsafe casts added.

If missing package types:

```bash
pnpm --filter web add -D @types/qrcode
pnpm check-types
```

## Step 12: Build Check

Run:

```bash
pnpm build
```

Pass criteria:

- Web build succeeds.
- Existing routes still build.
- No client/server boundary error from `qrcode` import.

If Next build complains about the package in client bundle:

- Prefer dynamic import inside `openQrDialog`:

```ts
const QRCode = await import("qrcode");
const dataUrl = await QRCode.toDataURL(shareUrl, options);
```

- This keeps the dependency loaded only when user opens QR dialog.

## Manual Verification Checklist

Use a form with at least one field.

### Draft Form

- Open `/dashboard/forms/[id]` for a draft form.
- QR code button is not visible.
- Copy link button is not visible if existing behavior hides it.
- Open public page button behavior remains unchanged.

### Published Form

- Publish the form.
- QR code button appears.
- Copy link button still appears.
- Open public page still appears.

### QR Dialog

- Click QR code button.
- Dialog opens.
- Loading state appears briefly or QR appears directly.
- QR image is visible.
- Public URL shown matches `${origin}/f/${slug}`.
- Close button closes dialog.
- Reopening dialog works.

### Download

- Click Download PNG.
- Browser downloads a `.png` file.
- File name follows `newform-[slug]-qr.png`.
- Downloaded QR image opens correctly.

### Scan Test

- Scan the QR code using phone camera or QR scanner.
- It opens `/f/[slug]`.
- Public form loads if published and not closed by expiry/response limit.
- If form is expired/limited, public closed-state appears as expected.

### Copy Link Regression

- Existing Copy link button still copies URL.
- Optional dialog copy button copies same URL.
- Toast still says link copied.

### Publish State Regression

- Unpublish the form.
- QR code button disappears.
- Public form route becomes unavailable as before.
- Publish again.
- QR code button returns.

## Edge Cases

### Slug Changes

Expected:

- If slug changes and settings are saved, next QR generation uses new slug.
- Previously downloaded QR image points to old URL and may stop working if old slug is not valid. This is acceptable.

### Unpublished Forms

Expected:

- QR generation is unavailable.
- No QR button is shown.

### Clipboard Failure

Expected:

- Existing copy link behavior may throw if clipboard is unavailable.
- Optional improvement: catch clipboard errors and toast a failure.
- Not required for QR feature if existing behavior is unchanged.

### QR Generation Failure

Expected:

- Dialog shows error state.
- Toast shows `Failed to generate QR code` or package error message.
- App does not crash.

### Expired Or Limited Forms

Expected:

- QR can still be generated for published forms, even if expiry/limit blocks public access.
- Scanning should land on the public closed state.
- Do not hide QR only because a form is expired/limited unless product requirements change.

## Completion Criteria

Feature is complete when:

- `qrcode` is installed in `apps/web`.
- Published forms show a QR code button in builder settings.
- Draft/unpublished forms do not show QR code button.
- QR dialog generates a QR image for `/f/[slug]`.
- QR dialog shows the public URL.
- QR PNG download works.
- Existing copy/open public link actions still work.
- `pnpm check-types` passes.
- `pnpm build` passes.
- Manual verification checklist passes.

## Update After Completion

After implementation and verification, update:

```txt
docs/plan.md
```

Mark QR code sharing as completed in the bonus section and note that it is UI-only, built on existing public slug URLs.
