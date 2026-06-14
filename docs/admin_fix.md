# Admin Panel Hardening Fix Plan

Goal: harden the existing admin panel before treating it as SaaS-grade complete.

This plan focuses only on the follow-up fixes identified after the first admin implementation:

- Transactional admin mutations and audit logs.
- Confirmation dialogs for high-risk admin actions.
- Remove non-null assertions from admin service code.
- Add practical filters and pagination controls to admin UI.

Non-negotiables remain unchanged:

- Backend is the source of truth for permissions.
- Every admin endpoint must use `adminProcedure`.
- Every admin mutation that changes state must create an audit log.
- Admin state changes and their audit logs must be atomic.
- Do not expose password hashes, salts, or sensitive internals.
- Do not use `any`, `as any`, `as unknown as`, or unsafe casts.
- Do not use non-null assertions to silence TypeScript.
- Keep route files thin.

## Current Known Issues

### 1. Admin Mutations Are Not Atomic

Current mutation flow updates the target row and then creates an audit log in a separate operation.

Risk:

- User/form state can change even if audit log creation fails.
- Audit history can become incomplete.
- This weakens trust in audit logs.

Affected service methods:

- `AdminService.updateUserRole`
- `AdminService.updateUserStatus`
- `AdminService.moderateForm`
- Public wrappers around `moderateForm`:
  - `forceUnpublishForm`
  - `archiveForm`
  - `restoreForm`

### 2. Admin UI Actions Are One-Click

Current users/forms admin actions execute immediately on button click.

Risk:

- Accidental demotion, suspension, archive, or unpublish.
- No clear statement of consequence before execution.

Affected UI:

- `AdminUsersPage`
- `AdminFormsPage`
- Potentially future detail page action sections.

### 3. Admin Service Uses Non-Null Assertions

Current service uses non-null assertions on `or(...)` filter expressions.

Risk:

- Violates project admin implementation rule.
- Hides type uncertainty instead of modeling it safely.

Affected lines/patterns:

- `filters.push(or(... )!)` in `listUsers`
- `filters.push(or(... )!)` in `listForms`

### 4. Admin UI Has Minimal Filters And No Real Pagination Controls

Current UI sends fixed `page: 1`, `pageSize: 50` and only has basic search on some pages.

Risk:

- Admin pages degrade as data grows.
- Existing backend pagination is not usable from UI.
- Filters in backend are underutilized.

Affected UI:

- Users page.
- Forms page.
- Submissions page.
- Audit logs page.

## Implementation Order

Follow this order:

1. Backend transaction hardening.
2. Remove non-null assertions.
3. Run `pnpm check-types`.
4. Add confirmation dialog primitives and wire user/form actions.
5. Add filters and pagination controls.
6. Run `pnpm check-types`.
7. Run `pnpm build`.
8. Update completion notes in this file and `docs/plan.md` if appropriate.

## Phase 1: Transactional Admin Mutations

### Step 1.1: Decide Transaction Strategy

Preferred minimal approach:

- Keep `AuditLogService.createAuditLog` unchanged for normal non-transactional use.
- Insert audit log rows directly inside `AdminService` transaction blocks for admin mutations.

Reason:

- Avoid introducing a transaction-client abstraction if not needed.
- Keep changes smaller.
- Ensure update and audit insert share the same transaction.

Alternative approach:

- Update `AuditLogService.createAuditLog` to accept an optional transaction client.
- Use it inside admin mutations.

Use alternative only if direct insert creates too much duplication.

### Step 1.2: Update `updateUserRole`

File:

```txt
packages/services/admin/index.ts
```

Desired behavior:

- Parse input with `updateAdminUserRoleInputSchema`.
- Reject self-demotion before transaction if actor and target are same and next role is `user`.
- Inside transaction:
  - Select target user with safe select object.
  - Throw if user does not exist.
  - Parse previous role/status through schemas.
  - If role unchanged, return current safe user and do not create audit log.
  - If demoting an admin, count remaining admins inside same transaction.
  - Reject demotion if target is last admin.
  - Update user role.
  - Insert `USER_ROLE_UPDATED` audit log inside the same transaction.
  - Return updated safe user.

Audit metadata:

```ts
{
  previousRole: "user" | "admin",
  nextRole: "user" | "admin",
}
```

Checks:

- If audit log insert fails, role update rolls back.
- No audit log is created for no-op role update.
- Returned user contains no password or salt.

### Step 1.3: Update `updateUserStatus`

File:

```txt
packages/services/admin/index.ts
```

Desired behavior:

- Parse input with `updateAdminUserStatusInputSchema`.
- Reject self-suspension before transaction if actor and target are same and next status is `suspended`.
- Inside transaction:
  - Select target user with safe select object.
  - Throw if user does not exist.
  - Parse previous status and current role through schemas.
  - If status unchanged, return current safe user and do not create audit log.
  - If suspending an active admin, count active admins inside same transaction.
  - Reject suspension if target is last active admin.
  - Update user status.
  - Insert `USER_STATUS_UPDATED` audit log inside same transaction.
  - Return updated safe user.

Audit metadata:

```ts
{
  previousStatus: "active" | "suspended",
  nextStatus: "active" | "suspended",
}
```

Checks:

- If audit log insert fails, status update rolls back.
- No audit log is created for no-op status update.
- Suspended users remain blocked by `protectedProcedure`.

### Step 1.4: Update Form Moderation Transaction

File:

```txt
packages/services/admin/index.ts
```

Affected method:

```txt
moderateForm(formId, actorUserId, nextStatus, action)
```

Desired behavior:

- Inside transaction:
  - Select form id/status.
  - Throw if form does not exist.
  - Parse previous status through `formStatusSchema`.
  - Preserve existing no-op behavior where appropriate.
  - For force unpublish:
    - If already not published/draft target status is unchanged, return no-op.
    - If changed, set `status: draft`, `publishedAt: null`.
  - For archive:
    - If already archived, return no-op.
    - If changed, set `status: archived`, `publishedAt: null`.
  - For restore:
    - Only archived forms restore.
    - Restore to `draft`, not `published`.
    - If not archived, return no-op.
  - Insert audit log in same transaction when changed.
  - Return `{ id, status, changed }`.

Audit metadata:

```ts
{
  previousStatus: "draft" | "published" | "archived",
  nextStatus: "draft" | "archived",
}
```

Checks:

- If audit log insert fails, form status update rolls back.
- Public access stops for force-unpublished and archived forms because public route requires `published`.
- Restored form remains draft.

### Step 1.5: Keep Audit Log Service For Reads And Non-Transactional Inserts

File:

```txt
packages/services/audit-log/index.ts
```

Do not remove:

- `createAuditLog`
- `listAuditLogs`

Reason:

- `listAuditLogs` is still used by admin pages.
- `createAuditLog` may still be useful for future non-admin or transaction-independent events.

## Phase 2: Remove Non-Null Assertions

### Step 2.1: Replace `or(...)!` In User Filters

File:

```txt
packages/services/admin/index.ts
```

Current pattern:

```ts
filters.push(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.fullName, `%${search}%`))!);
```

Replace with safe pattern:

```ts
const searchFilter = or(
  ilike(usersTable.email, `%${search}%`),
  ilike(usersTable.fullName, `%${search}%`),
);

if (searchFilter) filters.push(searchFilter);
```

Check:

- No non-null assertion remains.
- `filters` remains `SQL[]`.

### Step 2.2: Replace `or(...)!` In Form Filters

File:

```txt
packages/services/admin/index.ts
```

Current pattern:

```ts
filters.push(or(ilike(formsTable.title, ...), ilike(formsTable.slug, ...), ilike(usersTable.email, ...))!);
```

Replace with safe variable and conditional push.

Check:

- No non-null assertion remains.
- Search by title, slug, and creator email still works.

### Step 2.3: Search For Remaining Non-Null Assertions

Run or use Grep equivalent for admin files:

```txt
!
```

Review carefully because `!` also appears in normal boolean negation.

Targets:

- No `expr!` in admin service.
- No new `!` assertions in admin UI.
- Normal `if (!value)` is acceptable.

## Phase 3: Confirmation Dialogs

### Step 3.1: Add Reusable Admin Confirmation Component

Preferred file:

```txt
apps/web/custom/components/admin/admin-confirm-action-dialog.tsx
```

If keeping component count low is preferred, it can live in:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

Recommended separate component because multiple pages need it.

Props:

```ts
type AdminConfirmActionDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  isPending?: boolean;
  onConfirm: () => Promise<void> | void;
};
```

Implementation:

- Use existing `AlertDialog` components from `@/components/ui/alert-dialog`.
- Use `AlertDialogTrigger` for the passed trigger.
- Use `AlertDialogAction` for confirm.
- Use `AlertDialogCancel` for cancel.
- Prevent accidental close while pending if practical.
- Show pending label while mutation is pending.

No unsafe casts.

### Step 3.2: Wire User Role Dialogs

File:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

For each user row:

- Promote user:
  - Title: `Promote user to admin?`
  - Description: mention email and that admin access will be granted.
  - Confirm label: `Promote user`.
- Demote admin:
  - Title: `Demote admin?`
  - Description: mention email and that admin access will be removed.
  - Confirm label: `Demote admin`.
  - Destructive variant.

Backend still prevents self-demotion and last-admin demotion.

### Step 3.3: Wire User Status Dialogs

File:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

For each user row:

- Suspend active user:
  - Title: `Suspend user?`
  - Description: mention email and that protected app access will be blocked.
  - Confirm label: `Suspend user`.
  - Destructive variant.
- Activate suspended user:
  - Title: `Reactivate user?`
  - Description: mention email and that protected app access will be restored.
  - Confirm label: `Reactivate user`.

Backend still prevents self-suspension and last-active-admin suspension.

### Step 3.4: Wire Form Moderation Dialogs

File:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

For each form row:

- Force unpublish:
  - Title: `Force unpublish form?`
  - Description: mention title and that public access will stop immediately.
  - Confirm label: `Force unpublish`.
  - Destructive variant.
- Archive:
  - Title: `Archive form?`
  - Description: mention title and that public access will stop, while responses are kept.
  - Confirm label: `Archive form`.
  - Destructive variant.
- Restore:
  - Title: `Restore form as draft?`
  - Description: mention title and that it will restore as draft, not published.
  - Confirm label: `Restore as draft`.

Backend still ensures restore only applies to archived forms.

### Step 3.5: Improve Pending States

Current mutations already expose `isPending` from tRPC mutation objects.

Use pending state to:

- Disable confirm button.
- Show `Saving...`, `Updating...`, or action-specific pending label.
- Avoid duplicate submissions.

## Phase 4: Filters And Pagination Controls

### Step 4.1: Add Shared Pagination Control

Preferred file:

```txt
apps/web/custom/components/admin/admin-pagination-controls.tsx
```

Props:

```ts
type AdminPaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};
```

UI:

- Show `Page X of Y`.
- Show total count.
- Previous button.
- Next button.
- Page size selector: `10`, `20`, `50`, `100`.

Rules:

- Disable previous on page `1`.
- Disable next when `page >= totalPages`.
- When page size changes, reset page to `1`.

### Step 4.2: Add Users Filters

File:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

State:

```ts
const [search, setSearch] = useState("");
const [role, setRole] = useState<"all" | "user" | "admin">("all");
const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
```

Query input:

```ts
useAdminUsers({
  page,
  pageSize,
  search: search || undefined,
  role: role === "all" ? undefined : role,
  status: status === "all" ? undefined : status,
})
```

UI controls:

- Search input.
- Role select.
- Status select.
- Pagination controls below table.

Behavior:

- Changing search/filter resets page to `1`.
- Empty result shows a clear empty state.

### Step 4.3: Add Forms Filters

File:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

State:

```ts
const [search, setSearch] = useState("");
const [status, setStatus] = useState<"all" | "draft" | "published" | "archived">("all");
const [visibility, setVisibility] = useState<"all" | "public" | "unlisted">("all");
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
```

Query input:

```ts
useAdminForms({
  page,
  pageSize,
  search: search || undefined,
  status: status === "all" ? undefined : status,
  visibility: visibility === "all" ? undefined : visibility,
})
```

UI controls:

- Search input.
- Status select.
- Visibility select.
- Pagination controls below table.

Behavior:

- Changing search/filter resets page to `1`.
- Empty result shows a clear empty state.

### Step 4.4: Add Submissions Pagination And Optional Filters

File:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

Required state:

```ts
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
```

Optional filter state:

```ts
const [formId, setFormId] = useState("");
const [creatorId, setCreatorId] = useState("");
```

Query input:

```ts
useAdminSubmissions({
  page,
  pageSize,
  formId: formId || undefined,
  creatorId: creatorId || undefined,
})
```

UI controls:

- Pagination controls are required.
- Form ID and creator ID inputs are optional but useful.

Safety requirement:

- Continue showing metadata only.
- Do not add answer values to the table.

### Step 4.5: Add Audit Log Filters And Pagination

File:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

State:

```ts
const [action, setAction] = useState<"all" | AuditAction>("all");
const [targetType, setTargetType] = useState<"all" | "user" | "form">("all");
const [targetId, setTargetId] = useState("");
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
```

Because UI types should avoid duplicating too much generated tRPC type detail, define a small local union or constant array for audit actions:

```ts
const auditActions = [
  "USER_ROLE_UPDATED",
  "USER_STATUS_UPDATED",
  "FORM_FORCE_UNPUBLISHED",
  "FORM_ARCHIVED",
  "FORM_RESTORED",
] as const;
```

Do not cast unsafely.

Query input:

```ts
useAdminAuditLogs({
  page,
  pageSize,
  action: action === "all" ? undefined : action,
  targetType: targetType === "all" ? undefined : targetType,
  targetId: targetId || undefined,
})
```

UI controls:

- Action select.
- Target type select.
- Target ID input.
- Pagination controls below table.

Behavior:

- Changing filters resets page to `1`.
- Empty result shows a clear empty state.

## Phase 5: UI Structure Cleanup If Needed

Current file:

```txt
apps/web/custom/components/admin/admin-pages.tsx
```

This file is already dense. If filter/dialog changes make it hard to maintain, split minimally:

Recommended extracted files:

```txt
apps/web/custom/components/admin/admin-confirm-action-dialog.tsx
apps/web/custom/components/admin/admin-pagination-controls.tsx
apps/web/custom/components/admin/admin-filter-controls.tsx
```

Avoid over-splitting unless necessary.

Do not move route files beyond thin wrappers.

## Phase 6: Verification

### Step 6.1: Type Check

Run:

```bash
pnpm check-types
```

Expected:

- Passes without casts.
- No `any` introduced.
- No `as any`, `as unknown as`, or unsafe casts.
- No non-null assertions in admin service.

### Step 6.2: Build

Run:

```bash
pnpm build
```

Expected:

- Next app builds.
- Admin routes remain valid.
- No client/server boundary errors.

### Step 6.3: Manual Backend Verification

Use the app or direct tRPC calls if available.

Verify:

- Promoting a user creates exactly one `USER_ROLE_UPDATED` audit log.
- Demoting a user creates exactly one `USER_ROLE_UPDATED` audit log.
- Suspending a user creates exactly one `USER_STATUS_UPDATED` audit log.
- Reactivating a user creates exactly one `USER_STATUS_UPDATED` audit log.
- Force unpublish creates exactly one `FORM_FORCE_UNPUBLISHED` audit log.
- Archive creates exactly one `FORM_ARCHIVED` audit log.
- Restore creates exactly one `FORM_RESTORED` audit log.
- No-op mutations do not create audit logs.
- Self-demotion still fails.
- Self-suspension still fails.
- Last admin demotion still fails.
- Last active admin suspension still fails.

### Step 6.4: Manual UI Verification

Verify:

- User role/status buttons open confirmation dialogs.
- Form moderation buttons open confirmation dialogs.
- Dialog confirm buttons show pending state.
- Dialog cancel does not mutate state.
- Success and error toasts still appear.
- Users filters work.
- Forms filters work.
- Submissions pagination works.
- Audit log filters work.
- Previous/next pagination works on all admin list pages.
- Page size changes reset page to `1`.

## Completion Criteria

This fix is complete when:

- Admin mutations and audit logs are atomic.
- No admin service non-null assertions remain.
- High-risk admin actions require confirmation.
- Admin list pages expose useful filters and pagination controls.
- `pnpm check-types` passes.
- `pnpm build` passes.
- Manual checklist above is completed or any skipped item is explicitly documented.

## Completion Notes

Implemented:

- [x] Admin role/status mutations now run inside database transactions.
- [x] Form moderation mutations now run inside database transactions.
- [x] Admin mutation audit logs are inserted inside the same transaction as the state change.
- [x] No-op admin mutations return without writing audit logs.
- [x] Self-demotion and self-suspension safeguards remain enforced.
- [x] Last-admin and last-active-admin safeguards are checked inside the transaction.
- [x] Form moderation keeps restored forms as drafts and blocks public access after unpublish/archive.
- [x] `or(...)!` non-null assertions were removed from admin service filters.
- [x] User role/status actions now require confirmation dialogs.
- [x] Form moderation actions now require confirmation dialogs.
- [x] Users page has search, role/status filters, empty states, and pagination controls.
- [x] Forms page has search, status/visibility filters, empty states, and pagination controls.
- [x] Submissions page has pagination and optional form/creator ID filters without exposing answer values.
- [x] Audit logs page has action/target filters, empty states, and pagination controls.
- [x] Reusable admin confirmation and pagination components were added.

Verification completed:

- [x] `pnpm check-types` passed after backend hardening.
- [x] `pnpm check-types` passed after UI hardening.
- [x] `pnpm build` passed.
- [x] `git diff --check` passed.

Manual verification still recommended before production launch:

- [ ] Confirm user role/status changes create exactly one audit log.
- [ ] Confirm form unpublish/archive/restore create exactly one audit log.
- [ ] Confirm no-op admin mutations do not create audit logs.
- [ ] Confirm self-demotion, self-suspension, last-admin demotion, and last-active-admin suspension fail in UI/API.
- [ ] Confirm all admin filters and pagination controls work with seeded and larger datasets.

## Expected Files To Change

Backend:

```txt
packages/services/admin/index.ts
```

Frontend:

```txt
apps/web/custom/components/admin/admin-pages.tsx
apps/web/custom/components/admin/admin-confirm-action-dialog.tsx
apps/web/custom/components/admin/admin-pagination-controls.tsx
```

Docs:

```txt
docs/admin_fix.md
docs/plan.md
```

Only create additional files if they reduce complexity.
