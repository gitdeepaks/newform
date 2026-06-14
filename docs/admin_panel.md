# Admin Panel Implementation Plan

Goal: ship a real SaaS-grade admin panel for Newform, with role-based access, admin management screens, safe backend enforcement, audit logs, and strict end-to-end type safety.

Seeded admin account:

```txt
email: admin@example.com
password: password123
role: admin
status: active
```

This is not a hackathon-only read-only dashboard. The implementation should create a maintainable admin foundation that can be extended after launch.

## Non-Negotiable Engineering Rules

- Follow order: `DB -> service -> tRPC procedure -> hook -> UI -> verification`.
- Backend is the source of truth for admin permissions.
- Frontend role checks are UX only, never security.
- Every admin endpoint must use `adminProcedure`.
- Every admin mutation must create an audit log.
- Do not expose password hashes, salts, or sensitive internals.
- Do not use `any`.
- Do not use `as any`.
- Do not use `as unknown as`.
- Do not use unsafe casts to silence TypeScript.
- Use Drizzle select objects instead of selecting entire records when sensitive columns exist.
- Use Zod schemas for every admin input/output.
- Keep route files thin.
- Put custom admin UI in `apps/web/custom/components/admin`.
- Put admin frontend helpers in `apps/web/custom/lib/admin`.

## Feature Scope

Admin can manage:

- Platform dashboard and product health metrics.
- Users.
- User roles.
- User status/suspension.
- Forms.
- Form status moderation.
- Submissions metadata.
- Audit logs.

Admin cannot yet:

- Delete users permanently.
- Impersonate users.
- Edit another user’s form fields.
- View all response answer values in list views.
- Delete submissions without explicit future audit design.
- Manage billing.

Reason:

- These actions are high-risk and need stronger product decisions.
- The first admin release should be powerful but safe.

## Final Admin Routes

```txt
apps/web/app/admin/page.tsx
apps/web/app/admin/users/page.tsx
apps/web/app/admin/users/[id]/page.tsx
apps/web/app/admin/forms/page.tsx
apps/web/app/admin/forms/[id]/page.tsx
apps/web/app/admin/submissions/page.tsx
apps/web/app/admin/audit-logs/page.tsx
```

All pages should be thin wrappers around custom components.

Example:

```tsx
import { AdminDashboardPage } from "@/custom/components/admin/admin-dashboard-page";

export default function Page() {
  return <AdminDashboardPage />;
}
```

## Final Backend Shape

```txt
packages/database/models/audit-log.ts
packages/services/audit-log/model.ts
packages/services/audit-log/index.ts
packages/services/admin/model.ts
packages/services/admin/index.ts
packages/trpc/server/routes/admin/model.ts
packages/trpc/server/routes/admin/route.ts
```

Update existing:

```txt
packages/database/models/user.ts
packages/database/schema.ts or package schema export index
packages/database/seed.ts
packages/services/user/model.ts
packages/services/user/index.ts
packages/services/index.ts
packages/trpc/server/context.ts
packages/trpc/server/trpc.ts
packages/trpc/server/router.ts or root router file
packages/trpc/server/routes/auth/model.ts
packages/trpc/server/routes/auth/route.ts if needed
```

Exact root-router file name should be confirmed before editing.

## Final Frontend Shape

```txt
apps/web/hooks/api/admin/index.ts
apps/web/custom/components/admin/admin-guard.tsx
apps/web/custom/components/admin/admin-dashboard-page.tsx
apps/web/custom/components/admin/admin-metric-cards.tsx
apps/web/custom/components/admin/admin-recent-users.tsx
apps/web/custom/components/admin/admin-recent-forms.tsx
apps/web/custom/components/admin/admin-top-forms.tsx
apps/web/custom/components/admin/admin-users-page.tsx
apps/web/custom/components/admin/admin-users-table.tsx
apps/web/custom/components/admin/admin-user-detail-page.tsx
apps/web/custom/components/admin/admin-user-role-dialog.tsx
apps/web/custom/components/admin/admin-user-status-dialog.tsx
apps/web/custom/components/admin/admin-forms-page.tsx
apps/web/custom/components/admin/admin-forms-table.tsx
apps/web/custom/components/admin/admin-form-detail-page.tsx
apps/web/custom/components/admin/admin-form-actions.tsx
apps/web/custom/components/admin/admin-submissions-page.tsx
apps/web/custom/components/admin/admin-submissions-table.tsx
apps/web/custom/components/admin/admin-audit-logs-page.tsx
apps/web/custom/components/admin/admin-audit-logs-table.tsx
apps/web/custom/lib/admin/admin-formatting.ts
```

If time is tight, components can be fewer but still domain-organized. Do not dump everything into route files.

## Admin Data Model

### User Role

Add to `users` table:

```ts
role: varchar("role", { length: 20 }).notNull().default("user"),
```

Allowed values:

```txt
user
admin
```

Zod schema:

```ts
export const userRoleSchema = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;
```

### User Status

Add to `users` table:

```ts
status: varchar("status", { length: 20 }).notNull().default("active"),
```

Allowed values:

```txt
active
suspended
```

Zod schema:

```ts
export const userStatusSchema = z.enum(["active", "suspended"]);
export type UserStatus = z.infer<typeof userStatusSchema>;
```

### Audit Logs

Create `audit_logs` table:

```txt
id uuid primary key default random
actorUserId uuid references users.id
action varchar(80) not null
targetType varchar(40) not null
targetId varchar(120) not null
metadata json nullable
createdAt timestamp default now
```

Recommended Drizzle model:

```ts
export type AuditLogMetadata = Record<string, string | number | boolean | null>;

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => usersTable.id),
  action: varchar("action", { length: 80 }).notNull(),
  targetType: varchar("target_type", { length: 40 }).notNull(),
  targetId: varchar("target_id", { length: 120 }).notNull(),
  metadata: json("metadata").$type<AuditLogMetadata | null>(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Avoid `unknown` and `any` in metadata. Keep metadata simple.

## Audit Actions

Define action schema:

```ts
export const auditLogActionSchema = z.enum([
  "USER_ROLE_UPDATED",
  "USER_STATUS_UPDATED",
  "FORM_FORCE_UNPUBLISHED",
  "FORM_ARCHIVED",
  "FORM_RESTORED",
]);
```

Define target type schema:

```ts
export const auditLogTargetTypeSchema = z.enum(["user", "form"]);
```

Every admin mutation must create a log with:

- actor admin user id
- action
- target type
- target id
- metadata containing previous/new values

Example metadata:

```ts
{
  previousRole: "user",
  nextRole: "admin",
}
```

## Phase 1: DB Schema And Migration

### Step 1.1: Update Users Table

File:

```txt
packages/database/models/user.ts
```

Add:

```ts
role: varchar("role", { length: 20 }).notNull().default("user"),
status: varchar("status", { length: 20 }).notNull().default("active"),
```

Check:

- Existing inserts still work because defaults exist.
- Existing selects still compile.

### Step 1.2: Add Audit Log Model

File:

```txt
packages/database/models/audit-log.ts
```

Create table as described above.

Check:

- Import `usersTable`.
- Export metadata type if needed.

### Step 1.3: Export Audit Log Table

Find schema export file. Likely:

```txt
packages/database/schema.ts
```

or an index that exports all models.

Add audit log export.

Check:

- `@repo/database/schema` can import `auditLogsTable`.

### Step 1.4: Generate Migration

Run after schema edits:

```bash
pnpm db:generate
```

Then inspect generated migration.

Expected:

- Add `role` column to `users` with default `user`.
- Add `status` column to `users` with default `active`.
- Create `audit_logs` table.

### Step 1.5: Apply Migration

Run:

```bash
pnpm db:migrate
```

Check:

- Migration succeeds.
- Existing users now have default role/status.

## Phase 2: Seed Admin User

File:

```txt
packages/database/seed.ts
```

Add or update seeded admin:

```txt
admin@example.com
password123
role: admin
status: active
```

Requirements:

- Seed must be idempotent.
- If admin user exists, update role/status to admin/active.
- If admin user does not exist, create with hashed password using existing seed password hashing style.
- Do not break existing demo user.

Run:

```bash
pnpm db:seed
```

Check:

- Running seed twice succeeds.
- `admin@example.com` can login.

## Phase 3: User Service And Auth Output

### Step 3.1: Add User Role/Status Schemas

File:

```txt
packages/services/user/model.ts
```

Add:

```ts
export const userRoleSchema = z.enum(["user", "admin"]);
export const userStatusSchema = z.enum(["active", "suspended"]);
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
```

If user output schema exists, include:

- `role`
- `status`

### Step 3.2: Update `getUserInfoById`

File:

```txt
packages/services/user/index.ts
```

Select:

- `id`
- `email`
- `fullName`
- `profileImageUrl`
- `role`
- `status`

Parse role/status with Zod before returning:

```ts
role: userRoleSchema.parse(row.role),
status: userStatusSchema.parse(row.status),
```

This cast-free parse keeps runtime and TypeScript safe.

Check:

- Auth user hook receives role/status.
- Password/salt are never selected.

### Step 3.3: Block Suspended Users

File:

```txt
packages/trpc/server/trpc.ts
```

Current protected procedure only verifies JWT. Update it to fetch user info and reject suspended users.

Behavior:

- Missing token -> `UNAUTHORIZED`.
- Invalid token -> `UNAUTHORIZED` or existing error behavior.
- Suspended user -> `FORBIDDEN` with message `User account is suspended`.
- Active user -> continue.

Context should include:

```ts
user: {
  id: string;
  role: UserRole;
  status: UserStatus;
}
```

### Step 3.4: Update Context Type

File:

```txt
packages/trpc/server/context.ts
```

Update `TRPCCtxUser`:

```ts
export interface TRPCCtxUser {
  id: string;
  role: UserRole;
  status: UserStatus;
}
```

Use imported types from services user model.

No unsafe casts.

### Step 3.5: Add Admin Procedure

File:

```txt
packages/trpc/server/trpc.ts
```

Add:

```ts
export const adminProcedure = protectedProcedure.use(async (options) => {
  if (options.ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }

  return options.next({ ctx: options.ctx });
});
```

Because `protectedProcedure` already fetched role/status, `adminProcedure` does not need another DB query.

Check:

- Every admin route uses this.
- Non-admin user cannot access admin APIs even if manually calling tRPC.

## Phase 4: Audit Log Service

### Step 4.1: Create Audit Log Model

File:

```txt
packages/services/audit-log/model.ts
```

Add schemas:

```ts
export const auditLogActionSchema = z.enum([
  "USER_ROLE_UPDATED",
  "USER_STATUS_UPDATED",
  "FORM_FORCE_UNPUBLISHED",
  "FORM_ARCHIVED",
  "FORM_RESTORED",
]);

export const auditLogTargetTypeSchema = z.enum(["user", "form"]);

export const auditLogMetadataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export const createAuditLogInputSchema = z.object({
  actorUserId: z.string(),
  action: auditLogActionSchema,
  targetType: auditLogTargetTypeSchema,
  targetId: z.string(),
  metadata: auditLogMetadataSchema.nullable().optional(),
});
```

Add list schema:

```ts
export const listAuditLogsInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  action: auditLogActionSchema.optional(),
  targetType: auditLogTargetTypeSchema.optional(),
  targetId: z.string().optional(),
  actorUserId: z.string().optional(),
});
```

### Step 4.2: Create Audit Log Service

File:

```txt
packages/services/audit-log/index.ts
```

Methods:

```txt
createAuditLog(input)
listAuditLogs(input)
```

`createAuditLog` inserts one row.

`listAuditLogs` returns paginated rows with actor user email/name if possible.

Check:

- No sensitive user data selected.
- Pagination output includes total/totalPages.

### Step 4.3: Export Service

File:

```txt
packages/trpc/server/services.ts
```

or wherever services are instantiated/exported.

Add:

```ts
export const auditLogService = new AuditLogService();
```

## Phase 5: Admin Service

### Step 5.1: Create Admin Model

File:

```txt
packages/services/admin/model.ts
```

Add common pagination schema:

```ts
export const paginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
```

Input schemas:

```txt
getAdminDashboardInputSchema: z.undefined()
listAdminUsersInputSchema
getAdminUserDetailInputSchema
updateAdminUserRoleInputSchema
updateAdminUserStatusInputSchema
listAdminFormsInputSchema
getAdminFormDetailInputSchema
forceUnpublishAdminFormInputSchema
archiveAdminFormInputSchema
restoreAdminFormInputSchema
listAdminSubmissionsInputSchema
getAdminSubmissionDetailInputSchema
```

### Step 5.2: Create Admin Service

File:

```txt
packages/services/admin/index.ts
```

Constructor/dependencies:

- Import db/tables.
- Import audit log service or pass log creation from admin route/service.

Recommended:

- AdminService receives or imports `auditLogService` for mutations.

Methods:

```txt
getDashboard()
listUsers(input)
getUserDetail(input)
updateUserRole(input)
updateUserStatus(input)
listForms(input)
getFormDetail(input)
forceUnpublishForm(input)
archiveForm(input)
restoreForm(input)
listSubmissions(input)
getSubmissionDetail(input)
```

### Step 5.3: Dashboard Metrics

Return:

```ts
{
  metrics: {
    totalUsers,
    activeUsers,
    suspendedUsers,
    adminUsers,
    verifiedUsers,
    totalForms,
    publishedForms,
    draftForms,
    archivedForms,
    publicForms,
    unlistedForms,
    totalFields,
    totalSubmissions,
    submissionsLast24h,
    submissionsLast7d,
    usersLast7d,
    formsLast7d,
  },
  recentUsers,
  recentForms,
  topForms,
}
```

Use explicit select/count queries.

### Step 5.4: List Users

Filters:

- `search?: string`
- `role?: userRoleSchema`
- `status?: userStatusSchema`
- pagination

Return fields:

- `id`
- `email`
- `fullName`
- `emailVerified`
- `profileImageUrl`
- `role`
- `status`
- `createdAt`
- counts: forms count, submissions count if easy

Do not return:

- password
- salt

### Step 5.5: User Detail

Return:

- user safe profile
- form count
- published form count
- submission count across user forms
- recent forms
- recent audit logs targeting user

### Step 5.6: Update User Role

Input:

```ts
{
  actorUserId: string;
  userId: string;
  role: "user" | "admin";
}
```

Rules:

- Target user must exist.
- Cannot demote self.
- Cannot demote last remaining admin.
- If role unchanged, return current user or no-op.
- Create audit log if changed.

### Step 5.7: Update User Status

Input:

```ts
{
  actorUserId: string;
  userId: string;
  status: "active" | "suspended";
}
```

Rules:

- Target user must exist.
- Cannot suspend self.
- Cannot suspend last active admin.
- Suspended users are blocked by protectedProcedure.
- Create audit log if changed.

### Step 5.8: List Forms

Filters:

- `search?: string`
- `status?: "draft" | "published" | "archived"`
- `visibility?: "public" | "unlisted"`
- `creatorId?: string`
- pagination

Return:

- id
- title
- slug
- status
- visibility
- creator id/email/name
- createdAt
- updatedAt
- publishedAt
- response count
- field count

### Step 5.9: Form Detail

Return:

- safe form details
- creator safe profile
- fields
- response count
- recent submission metadata
- recent audit logs targeting form

Do not return all response values by default.

### Step 5.10: Force Unpublish Form

Rules:

- Target form must exist.
- If already not published, either no-op or throw. Prefer no-op with clear return.
- Set `status: draft`.
- Keep responses.
- Create audit log.

### Step 5.11: Archive Form

Rules:

- Target form must exist.
- Set `status: archived`.
- Public access stops automatically because public route requires `published`.
- Create audit log.

### Step 5.12: Restore Form

Rules:

- Target form must exist.
- Only archived forms restore.
- Restore as `draft`, not published.
- Create audit log.

### Step 5.13: List Submissions

Filters:

- `formId?: string`
- `creatorId?: string`
- `page`
- `pageSize`

Return metadata only:

- submission id
- form id/title/slug
- creator email
- respondent email
- submittedAt
- value count
- metadata ip/userAgent if already stored

Do not include answer values in list.

### Step 5.14: Get Submission Detail

Return:

- submission metadata
- form safe details
- values with field labels if needed

Optional safety:

- Create audit log action later if we consider viewing responses sensitive.

For first implementation, if adding detail feels sensitive, skip detail and keep list metadata only.

## Phase 6: Admin tRPC Router

### Step 6.1: Create Admin tRPC Model

File:

```txt
packages/trpc/server/routes/admin/model.ts
```

Define input/output schemas for every admin route.

Important:

- Output schemas should be explicit.
- Use `userRoleSchema` and `userStatusSchema` from service model if possible.
- Date fields use `z.date().nullable()` where appropriate.
- Pagination output shape consistent:

```ts
pagination: z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
})
```

### Step 6.2: Create Admin tRPC Route

File:

```txt
packages/trpc/server/routes/admin/route.ts
```

All procedures use `adminProcedure`.

Routes:

```txt
getDashboard
listUsers
getUserDetail
updateUserRole
updateUserStatus
listForms
getFormDetail
forceUnpublishForm
archiveForm
restoreForm
listSubmissions
listAuditLogs
```

For mutations, pass:

```ts
actorUserId: ctx.user.id
```

Never accept actor id from client.

### Step 6.3: Register Admin Router

Find root router file.

Add:

```ts
admin: adminRouter,
```

Check:

- `trpc.admin.*` is available to web app.

## Phase 7: Frontend Admin Hooks

Create:

```txt
apps/web/hooks/api/admin/index.ts
```

Hooks:

```txt
useAdminDashboard()
useAdminUsers(filters)
useAdminUserDetail(userId)
useUpdateAdminUserRole()
useUpdateAdminUserStatus()
useAdminForms(filters)
useAdminFormDetail(formId)
useForceUnpublishAdminForm()
useArchiveAdminForm()
useRestoreAdminForm()
useAdminSubmissions(filters)
useAdminAuditLogs(filters)
```

Invalidation rules:

- User role/status mutation invalidates:
  - admin dashboard
  - admin users
  - admin user detail
  - audit logs
  - auth current user if target is current user, optional
- Form moderation mutation invalidates:
  - admin dashboard
  - admin forms
  - admin form detail
  - public forms
  - owner/public form queries if relevant
  - audit logs

No casts. Let tRPC infer types.

## Phase 8: Frontend Admin UI

### Step 8.1: Admin Guard

File:

```txt
apps/web/custom/components/admin/admin-guard.tsx
```

Behavior:

- Wrap with `AuthGate mode="auth"` or rely on `DashboardShell` if it already wraps auth.
- Load user from `useUser`.
- If loading: spinner.
- If user role is not admin: forbidden card.
- If admin: render children.

Important:

- Backend still enforces admin access.
- Guard is only UX.

### Step 8.2: Admin Shell Strategy

Use existing `DashboardShell` if appropriate.

Admin pages can render:

```tsx
<DashboardShell>
  <AdminGuard>
    ...
  </AdminGuard>
</DashboardShell>
```

If `DashboardShell` already includes `AuthGate`, avoid duplicate auth gate if possible.

### Step 8.3: Dashboard Page

Files:

```txt
apps/web/app/admin/page.tsx
apps/web/custom/components/admin/admin-dashboard-page.tsx
apps/web/custom/components/admin/admin-metric-cards.tsx
apps/web/custom/components/admin/admin-recent-users.tsx
apps/web/custom/components/admin/admin-recent-forms.tsx
apps/web/custom/components/admin/admin-top-forms.tsx
```

Show:

- KPI cards.
- Recent users.
- Recent forms.
- Top forms by submissions.
- Link buttons to Users/Forms/Audit Logs.

### Step 8.4: Users Page

Files:

```txt
apps/web/app/admin/users/page.tsx
apps/web/custom/components/admin/admin-users-page.tsx
apps/web/custom/components/admin/admin-users-table.tsx
```

Features:

- Search input.
- Role filter.
- Status filter.
- Pagination.
- Table rows.
- Link to user detail.
- Actions:
  - change role
  - change status

### Step 8.5: User Detail Page

Files:

```txt
apps/web/app/admin/users/[id]/page.tsx
apps/web/custom/components/admin/admin-user-detail-page.tsx
apps/web/custom/components/admin/admin-user-role-dialog.tsx
apps/web/custom/components/admin/admin-user-status-dialog.tsx
```

Show:

- User profile.
- Role/status badges.
- User stats.
- Recent forms.
- Recent audit logs for target user.
- Role/status action dialogs.

Dialogs must:

- Explain action.
- Require explicit confirmation button.
- Show pending state.
- Toast success/error.

### Step 8.6: Forms Page

Files:

```txt
apps/web/app/admin/forms/page.tsx
apps/web/custom/components/admin/admin-forms-page.tsx
apps/web/custom/components/admin/admin-forms-table.tsx
```

Features:

- Search by title/slug/creator email.
- Filter status.
- Filter visibility.
- Pagination.
- Link to form detail.
- Action buttons:
  - force unpublish
  - archive
  - restore if archived

### Step 8.7: Form Detail Page

Files:

```txt
apps/web/app/admin/forms/[id]/page.tsx
apps/web/custom/components/admin/admin-form-detail-page.tsx
apps/web/custom/components/admin/admin-form-actions.tsx
```

Show:

- Form metadata.
- Creator metadata.
- Fields.
- Response count.
- Recent submission metadata.
- Recent audit logs for target form.
- Admin actions.

### Step 8.8: Submissions Page

Files:

```txt
apps/web/app/admin/submissions/page.tsx
apps/web/custom/components/admin/admin-submissions-page.tsx
apps/web/custom/components/admin/admin-submissions-table.tsx
```

Show metadata only:

- submittedAt
- form title
- creator email
- respondent email
- value count
- IP/user-agent if present

Do not expose answer values in list view.

### Step 8.9: Audit Logs Page

Files:

```txt
apps/web/app/admin/audit-logs/page.tsx
apps/web/custom/components/admin/admin-audit-logs-page.tsx
apps/web/custom/components/admin/admin-audit-logs-table.tsx
```

Show:

- actor email/name
- action
- target type
- target id
- metadata summary
- createdAt
- pagination

### Step 8.10: Sidebar Admin Link

File:

```txt
apps/web/components/app-sidebar.tsx
```

If user is admin, add:

```txt
Admin -> /admin
```

Recommended first version:

- Single `Admin` nav item.
- Admin section pages have internal links/tabs.

Do not show Admin link for normal users.

## Phase 9: Admin UI Design Requirements

Admin UI should be practical and dense, not marketing-like.

Use:

- KPI cards.
- Tables.
- Badges for role/status/form status.
- Clear destructive/moderation dialogs.
- Empty states.
- Loading states.
- Error alerts.
- Pagination controls.

Recommended status badge variants:

```txt
admin -> default
user -> secondary
active -> default/outline
suspended -> destructive
published -> default
draft -> secondary
archived -> outline
```

## Phase 10: Verification Commands

Run in this order:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm check-types
pnpm build
```

If `pnpm check-types` fails:

- Fix real type issue.
- Do not add casts.
- Do not weaken schemas.

If build fails:

- Fix route/client boundary issues.
- Ensure admin pages with hooks are client components.

Known note:

- `pnpm lint` may still be blocked by existing ESLint config/warnings. Do not use lint as the primary verification unless lint config is fixed.

## Manual Verification Checklist

### Admin Seed

- Run seed once.
- Run seed twice.
- Both pass.
- `admin@example.com / password123` can login.

### Auth And Access

- Admin sees Admin sidebar item.
- Normal user does not see Admin sidebar item.
- Admin can open `/admin`.
- Normal user direct `/admin` gets forbidden state.
- Logged-out user direct `/admin` gets auth redirect/gate.
- Normal user cannot call admin tRPC endpoints.

### Suspended User

- Admin suspends a normal user.
- Suspended user cannot access protected dashboard routes.
- Admin reactivates user.
- User can access protected routes again.
- Admin cannot suspend self.

### Role Management

- Admin promotes user to admin.
- Promoted user sees Admin nav after refresh/relogin.
- Admin demotes another admin.
- Admin cannot demote self.
- System prevents removing last admin.
- Audit logs are created.

### Dashboard

- Metrics render correctly.
- Recent users render.
- Recent forms render.
- Top forms render.
- Counts update after creating forms/submissions.

### Users Page

- Users list loads.
- Search works.
- Role filter works.
- Status filter works.
- Pagination works.
- User detail opens.
- Role/status dialogs work.

### Forms Page

- All forms list loads.
- Search works.
- Status filter works.
- Visibility filter works.
- Form detail opens.
- Force unpublish works.
- Archive works.
- Restore works.
- Audit logs are created.

### Public Form Effects

- Force unpublished form no longer loads at `/f/[slug]`.
- Archived form no longer loads at `/f/[slug]`.
- Restored form is draft, not published.

### Submissions Page

- Submission metadata list loads.
- No sensitive answer values shown in table.
- Pagination works.

### Audit Logs

- User role update creates log.
- User status update creates log.
- Form unpublish/archive/restore creates log.
- Audit log list shows actor/action/target/time.

## Security Checklist

- No admin route uses `protectedProcedure` directly; all use `adminProcedure`.
- Admin procedure checks role on backend.
- Suspended users blocked in protected procedure.
- Password and salt never selected in admin service.
- No public admin data endpoints.
- No self-suspension.
- No self-demotion.
- No last-admin removal.
- All admin mutations write audit logs.
- No unsafe casts.
- No `any`.

## Implementation Milestones

### Milestone 1: Admin Foundation

Complete when:

- Role/status columns added.
- Audit logs table added.
- Admin seed user exists.
- Protected procedure blocks suspended users.
- Admin procedure exists.
- `pnpm check-types` passes.

### Milestone 2: Admin API

Complete when:

- Admin service exists.
- Audit log service exists.
- Admin router registered.
- Dashboard/list/detail/action procedures exist.
- All admin procedures use `adminProcedure`.
- `pnpm check-types` passes.

### Milestone 3: Admin UI

Complete when:

- Admin routes exist.
- Admin guard exists.
- Dashboard/users/forms/submissions/audit pages exist.
- Sidebar Admin link appears for admins.
- Non-admin forbidden state works.
- `pnpm build` passes.

### Milestone 4: End-To-End Verification

Complete when:

- Admin login works.
- Normal-user access blocked.
- Admin mutations work.
- Audit logs created.
- Public form behavior updates after moderation actions.
- Manual checklist passes.

## Update After Completion

Update:

```txt
docs/plan.md
```

Add Admin Panel to completed bonus/features section with notes:

- Role-based admin access.
- Admin dashboard metrics.
- User management.
- Form moderation.
- Submission metadata.
- Audit logs.
- Seeded admin account `admin@example.com`.
