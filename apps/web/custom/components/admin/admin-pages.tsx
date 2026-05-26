"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardShell } from "@/custom/components/dashboard/dashboard-shell";
import { useUser } from "@/hooks/api/auth";
import { useAdminAuditLogs, useAdminDashboard, useAdminFormDetail, useAdminForms, useAdminSubmissions, useAdminUserDetail, useAdminUsers, useArchiveAdminForm, useForceUnpublishAdminForm, useRestoreAdminForm, useUpdateAdminUserRole, useUpdateAdminUserStatus } from "@/hooks/api/admin";
import { formatDate, formatMetadata } from "@/custom/lib/admin/admin-formatting";

function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  if (isLoading) return <DashboardShell><main className="p-6">Loading admin access...</main></DashboardShell>;
  if (user?.role !== "admin") return <DashboardShell><main className="p-6"><Card><CardHeader><CardTitle>Forbidden</CardTitle><CardDescription>Admin access is required.</CardDescription></CardHeader></Card></main></DashboardShell>;
  return <DashboardShell><main className="space-y-6 p-4 md:p-6"><AdminNav />{children}</main></DashboardShell>;
}

function AdminNav() {
  return <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href="/admin">Dashboard</Link></Button><Button asChild variant="outline" size="sm"><Link href="/admin/users">Users</Link></Button><Button asChild variant="outline" size="sm"><Link href="/admin/forms">Forms</Link></Button><Button asChild variant="outline" size="sm"><Link href="/admin/submissions">Submissions</Link></Button><Button asChild variant="outline" size="sm"><Link href="/admin/audit-logs">Audit Logs</Link></Button></div>;
}

function StatusBadge({ value }: { value: string | null }) {
  return <Badge variant={value === "suspended" || value === "archived" ? "destructive" : value === "admin" || value === "published" || value === "active" ? "default" : "secondary"}>{value ?? "-"}</Badge>;
}

export function AdminDashboardPage() {
  const { data, isLoading, error } = useAdminDashboard();
  const metrics = data?.metrics;
  const cards = metrics ? Object.entries(metrics) : [];
  return <AdminLayout><section><h1 className="text-2xl font-semibold">Admin Dashboard</h1><p className="text-sm text-muted-foreground">Platform health, recent activity, and moderation shortcuts.</p></section>{isLoading && <p>Loading metrics...</p>}{error && <p className="text-destructive">{error.message}</p>}<div className="grid gap-3 md:grid-cols-4">{cards.map(([key, value]) => <Card key={key}><CardHeader className="pb-2"><CardDescription>{key.replace(/([A-Z])/g, " $1")}</CardDescription><CardTitle>{value}</CardTitle></CardHeader></Card>)}</div><div className="grid gap-4 lg:grid-cols-3"><SimpleList title="Recent Users" rows={data?.recentUsers.map((user) => `${user.email} (${user.role})`) ?? []} /><SimpleList title="Recent Forms" rows={data?.recentForms.map((form) => `${form.title} (${form.status})`) ?? []} /><SimpleList title="Top Forms" rows={data?.topForms.map((form) => `${form.title}: ${form.responseCount}`) ?? []} /></div></AdminLayout>;
}

function SimpleList({ title, rows }: { title: string; rows: string[] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{rows.length === 0 ? <p className="text-muted-foreground">No data.</p> : rows.map((row) => <p key={row}>{row}</p>)}</CardContent></Card>;
}

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const { data } = useAdminUsers({ page: 1, pageSize: 50, search: search || undefined });
  const roleMutation = useUpdateAdminUserRole();
  const statusMutation = useUpdateAdminUserStatus();
  const changeRole = async (userId: string, role: "user" | "admin") => { try { await roleMutation.mutateAsync({ userId, role }); toast.success("Role updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update role"); } };
  const changeStatus = async (userId: string, status: "active" | "suspended") => { try { await statusMutation.mutateAsync({ userId, status }); toast.success("Status updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update status"); } };
  return <AdminLayout><h1 className="text-2xl font-semibold">Users</h1><Input placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} /><Card><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{data?.rows.map((user) => <TableRow key={user.id}><TableCell><Link className="font-medium underline" href={`/admin/users/${user.id}`}>{user.email}</Link><div className="text-xs text-muted-foreground">{user.fullName}</div></TableCell><TableCell><StatusBadge value={user.role} /></TableCell><TableCell><StatusBadge value={user.status} /></TableCell><TableCell>{formatDate(user.createdAt)}</TableCell><TableCell className="space-x-2"><Button size="sm" variant="outline" onClick={() => changeRole(user.id, user.role === "admin" ? "user" : "admin")}>{user.role === "admin" ? "Demote" : "Promote"}</Button><Button size="sm" variant="outline" onClick={() => changeStatus(user.id, user.status === "active" ? "suspended" : "active")}>{user.status === "active" ? "Suspend" : "Activate"}</Button></TableCell></TableRow>)}</TableBody></Table></Card></AdminLayout>;
}

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const { data, error } = useAdminUserDetail(userId);
  return <AdminLayout><h1 className="text-2xl font-semibold">User Detail</h1>{error && <p className="text-destructive">{error.message}</p>}{data && <><Card><CardHeader><CardTitle>{data.user.email}</CardTitle><CardDescription>{data.user.fullName}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><StatusBadge value={data.user.role} /><StatusBadge value={data.user.status} /><span>Forms: {data.formCount}</span><span>Published: {data.publishedFormCount}</span><span>Submissions: {data.submissionCount}</span></CardContent></Card><SimpleList title="Recent Forms" rows={data.recentForms.map((form) => `${form.title} (${form.status})`)} /><AuditTable rows={data.auditLogs} /></>}</AdminLayout>;
}

export function AdminFormsPage() {
  const [search, setSearch] = useState("");
  const { data } = useAdminForms({ page: 1, pageSize: 50, search: search || undefined });
  const archive = useArchiveAdminForm();
  const restore = useRestoreAdminForm();
  const unpublish = useForceUnpublishAdminForm();
  const moderate = async (formId: string, action: "archive" | "restore" | "unpublish") => { try { if (action === "archive") await archive.mutateAsync({ formId }); if (action === "restore") await restore.mutateAsync({ formId }); if (action === "unpublish") await unpublish.mutateAsync({ formId }); toast.success("Form updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update form"); } };
  return <AdminLayout><h1 className="text-2xl font-semibold">Forms</h1><Input placeholder="Search forms" value={search} onChange={(event) => setSearch(event.target.value)} /><Card><Table><TableHeader><TableRow><TableHead>Form</TableHead><TableHead>Creator</TableHead><TableHead>Status</TableHead><TableHead>Visibility</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{data?.rows.map((form) => <TableRow key={form.id}><TableCell><Link className="font-medium underline" href={`/admin/forms/${form.id}`}>{form.title}</Link><div className="text-xs text-muted-foreground">/{form.slug}</div></TableCell><TableCell>{form.creatorEmail ?? "-"}</TableCell><TableCell><StatusBadge value={form.status} /></TableCell><TableCell><StatusBadge value={form.visibility} /></TableCell><TableCell className="space-x-2"><Button size="sm" variant="outline" onClick={() => moderate(form.id, "unpublish")}>Unpublish</Button><Button size="sm" variant="outline" onClick={() => moderate(form.id, "archive")}>Archive</Button><Button size="sm" variant="outline" onClick={() => moderate(form.id, "restore")}>Restore</Button></TableCell></TableRow>)}</TableBody></Table></Card></AdminLayout>;
}

export function AdminFormDetailPage({ formId }: { formId: string }) {
  const { data, error } = useAdminFormDetail(formId);
  return <AdminLayout><h1 className="text-2xl font-semibold">Form Detail</h1>{error && <p className="text-destructive">{error.message}</p>}{data && <><Card><CardHeader><CardTitle>{data.form.title}</CardTitle><CardDescription>{data.form.creatorEmail ?? "Unknown creator"}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><StatusBadge value={data.form.status} /><StatusBadge value={data.form.visibility} /><span>Responses: {data.responseCount}</span></CardContent></Card><SimpleList title="Fields" rows={data.fields.map((field) => `${field.index}. ${field.label} (${field.type})`)} /><SimpleList title="Recent Submissions" rows={data.recentSubmissions.map((submission) => `${formatDate(submission.submittedAt)} - ${submission.respondentEmail ?? "anonymous"} - ${submission.valueCount} values`)} /><AuditTable rows={data.auditLogs} /></>}</AdminLayout>;
}

export function AdminSubmissionsPage() {
  const { data } = useAdminSubmissions({ page: 1, pageSize: 50 });
  return <AdminLayout><h1 className="text-2xl font-semibold">Submissions</h1><Card><Table><TableHeader><TableRow><TableHead>Submitted</TableHead><TableHead>Form</TableHead><TableHead>Creator</TableHead><TableHead>Respondent</TableHead><TableHead>Values</TableHead><TableHead>Metadata</TableHead></TableRow></TableHeader><TableBody>{data?.rows.map((row) => <TableRow key={row.id}><TableCell>{formatDate(row.submittedAt)}</TableCell><TableCell>{row.formTitle}</TableCell><TableCell>{row.creatorEmail}</TableCell><TableCell>{row.respondentEmail ?? "anonymous"}</TableCell><TableCell>{row.valueCount}</TableCell><TableCell>{row.metadata?.ip ?? "-"}</TableCell></TableRow>)}</TableBody></Table></Card></AdminLayout>;
}

export function AdminAuditLogsPage() {
  const { data } = useAdminAuditLogs({ page: 1, pageSize: 50 });
  return <AdminLayout><h1 className="text-2xl font-semibold">Audit Logs</h1><AuditTable rows={data?.rows ?? []} /></AdminLayout>;
}

function AuditTable({ rows }: { rows: { id: string; actorEmail: string | null; action: string; targetType: string; targetId: string; metadata: Record<string, string | number | boolean | null> | null; createdAt: Date | string | null }[] }) {
  return <Card><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Metadata</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{formatDate(row.createdAt)}</TableCell><TableCell>{row.actorEmail ?? "-"}</TableCell><TableCell>{row.action}</TableCell><TableCell>{row.targetType}:{row.targetId}</TableCell><TableCell>{formatMetadata(row.metadata)}</TableCell></TableRow>)}</TableBody></Table></Card>;
}
