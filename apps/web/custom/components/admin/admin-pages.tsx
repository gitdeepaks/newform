"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminConfirmActionDialog } from "@/custom/components/admin/admin-confirm-action-dialog";
import { AdminPaginationControls } from "@/custom/components/admin/admin-pagination-controls";
import { DashboardShell } from "@/custom/components/dashboard/dashboard-shell";
import { formatDate, formatMetadata } from "@/custom/lib/admin/admin-formatting";
import {
  useAdminAuditLogs,
  useAdminDashboard,
  useAdminFormDetail,
  useAdminForms,
  useAdminSubmissions,
  useAdminUserDetail,
  useAdminUsers,
  useArchiveAdminForm,
  useForceUnpublishAdminForm,
  useRestoreAdminForm,
  useUpdateAdminUserRole,
  useUpdateAdminUserStatus,
} from "@/hooks/api/admin";
import { useUser } from "@/hooks/api/auth";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type UserRoleFilter = "all" | "user" | "admin";
type UserStatusFilter = "all" | "active" | "suspended";
type FormStatusFilter = "all" | "draft" | "published" | "archived";
type FormVisibilityFilter = "all" | "public" | "unlisted";
type AuditAction =
  | "USER_ROLE_UPDATED"
  | "USER_STATUS_UPDATED"
  | "FORM_FORCE_UNPUBLISHED"
  | "FORM_ARCHIVED"
  | "FORM_RESTORED";
type AuditActionFilter = "all" | AuditAction;
type AuditTargetTypeFilter = "all" | "user" | "form";

const auditActions: AuditAction[] = [
  "USER_ROLE_UPDATED",
  "USER_STATUS_UPDATED",
  "FORM_FORCE_UNPUBLISHED",
  "FORM_ARCHIVED",
  "FORM_RESTORED",
];

function toUserRoleFilter(value: string): UserRoleFilter {
  if (value === "user" || value === "admin") return value;
  return "all";
}

function toUserStatusFilter(value: string): UserStatusFilter {
  if (value === "active" || value === "suspended") return value;
  return "all";
}

function toFormStatusFilter(value: string): FormStatusFilter {
  if (value === "draft" || value === "published" || value === "archived") return value;
  return "all";
}

function toFormVisibilityFilter(value: string): FormVisibilityFilter {
  if (value === "public" || value === "unlisted") return value;
  return "all";
}

function toAuditActionFilter(value: string): AuditActionFilter {
  if (
    value === "USER_ROLE_UPDATED" ||
    value === "USER_STATUS_UPDATED" ||
    value === "FORM_FORCE_UNPUBLISHED" ||
    value === "FORM_ARCHIVED" ||
    value === "FORM_RESTORED"
  ) {
    return value;
  }
  return "all";
}

function toAuditTargetTypeFilter(value: string): AuditTargetTypeFilter {
  if (value === "user" || value === "form") return value;
  return "all";
}

function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <DashboardShell>
        <main className="p-6">Loading admin access...</main>
      </DashboardShell>
    );
  }

  if (user?.role !== "admin") {
    return (
      <DashboardShell>
        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Forbidden</CardTitle>
              <CardDescription>Admin access is required.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <main className="space-y-6 p-4 md:p-6">
        <AdminNav />
        {children}
      </main>
    </DashboardShell>
  );
}

function AdminNav() {
  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/forms", label: "Forms" },
    { href: "/admin/submissions", label: "Submissions" },
    { href: "/admin/audit-logs", label: "Audit Logs" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Button key={link.href} asChild variant="outline" size="sm">
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
    </div>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  return (
    <Badge
      variant={
        value === "suspended" || value === "archived"
          ? "destructive"
          : value === "admin" || value === "published" || value === "active"
            ? "default"
            : "secondary"
      }
    >
      {value ?? "-"}
    </Badge>
  );
}

function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading, error } = useAdminDashboard();
  const cards = data?.metrics ? Object.entries(data.metrics) : [];

  return (
    <AdminLayout>
      <section>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform health, recent activity, and moderation shortcuts.
        </p>
      </section>
      {isLoading ? <p>Loading metrics...</p> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardDescription>{key.replace(/([A-Z])/g, " $1")}</CardDescription>
              <CardTitle>{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SimpleList title="Recent Users" rows={data?.recentUsers.map((user) => `${user.email} (${user.role})`) ?? []} />
        <SimpleList title="Recent Forms" rows={data?.recentForms.map((form) => `${form.title} (${form.status})`) ?? []} />
        <SimpleList title="Top Forms" rows={data?.topForms.map((form) => `${form.title}: ${form.responseCount}`) ?? []} />
      </div>
    </AdminLayout>
  );
}

function SimpleList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? <p className="text-muted-foreground">No data.</p> : rows.map((row) => <p key={row}>{row}</p>)}
      </CardContent>
    </Card>
  );
}

export function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRoleFilter>("all");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, error } = useAdminUsers({
    page,
    pageSize,
    search: search || undefined,
    role: role === "all" ? undefined : role,
    status: status === "all" ? undefined : status,
  });
  const roleMutation = useUpdateAdminUserRole();
  const statusMutation = useUpdateAdminUserStatus();
  const isMutating = roleMutation.isPending || statusMutation.isPending;

  function resetPage() {
    setPage(1);
  }

  async function changeRole(userId: string, nextRole: "user" | "admin") {
    try {
      await roleMutation.mutateAsync({ userId, role: nextRole });
      toast.success("Role updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  }

  async function changeStatus(userId: string, nextStatus: "active" | "suspended") {
    try {
      await statusMutation.mutateAsync({ userId, status: nextStatus });
      toast.success("Status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder="Search users" value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} />
        <NativeSelect value={role} onChange={(event) => { setRole(toUserRoleFilter(event.target.value)); resetPage(); }}>
          <NativeSelectOption value="all">All roles</NativeSelectOption>
          <NativeSelectOption value="user">Users</NativeSelectOption>
          <NativeSelectOption value="admin">Admins</NativeSelectOption>
        </NativeSelect>
        <NativeSelect value={status} onChange={(event) => { setStatus(toUserStatusFilter(event.target.value)); resetPage(); }}>
          <NativeSelectOption value="all">All statuses</NativeSelectOption>
          <NativeSelectOption value="active">Active</NativeSelectOption>
          <NativeSelectOption value="suspended">Suspended</NativeSelectOption>
        </NativeSelect>
      </div>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <EmptyTableRow colSpan={5} message="Loading users..." /> : null}
            {!isLoading && data?.rows.length === 0 ? <EmptyTableRow colSpan={5} message="No users found." /> : null}
            {data?.rows.map((user) => {
              const nextRole = user.role === "admin" ? "user" : "admin";
              const nextStatus = user.status === "active" ? "suspended" : "active";
              const isCurrentUser = currentUser?.id === user.id;
              const roleActionDisabled = isMutating || (isCurrentUser && user.role === "admin");
              const statusActionDisabled =
                isMutating || (isCurrentUser && user.status === "active");
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link className="font-medium underline" href={`/admin/users/${user.id}`}>{user.email}</Link>
                    <div className="text-xs text-muted-foreground">{user.fullName}</div>
                  </TableCell>
                  <TableCell><StatusBadge value={user.role} /></TableCell>
                  <TableCell><StatusBadge value={user.status} /></TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="space-x-2">
                    <AdminConfirmActionDialog
                      trigger={<Button size="sm" variant="outline" disabled={roleActionDisabled} title={isCurrentUser && user.role === "admin" ? "You cannot demote yourself" : undefined}>{user.role === "admin" ? "Demote" : "Promote"}</Button>}
                      title={user.role === "admin" ? "Demote admin?" : "Promote user to admin?"}
                      description={user.role === "admin" ? `${user.email} will lose admin access.` : `${user.email} will gain full admin access.`}
                      confirmLabel={user.role === "admin" ? "Demote admin" : "Promote user"}
                      pendingLabel="Updating..."
                      variant={user.role === "admin" ? "destructive" : "default"}
                      isPending={roleMutation.isPending}
                      onConfirm={() => changeRole(user.id, nextRole)}
                    />
                    <AdminConfirmActionDialog
                      trigger={<Button size="sm" variant="outline" disabled={statusActionDisabled} title={isCurrentUser && user.status === "active" ? "You cannot suspend yourself" : undefined}>{user.status === "active" ? "Suspend" : "Activate"}</Button>}
                      title={user.status === "active" ? "Suspend user?" : "Reactivate user?"}
                      description={user.status === "active" ? `${user.email} will be blocked from protected app access.` : `${user.email} will regain protected app access.`}
                      confirmLabel={user.status === "active" ? "Suspend user" : "Reactivate user"}
                      pendingLabel="Updating..."
                      variant={user.status === "active" ? "destructive" : "default"}
                      isPending={statusMutation.isPending}
                      onConfirm={() => changeStatus(user.id, nextStatus)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {data ? <AdminPaginationControls {...data.pagination} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /> : null}
      </Card>
    </AdminLayout>
  );
}

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const { data, error } = useAdminUserDetail(userId);
  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold">User Detail</h1>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{data.user.email}</CardTitle>
              <CardDescription>{data.user.fullName}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <StatusBadge value={data.user.role} />
              <StatusBadge value={data.user.status} />
              <span>Forms: {data.formCount}</span>
              <span>Published: {data.publishedFormCount}</span>
              <span>Submissions: {data.submissionCount}</span>
            </CardContent>
          </Card>
          <SimpleList title="Recent Forms" rows={data.recentForms.map((form) => `${form.title} (${form.status})`)} />
          <AuditTable rows={data.auditLogs} />
        </>
      ) : null}
    </AdminLayout>
  );
}

export function AdminFormsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FormStatusFilter>("all");
  const [visibility, setVisibility] = useState<FormVisibilityFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, error } = useAdminForms({
    page,
    pageSize,
    search: search || undefined,
    status: status === "all" ? undefined : status,
    visibility: visibility === "all" ? undefined : visibility,
  });
  const archive = useArchiveAdminForm();
  const restore = useRestoreAdminForm();
  const unpublish = useForceUnpublishAdminForm();
  const isMutating = archive.isPending || restore.isPending || unpublish.isPending;

  function resetPage() {
    setPage(1);
  }

  async function moderate(formId: string, action: "archive" | "restore" | "unpublish") {
    try {
      if (action === "archive") await archive.mutateAsync({ formId });
      if (action === "restore") await restore.mutateAsync({ formId });
      if (action === "unpublish") await unpublish.mutateAsync({ formId });
      toast.success("Form updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update form");
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold">Forms</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder="Search forms" value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} />
        <NativeSelect value={status} onChange={(event) => { setStatus(toFormStatusFilter(event.target.value)); resetPage(); }}>
          <NativeSelectOption value="all">All statuses</NativeSelectOption>
          <NativeSelectOption value="draft">Draft</NativeSelectOption>
          <NativeSelectOption value="published">Published</NativeSelectOption>
          <NativeSelectOption value="archived">Archived</NativeSelectOption>
        </NativeSelect>
        <NativeSelect value={visibility} onChange={(event) => { setVisibility(toFormVisibilityFilter(event.target.value)); resetPage(); }}>
          <NativeSelectOption value="all">All visibility</NativeSelectOption>
          <NativeSelectOption value="public">Public</NativeSelectOption>
          <NativeSelectOption value="unlisted">Unlisted</NativeSelectOption>
        </NativeSelect>
      </div>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <EmptyTableRow colSpan={5} message="Loading forms..." /> : null}
            {!isLoading && data?.rows.length === 0 ? <EmptyTableRow colSpan={5} message="No forms found." /> : null}
            {data?.rows.map((form) => (
              <TableRow key={form.id}>
                <TableCell>
                  <Link className="font-medium underline" href={`/admin/forms/${form.id}`}>{form.title}</Link>
                  <div className="text-xs text-muted-foreground">/{form.slug}</div>
                </TableCell>
                <TableCell>{form.creatorEmail ?? "-"}</TableCell>
                <TableCell><StatusBadge value={form.status} /></TableCell>
                <TableCell><StatusBadge value={form.visibility} /></TableCell>
                <TableCell className="space-x-2">
                  <AdminConfirmActionDialog
                    trigger={<Button size="sm" variant="outline" disabled={isMutating || form.status !== "published"}>Unpublish</Button>}
                    title="Force unpublish form?"
                    description={`${form.title} will stop accepting public responses immediately.`}
                    confirmLabel="Force unpublish"
                    pendingLabel="Unpublishing..."
                    variant="destructive"
                    isPending={unpublish.isPending}
                    onConfirm={() => moderate(form.id, "unpublish")}
                  />
                  <AdminConfirmActionDialog
                    trigger={<Button size="sm" variant="outline" disabled={isMutating || form.status === "archived"}>Archive</Button>}
                    title="Archive form?"
                    description={`${form.title} will be archived. Public access stops and responses are kept.`}
                    confirmLabel="Archive form"
                    pendingLabel="Archiving..."
                    variant="destructive"
                    isPending={archive.isPending}
                    onConfirm={() => moderate(form.id, "archive")}
                  />
                  <AdminConfirmActionDialog
                    trigger={<Button size="sm" variant="outline" disabled={isMutating || form.status !== "archived"}>Restore</Button>}
                    title="Restore form as draft?"
                    description={`${form.title} will be restored as draft, not published.`}
                    confirmLabel="Restore as draft"
                    pendingLabel="Restoring..."
                    isPending={restore.isPending}
                    onConfirm={() => moderate(form.id, "restore")}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data ? <AdminPaginationControls {...data.pagination} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /> : null}
      </Card>
    </AdminLayout>
  );
}

export function AdminFormDetailPage({ formId }: { formId: string }) {
  const { data, error } = useAdminFormDetail(formId);
  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold">Form Detail</h1>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{data.form.title}</CardTitle>
              <CardDescription>{data.form.creatorEmail ?? "Unknown creator"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <StatusBadge value={data.form.status} />
              <StatusBadge value={data.form.visibility} />
              <span>Responses: {data.responseCount}</span>
            </CardContent>
          </Card>
          <SimpleList title="Fields" rows={data.fields.map((field) => `${field.index}. ${field.label} (${field.type})`)} />
          <SimpleList title="Recent Submissions" rows={data.recentSubmissions.map((submission) => `${formatDate(submission.submittedAt)} - ${submission.respondentEmail ?? "anonymous"} - ${submission.valueCount} values`)} />
          <AuditTable rows={data.auditLogs} />
        </>
      ) : null}
    </AdminLayout>
  );
}

export function AdminSubmissionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formId, setFormId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const { data, isLoading, error } = useAdminSubmissions({
    page,
    pageSize,
    formId: formId || undefined,
    creatorId: creatorId || undefined,
  });

  function resetPage() {
    setPage(1);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold">Submissions</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Filter by form ID" value={formId} onChange={(event) => { setFormId(event.target.value); resetPage(); }} />
        <Input placeholder="Filter by creator ID" value={creatorId} onChange={(event) => { setCreatorId(event.target.value); resetPage(); }} />
      </div>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Respondent</TableHead>
              <TableHead>Values</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <EmptyTableRow colSpan={6} message="Loading submissions..." /> : null}
            {!isLoading && data?.rows.length === 0 ? <EmptyTableRow colSpan={6} message="No submissions found." /> : null}
            {data?.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.submittedAt)}</TableCell>
                <TableCell>{row.formTitle}</TableCell>
                <TableCell>{row.creatorEmail}</TableCell>
                <TableCell>{row.respondentEmail ?? "anonymous"}</TableCell>
                <TableCell>{row.valueCount}</TableCell>
                <TableCell>{row.metadata?.ip ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data ? <AdminPaginationControls {...data.pagination} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /> : null}
      </Card>
    </AdminLayout>
  );
}

export function AdminAuditLogsPage() {
  const [action, setAction] = useState<AuditActionFilter>("all");
  const [targetType, setTargetType] = useState<AuditTargetTypeFilter>("all");
  const [targetId, setTargetId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, error } = useAdminAuditLogs({
    page,
    pageSize,
    action: action === "all" ? undefined : action,
    targetType: targetType === "all" ? undefined : targetType,
    targetId: targetId || undefined,
  });

  function resetPage() {
    setPage(1);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold">Audit Logs</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <NativeSelect value={action} onChange={(event) => { setAction(toAuditActionFilter(event.target.value)); resetPage(); }}>
          <NativeSelectOption value="all">All actions</NativeSelectOption>
          {auditActions.map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect value={targetType} onChange={(event) => { setTargetType(toAuditTargetTypeFilter(event.target.value)); resetPage(); }}>
          <NativeSelectOption value="all">All targets</NativeSelectOption>
          <NativeSelectOption value="user">User</NativeSelectOption>
          <NativeSelectOption value="form">Form</NativeSelectOption>
        </NativeSelect>
        <Input placeholder="Target ID" value={targetId} onChange={(event) => { setTargetId(event.target.value); resetPage(); }} />
      </div>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading audit logs...</CardContent></Card> : <AuditTable rows={data?.rows ?? []} />}
      {data ? <AdminPaginationControls {...data.pagination} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /> : null}
    </AdminLayout>
  );
}

function AuditTable({
  rows,
}: {
  rows: {
    id: string;
    actorEmail: string | null;
    action: string;
    targetType: string;
    targetId: string;
    metadata: Record<string, string | number | boolean | null> | null;
    createdAt: Date | string | null;
  }[];
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Metadata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? <EmptyTableRow colSpan={5} message="No audit logs found." /> : null}
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{formatDate(row.createdAt)}</TableCell>
              <TableCell>{row.actorEmail ?? "-"}</TableCell>
              <TableCell>{row.action}</TableCell>
              <TableCell>{row.targetType}:{row.targetId}</TableCell>
              <TableCell>{formatMetadata(row.metadata)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
