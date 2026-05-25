# UI Revamp Plan: Landing, Pricing, Dashboard Flow

Priority 6 first slice.

Focus:

- Landing page `/`.
- Pricing page `/pricing`.
- Dashboard/sidebar UX cleanup.

Brand name:

`Newform`

This plan intentionally does not include deployment, README polish, or Scalar docs cleanup. Those will come after the landing/pricing/dashboard flow is stable.

## Why This Revamp

Current state:

- `/` is still a server health placeholder.
- `/pricing` does not exist yet.
- Dashboard still has shadcn starter placeholders like `Documents`, `Acme Inc.`, fake GitHub link, fake charts/table, and fake user data.
- Sidebar primitives in `apps/web/components/ui/sidebar.tsx` are fine, but the app-level sidebar content has unnecessary placeholder items.
- The product flow works, but the user experience does not clearly guide a judge or new user from landing -> signup/login -> dashboard -> create form -> publish -> responses/analytics.

Goal:

- Make Newform feel like a polished product.
- Give judges a clear path to understand and test the app quickly.
- Keep the implementation small and safe.
- Preserve all existing form builder, public form, templates, seed, responses, analytics, and CSV functionality.

## Visual Direction

Design system name:

`Desert Ink Safari`

Visual mix:

- Rajasthan warmth: parchment backgrounds, palace arches, terracotta, marigold, handcrafted borders.
- Chinese discipline: calm whitespace, ink-like typography rhythm, precise layout, minimal decoration.
- African wildlife safari mood: cinematic dark sections, warm sun, dramatic editorial contrast.

Important rule:

- Do not make the UI look like a noisy culture collage.
- Use cultural inspiration through color, composition, shapes, and atmosphere.
- Avoid literal overloaded icons or too many motifs.

## Palette

Recommended colors:

```txt
Parchment:       #f7efe2
Warm Surface:    #fff9ef
Ink:             #211813
Muted Ink:       #76685c
Terracotta:      #c94b32
Deep Terracotta: #9f2f23
Marigold:        #f0a12b
Jade:            #1f9d8a
Safari Dark:     #101816
Safari Muted:    #d9c7aa
Border Sand:     #e4d5bd
```

Usage:

- Landing background: parchment.
- Primary CTA: terracotta/deep terracotta.
- Secondary accent: jade.
- Highlight badges: marigold/terracotta.
- Feature contrast section: safari dark.
- Cards: warm surface with sand border.

## Typography Direction

Use existing font setup for speed.

Style through Tailwind:

- Big, high-contrast headings.
- Tight tracking for hero headline.
- Serif-like editorial feeling can be approximated with `font-serif` if available through browser fallback.
- Keep body text clean and readable.

No new font dependency unless absolutely necessary.

## Motifs And Layout Details

Use these sparingly:

- Large soft sun circle behind hero card.
- Palace arch shapes through rounded top cards or pseudo-arch blocks.
- Dot-grid or grain texture using CSS background radial gradients.
- Thin decorative borders.
- Safari dark band for features or final CTA.
- Ink-line dividers.

Avoid:

- Heavy image assets.
- Complex SVG illustrations.
- Too many animations.
- Non-functional decorative components that risk responsive issues.

## Scope

Included:

- Replace home page with Newform landing page.
- Add pricing page.
- Improve dashboard homepage flow.
- Simplify app sidebar content.
- Simplify top dashboard header.
- Keep `/templates` route and link to it.
- Keep login/signup routes and link to them.
- Verify desktop/mobile responsiveness.

Not included:

- Payment flow.
- Real billing.
- New DB tables.
- New tRPC procedures.
- Auth refactor.
- README update.
- Deployment work.
- Full public templates redesign unless needed for visual consistency.

## Files To Touch

Expected files:

- `apps/web/app/page.tsx`
- `apps/web/app/pricing/page.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/components/app-sidebar.tsx`
- `apps/web/components/nav-main.tsx`
- `apps/web/components/nav-user.tsx`
- `apps/web/components/site-header.tsx`

Optional files if needed:

- `apps/web/app/templates/page.tsx`
- `apps/web/app/globals.css`

Avoid touching unless required:

- `apps/web/components/ui/sidebar.tsx`

Reason:

- `ui/sidebar.tsx` is the reusable shadcn primitive. The unnecessary product items are not there; they are in `app-sidebar.tsx`, `nav-main.tsx`, `nav-user.tsx`, and `site-header.tsx`.

## Product Navigation

Public nav on landing/pricing:

- Brand: `Newform`
- Templates -> `/templates`
- Pricing -> `/pricing`
- Log in -> `/login`
- Sign up -> `/signup`

Dashboard sidebar nav:

- Dashboard -> `/dashboard`
- Forms -> `/dashboard/forms`
- Templates -> `/templates`
- Pricing -> `/pricing`

Optional later:

- API Docs -> backend Scalar URL, once final docs URL is known.

## Landing Page Plan

Route:

`/`

Current implementation:

- Server health placeholder.

New page type:

- Static marketing page.
- No need for server health query.
- Can be a server component unless client interactivity is needed.

### Landing Structure

### 1. Header

Content:

- Brand: `Newform`
- Nav links: `Templates`, `Pricing`
- Auth links: `Log in`, `Sign up`
- Mobile should wrap gracefully or use compact layout.

Visual:

- Transparent/warm header.
- Thin bottom border.
- Terracotta sign-up button.

### 2. Hero

Recommended headline:

`Build beautiful forms people actually finish`

Alternative headlines:

- `Forms with craft, speed, and soul`
- `Create forms that feel less like work`

Recommended subtext:

`Create, publish, validate, analyze, and export responses from one polished Typeform-style builder.`

Primary CTA:

- `Start building` -> `/signup`

Secondary CTA:

- `View templates` -> `/templates`

Hero right-side visual:

- Fake form preview card.
- Progress bar.
- Rating row.
- Select input preview.
- Submit button.
- Floating badges:
  - `Server-side validation`
  - `CSV export`
  - `Analytics ready`

Hero background:

- Parchment base.
- Large sun/arch shape.
- Subtle dot texture.
- Thin terracotta line accents.

### 3. Stats Strip

Stats:

- `3` seeded templates.
- `20+` demo responses per public form.
- `9` field types.
- `CSV` export.

Purpose:

- Quickly prove app completeness.

### 4. Product Flow Section

Title:

`From blank form to insight in minutes`

Steps:

1. `Create`
2. `Theme`
3. `Publish`
4. `Collect`
5. `Analyze`

Each step should map to existing product features:

- Create form and fields.
- Assign theme.
- Publish public/unlisted link.
- Submit public response.
- View responses, analytics, and CSV export.

### 5. Templates Preview

Title:

`Start with a form that already feels alive`

Cards:

- Anime Convention Feedback.
- Startup Product-Market Fit Survey.
- Gaming Tournament Registration.

CTA:

- `Browse templates` -> `/templates`

Implementation options:

- Keep cards static for speed.
- Or fetch public templates if the page becomes a client component.

Recommendation:

- Use static preview cards on landing for reliable SSR and speed.
- `/templates` already shows real seeded public forms.

### 6. Feature Section

Use safari dark section.

Features:

- `Public and unlisted forms`
- `Server-side response validation`
- `Themes for public pages`
- `Responses, analytics, and CSV`
- `Honeypot and rate limiting`
- `Demo-ready seeded data`

Visual:

- Dark cinematic background.
- Warm accent text.
- Cards with low-opacity borders.

### 7. Demo CTA

Title:

`Try the full creator loop`

Content:

- Demo credentials:
  - `demo@example.com`
  - `password123`

Buttons:

- `Log in to demo` -> `/login`
- `Create account` -> `/signup`

## Pricing Page Plan

Route:

`/pricing`

Purpose:

- Make product feel complete.
- Avoid fake payment implementation.
- CTAs should route to signup or say coming soon via copy.

### Pricing Structure

Header:

- Brand/nav same as landing.

Hero:

- Title: `Simple pricing for every form journey`
- Subtitle: `Start free, upgrade when your forms become part of your workflow.`

Cards:

### Free

Price:

- `$0`

Copy:

- `For creators testing ideas and collecting lightweight feedback.`

Features:

- 3 forms.
- 100 responses/month.
- Public templates.
- Basic analytics.
- CSV export.

CTA:

- `Start free` -> `/signup`

### Pro

Price:

- `$19/mo`

Badge:

- `Recommended`

Copy:

- `For teams and creators who publish forms regularly.`

Features:

- Unlimited forms.
- 10k responses/month.
- Themes.
- Public and unlisted links.
- Advanced analytics.
- CSV export.

CTA:

- `Start Pro` -> `/signup`

Note:

- Payment not implemented yet. CTA should still go to signup.

### Team

Price:

- `Custom`

Copy:

- `For organizations that need brand control and collaborative workflows.`

Features:

- Team workspace.
- Custom branding.
- Priority support.
- Higher response limits.
- Admin controls planned.

CTA:

- `Contact sales` -> `/signup` or `mailto:` if preferred.

Recommendation:

- Route to `/signup` for now to avoid creating unsupported contact flow.

### Pricing FAQ

Add a compact FAQ:

- `Is payment implemented?`
- `Can I export responses?`
- `Can I publish unlisted forms?`
- `Can I use templates?`

Be honest:

- `Payments are mocked/planned for this demo; the product flow is focused on creation, publishing, responses, analytics, and exports.`

## Dashboard UX Cleanup Plan

## Sidebar Cleanup

File:

- `apps/web/components/app-sidebar.tsx`

Remove placeholder imports:

- Unused shadcn starter icons.
- Document/nav secondary placeholders if not needed.

Replace brand:

- `Acme Inc.` -> `Newform`

Brand mark:

- Simple terracotta square with `N` or `NF`.

Navigation:

- Dashboard -> `/dashboard`
- Forms -> `/dashboard/forms`
- Templates -> `/templates`
- Pricing -> `/pricing`

Remove:

- Empty documents section.
- Fake `Settings` link if it goes to `#`.

## Main Nav Cleanup

File:

- `apps/web/components/nav-main.tsx`

Remove:

- `Quick Create` placeholder button if it does not create a form.
- Inbox/mail icon placeholder.

Keep:

- List of nav items.
- Active route state.

Optional:

- Add a real `New form` link/button to `/dashboard/forms`, since create form modal lives there.

Recommendation:

- Keep nav minimal for now.

## Header Cleanup

File:

- `apps/web/components/site-header.tsx`

Replace:

- `Documents` -> `Newform Dashboard`

Remove:

- External shadcn GitHub link.

Add useful actions:

- `Templates` -> `/templates`
- `Forms` -> `/dashboard/forms`

Optional:

- Make header accept a `title` prop later, but avoid refactor for this slice unless simple.

## User Menu Cleanup

File:

- `apps/web/components/nav-user.tsx`

Current issue:

- Fake shadcn user data.
- Placeholder Account/Billing/Notifications items.
- Logout item may not be wired.

Minimum cleanup:

- Show `Newform Creator` and `demo@example.com` or generic `Creator`.
- Avatar fallback: `NF`.
- Remove Billing and Notifications.
- Keep Account only if there is a destination or make it non-clickable copy.
- Keep Log out only if existing logout flow is wired.

If logout is not implemented:

- Remove dropdown complexity and show a small footer block with demo user copy.

Recommendation:

- Keep simple footer identity and avoid fake actions.

## Dashboard Home Cleanup

File:

- `apps/web/app/dashboard/page.tsx`

Remove shadcn starter pieces:

- `SectionCards`
- `ChartAreaInteractive`
- `DataTable`
- `data.json`

New dashboard structure:

### Welcome Card

Title:

- `Welcome to Newform`

Subtitle:

- `Create polished forms, publish them with themes, and track responses from one dashboard.`

Actions:

- `Manage forms` -> `/dashboard/forms`
- `Browse templates` -> `/templates`

### Quick Actions

Cards:

- `Create a form`
- `Choose a theme`
- `Publish a link`
- `Review responses`

### Demo Guide

Steps:

1. Open seeded forms.
2. Pick a theme.
3. Publish/copy link.
4. Submit public response.
5. Check responses and analytics.

### Demo Credentials

- `demo@example.com`
- `password123`

## Existing Feature Safety

Do not break:

- `/dashboard/forms`
- `/dashboard/forms/[id]`
- `/dashboard/forms/[id]/submissions`
- `/templates`
- `/f/[slug]`
- `/login`
- `/signup`

No DB/service/tRPC changes are expected for this slice.

## Implementation Order

Since this slice is UI-only, use this order:

1. Add `/pricing` page.
2. Replace `/` landing page.
3. Simplify sidebar brand/nav.
4. Simplify dashboard header.
5. Simplify nav user/footer.
6. Replace dashboard home placeholder page.
7. Run verification.

Reason:

- Public pages can be completed independently first.
- Dashboard cleanup can reuse final public navigation URLs.
- Verification catches route and import issues after all UI files are touched.

## Responsive Requirements

Landing:

- Hero should stack on mobile.
- Nav should not overflow on mobile.
- Hero fake form card should remain readable.
- CTA buttons should wrap or stack.

Pricing:

- Cards should stack on mobile.
- Recommended Pro card should not dominate mobile layout awkwardly.

Dashboard:

- Sidebar mobile sheet should still work.
- Header actions should hide/wrap on small screens.
- Dashboard cards should be single-column on mobile.

## Accessibility Requirements

- Use semantic `main`, `header`, `section` where practical.
- Buttons/links should have clear text.
- Avoid color-only meaning.
- Keep contrast high, especially in safari dark sections.
- Do not use non-clickable elements styled as links.

## Copy Guidelines

Tone:

- Premium but direct.
- Product-focused.
- Judge-friendly.

Avoid:

- Overly poetic copy that hides the feature set.
- Fake claims like real payments, real teams, or production billing.

Good phrases:

- `Typeform-style builder`
- `Public and unlisted links`
- `Server-side validation`
- `Responses and analytics`
- `CSV export`
- `Theme-ready public forms`

## Verification Checklist

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

- Next.js build passes.
- Build output includes `/pricing`.
- Existing `/templates` still builds.

Manual verification:

- Open `/` on desktop.
- Open `/` on mobile width.
- Confirm brand says `Newform`.
- Confirm `Templates` nav opens `/templates`.
- Confirm `Pricing` nav opens `/pricing`.
- Confirm `Log in` opens `/login`.
- Confirm `Sign up` opens `/signup`.
- Open `/pricing` on desktop.
- Open `/pricing` on mobile width.
- Confirm pricing CTAs do not imply implemented payment checkout.
- Open `/dashboard`.
- Confirm no shadcn starter content remains.
- Confirm no `Acme Inc.`, `Documents`, fake GitHub link, fake table, or fake starter chart remains.
- Confirm sidebar shows useful Newform nav only.
- Confirm `/dashboard/forms` still works.
- Confirm `/dashboard/forms/[id]` still works.
- Confirm `/dashboard/forms/[id]/submissions` still works.
- Confirm `/templates` still lists seeded public forms.
- Confirm `/f/[slug]` still opens public forms.

Known lint note:

- `pnpm lint` may remain blocked by pre-existing ESLint v9 config/warning issues. If still blocked, document it instead of treating it as part of this UI slice.

## Completion Criteria

This UI revamp slice is complete when:

- `/` is a polished Newform landing page.
- `/pricing` exists and is polished.
- Public nav links work.
- Dashboard no longer looks like shadcn starter template.
- Sidebar contains only relevant Newform navigation.
- Dashboard home explains the product flow.
- `pnpm check-types` passes.
- `pnpm build` passes.
- Existing builder/templates/public form flows are not broken.
