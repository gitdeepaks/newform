# Newform

Newform is a Typeform-style form builder SaaS built with a type-safe TypeScript monorepo. It supports authenticated form creation, public and unlisted form sharing, dynamic field types, multi-page forms, conditional logic, themes, response analytics, CSV export, QR sharing, seeded demo data, and an admin panel.

## Overview

Newform gives creators a complete form publishing workflow:

- Create and manage forms from a protected dashboard.
- Configure dynamic field types, options, validation, pages, and conditional visibility.
- Publish forms with public or unlisted visibility.
- Share forms through stable slug URLs and QR codes.
- Accept public submissions without requiring respondents to log in.
- Review responses, analytics, and CSV exports.
- Moderate users and forms through an admin panel.

The project is designed as a SaaS foundation, not only a hackathon prototype. Core business logic lives in shared service packages, tRPC keeps API contracts end-to-end typed, and Drizzle/Zod keep database and validation boundaries explicit.

## Tech Stack

- **Monorepo:** pnpm workspaces, Turborepo
- **Web:** Next.js App Router, React, Tailwind CSS, shadcn-style UI components
- **API:** Express, tRPC, trpc-to-openapi, Scalar API docs
- **Database:** PostgreSQL, Drizzle ORM, Drizzle Kit migrations
- **Validation:** Zod
- **Auth:** Cookie-based JWT auth, email/password, optional Google OAuth
- **Language:** TypeScript

## Repository Structure

```txt
.
├── apps
│   ├── api                 # Express API, tRPC HTTP server, OpenAPI, Scalar docs
│   └── web                 # Next.js frontend application
├── packages
│   ├── database            # Drizzle database client, schemas, migrations, seed data
│   ├── eslint-config       # Shared ESLint configs
│   ├── logger              # Shared logger package
│   ├── services            # Business/domain logic
│   ├── trpc                # tRPC routers, procedures, schemas, typed client exports
│   └── typescript-config   # Shared TypeScript configs
├── docs                    # Implementation notes and project plans
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Applications

### Web App

Location:

```txt
apps/web
```

Responsibilities:

- Landing page, pricing page, templates page.
- Auth pages for login/signup.
- Protected creator dashboard.
- Form builder UI.
- Public form renderer at `/f/[slug]`.
- Admin panel routes under `/admin`.
- Typed API access through `@repo/trpc`.

### API App

Location:

```txt
apps/api
```

Responsibilities:

- Starts the Express HTTP server.
- Mounts tRPC at `/trpc`.
- Mounts OpenAPI-compatible routes at `/api`.
- Serves OpenAPI JSON at `/openapi.json`.
- Serves Scalar documentation at `/docs`.
- Handles OAuth callback routes when providers are configured.

## Packages

### `@repo/trpc`

Defines the API contract:

- root router
- public/protected/admin procedures
- auth routes
- form routes
- admin routes
- OpenAPI metadata
- typed client exports

### `@repo/services`

Contains domain logic:

- user authentication and OAuth account linking
- form lifecycle, public lookup, cloning
- field creation, validation, conditional visibility config
- public response submission validation
- response analytics and CSV export
- theme assignment
- admin dashboard, moderation, and audit logging

### `@repo/database`

Contains persistence concerns:

- Drizzle database client
- table models
- migrations
- seed script

## Feature Summary

### Form Builder

- Create, edit, publish, unpublish, and archive forms.
- Public and unlisted visibility modes.
- Custom slug URLs.
- Thank-you title and message.
- Expiry date and response limit settings.
- Theme assignment.
- Preview before publishing.
- Clone form into a draft copy.
- QR code sharing for published forms.

### Field Types

Supported field types:

- Short text
- Long text
- Email
- Number
- Single select
- Multi select
- Checkbox
- Rating
- Date

Supported configuration:

- Required/optional fields.
- Options for select, multi-select, and checkbox groups.
- Text length validation.
- Number min/max validation.
- Rating scale validation.
- Date min/max validation.

### Multi-Page And Conditional Forms

- Fields can be grouped by page.
- Public respondents move through visible pages step by step.
- Pages with no visible fields are skipped.
- Conditional fields can depend on supported source fields.
- Hidden required fields do not block submission.
- Hidden answers are not persisted.
- Server-side validation enforces visibility and required rules.

### Responses And Analytics

- Public submissions without respondent login.
- Server-side answer validation.
- Honeypot spam protection.
- IP + slug rate limiting.
- Transactional submission persistence.
- Response events and email event rows.
- Creator response table.
- Pagination.
- CSV export.
- Analytics cards and field breakdowns.

### Admin Panel

- Admin-only backend procedures.
- Suspended users blocked from protected procedures.
- Seeded admin account.
- User role/status management.
- Self-demotion and self-suspension protection.
- Last-admin and last-active-admin protection.
- Form moderation: force unpublish, archive, restore.
- Submission metadata list without exposing answer values.
- Audit logs for admin mutations.
- Transactional admin mutations and audit logs.
- Confirmation dialogs for destructive actions.
- Filters and pagination on admin list pages.

## Demo Credentials

Seeded accounts:

```txt
Admin
Email: admin@example.com
Password: password123

Demo creator
Email: demo@example.com
Password: password123
```

## Environment Variables

Create a root `.env` file. The workspace scripts load environment variables with `dotenv-cli`.

Required:

```txt
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
WEB_URL=http://localhost:3000
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional OAuth variables:

```txt
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
```

Production domain recommendation:

```txt
NEXT_PUBLIC_APP_URL=https://www.newform.in
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Run database migrations:

```bash
pnpm db:migrate
```

Seed demo data:

```bash
pnpm db:seed
```

Start development servers:

```bash
pnpm dev
```

Common local URLs:

```txt
Web: http://localhost:3000
API: http://localhost:3001
Scalar docs: http://localhost:3001/docs
OpenAPI JSON: http://localhost:3001/openapi.json
```

## Database Commands

Generate Drizzle migrations:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:migrate
```

Seed database:

```bash
pnpm db:seed
```

Development note:

- This project is still in development.
- If local migration history becomes inconsistent, it is acceptable to reset the development database, rerun migrations, and reseed.
- Do not use development reset workflows against production data.

## API Documentation

When the API server is running:

```txt
Scalar docs: /docs
OpenAPI JSON: /openapi.json
tRPC endpoint: /trpc
OpenAPI-compatible route prefix: /api
```

The Scalar docs are generated from tRPC route metadata through `trpc-to-openapi`.

## Verification Commands

Type check:`

```bash
pnpm check-types
```

Build:

```bash
pnpm build
```

Format:

```bash
pnpm format
```

Lint:

```bash
pnpm lint
```

Known lint note:

- `pnpm lint` currently has known pre-existing ESLint configuration/warning blockers.
- `pnpm check-types` and `pnpm build` are the primary verified commands for the current implementation state.

## Manual Demo Checklist

Before final submission or deployment, verify:

- Landing page opens.
- Pricing page opens.
- Templates page shows only public published forms.
- Demo creator can log in.
- Admin can log in.
- Creator dashboard shows seeded forms.
- Creator can create a form.
- Creator can add fields and validations.
- Creator can create multi-page form flow.
- Creator can configure conditional visibility.
- Creator can preview, publish, unpublish, clone, and share a form.
- Public `/f/[slug]` form can be submitted without login.
- Expired/closed forms show a graceful unavailable state.
- Response limit is enforced.
- Creator can view responses.
- Creator can export CSV.
- Analytics update after submissions.
- Unlisted forms do not appear in templates but work by direct link.
- Legacy `/form/[form_id]` does not expose draft/unpublished form fields.
- Admin can view dashboard, users, forms, submissions, and audit logs.
- Admin destructive actions require confirmation.
- Admin cannot demote or suspend themselves.

## Deployment Notes

Recommended deployment split:

- Web: Vercel
- API: Render, Railway, Fly.io, or similar Node hosting
- Database: Neon, Supabase, Railway Postgres, or managed PostgreSQL

Required production checks:

- Set production `DATABASE_URL`.
- Set a strong `JWT_SECRET`.
- Set `NEXT_PUBLIC_API_URL` to the deployed API URL.
- Set `NEXT_PUBLIC_APP_URL` to the deployed web URL.
- Run migrations against production database.
- Seed only intentional demo/admin data.
- Verify `/docs` and `/openapi.json` on the deployed API.
- Verify public form submission from a logged-out browser session.

## Known Limitations

- Real email delivery is not connected; email events are recorded in the database.
- Payments are not implemented.
- Password-protected forms are not implemented.
- Rate limiting is currently in-memory and should be moved to Redis/Upstash before horizontal scaling.
- Password hashing/JWT session hardening is planned for a future production security pass.
- Analytics are computed in application code and can be optimized with SQL/materialized aggregates as data grows.

## Development Principles

- Keep app routes thin.
- Put business rules in `packages/services`.
- Put API contract and procedure boundaries in `packages/trpc`.
- Put persistence models and migrations in `packages/database`.
- Keep frontend custom feature components under `apps/web/custom/components`.
- Preserve end-to-end type safety with Drizzle, Zod, tRPC, and typed hooks.
- Avoid unsafe typing patterns such as `any`, `as any`, and `as unknown as`.
