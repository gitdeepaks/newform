import { and, count, db, desc, eq, ilike, or, sql, type SQL } from "@repo/database";
import { auditLogsTable, formFieldsTable, formsTable, formSubmissionsTable, usersTable } from "@repo/database/schema";
import AuditLogService from "../audit-log";
import { userRoleSchema, userStatusSchema } from "../user/model";
import { formStatusSchema, formVisibilitySchema } from "../form/model";
import {
  archiveAdminFormInputSchema,
  forceUnpublishAdminFormInputSchema,
  getAdminFormDetailInputSchema,
  getAdminUserDetailInputSchema,
  listAdminFormsInputSchema,
  listAdminSubmissionsInputSchema,
  listAdminUsersInputSchema,
  restoreAdminFormInputSchema,
  updateAdminUserRoleInputSchema,
  updateAdminUserStatusInputSchema,
  type ArchiveAdminFormInput,
  type ForceUnpublishAdminFormInput,
  type GetAdminFormDetailInput,
  type GetAdminUserDetailInput,
  type ListAdminFormsInput,
  type ListAdminSubmissionsInput,
  type ListAdminUsersInput,
  type RestoreAdminFormInput,
  type UpdateAdminUserRoleInput,
  type UpdateAdminUserStatusInput,
} from "./model";

const countSql = sql<number>`count(*)::int`;
const safeUserSelect = {
  id: usersTable.id,
  email: usersTable.email,
  fullName: usersTable.fullName,
  emailVerified: usersTable.emailVerified,
  profileImageUrl: usersTable.profileImageUrl,
  role: usersTable.role,
  status: usersTable.status,
  createdAt: usersTable.createdAt,
};

class AdminService {
  private auditLogService = new AuditLogService();

  private pagination(page: number, pageSize: number, total: number) {
    return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  private async scalarCount(table: "users" | "forms" | "formSubmissions", where?: SQL) {
    if (table === "users") {
      return (await db.select({ total: count() }).from(usersTable).where(where))[0]?.total ?? 0;
    }
    if (table === "forms") {
      return (await db.select({ total: count() }).from(formsTable).where(where))[0]?.total ?? 0;
    }
    return (await db.select({ total: count() }).from(formSubmissionsTable).where(where))[0]?.total ?? 0;
  }

  public async getDashboard() {
    const now = Date.now();
    const last24h = new Date(now - 86_400_000);
    const last7d = new Date(now - 7 * 86_400_000);
    const [totalFieldsRow] = await db.select({ total: count() }).from(formFieldsTable);
    const metrics = {
      totalUsers: await this.scalarCount("users"),
      activeUsers: await this.scalarCount("users", eq(usersTable.status, "active")),
      suspendedUsers: await this.scalarCount("users", eq(usersTable.status, "suspended")),
      adminUsers: await this.scalarCount("users", eq(usersTable.role, "admin")),
      verifiedUsers: await this.scalarCount("users", eq(usersTable.emailVerified, true)),
      totalForms: await this.scalarCount("forms"),
      publishedForms: await this.scalarCount("forms", eq(formsTable.status, "published")),
      draftForms: await this.scalarCount("forms", eq(formsTable.status, "draft")),
      archivedForms: await this.scalarCount("forms", eq(formsTable.status, "archived")),
      publicForms: await this.scalarCount("forms", eq(formsTable.visibility, "public")),
      unlistedForms: await this.scalarCount("forms", eq(formsTable.visibility, "unlisted")),
      totalFields: totalFieldsRow?.total ?? 0,
      totalSubmissions: await this.scalarCount("formSubmissions"),
      submissionsLast24h: await this.scalarCount("formSubmissions", sql`${formSubmissionsTable.submittedAt} >= ${last24h}`),
      submissionsLast7d: await this.scalarCount("formSubmissions", sql`${formSubmissionsTable.submittedAt} >= ${last7d}`),
      usersLast7d: await this.scalarCount("users", sql`${usersTable.createdAt} >= ${last7d}`),
      formsLast7d: await this.scalarCount("forms", sql`${formsTable.createdAt} >= ${last7d}`),
    };

    const recentUsers = await db.select(safeUserSelect).from(usersTable).orderBy(desc(usersTable.createdAt)).limit(5);
    const recentForms = await db
      .select({
        id: formsTable.id,
        title: formsTable.title,
        slug: formsTable.slug,
        status: formsTable.status,
        visibility: formsTable.visibility,
        createdAt: formsTable.createdAt,
        creatorEmail: usersTable.email,
      })
      .from(formsTable)
      .leftJoin(usersTable, eq(formsTable.createdBy, usersTable.id))
      .orderBy(desc(formsTable.createdAt))
      .limit(5);
    const topForms = await db
      .select({
        id: formsTable.id,
        title: formsTable.title,
        slug: formsTable.slug,
        responseCount: countSql,
      })
      .from(formsTable)
      .leftJoin(formSubmissionsTable, eq(formsTable.id, formSubmissionsTable.formId))
      .groupBy(formsTable.id)
      .orderBy(desc(countSql))
      .limit(5);

    return { metrics, recentUsers: this.parseUsers(recentUsers), recentForms, topForms };
  }

  private parseUsers<T extends { role: string; status: string }>(rows: T[]) {
    return rows.map((row) => ({ ...row, role: userRoleSchema.parse(row.role), status: userStatusSchema.parse(row.status) }));
  }

  private parseUser<T extends { role: string; status: string }>(row: T) {
    return { ...row, role: userRoleSchema.parse(row.role), status: userStatusSchema.parse(row.status) };
  }

  public async listUsers(input: ListAdminUsersInput) {
    const { page, pageSize, search, role, status } = await listAdminUsersInputSchema.parseAsync(input);
    const filters: SQL[] = [];
    if (search) filters.push(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.fullName, `%${search}%`))!);
    if (role) filters.push(eq(usersTable.role, role));
    if (status) filters.push(eq(usersTable.status, status));
    const where = filters.length > 0 ? and(...filters) : undefined;
    const total = await this.scalarCount("users", where);
    const rows = await db.select(safeUserSelect).from(usersTable).where(where).orderBy(desc(usersTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
    return { rows: this.parseUsers(rows), pagination: this.pagination(page, pageSize, total) };
  }

  public async getUserDetail(input: GetAdminUserDetailInput) {
    const { userId } = await getAdminUserDetailInputSchema.parseAsync(input);
    const [user] = await db.select(safeUserSelect).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) throw new Error(`User With ${userId} Not Found`);
    const formCount = await this.scalarCount("forms", eq(formsTable.createdBy, userId));
    const publishedFormCount = await this.scalarCount("forms", and(eq(formsTable.createdBy, userId), eq(formsTable.status, "published")));
    const [submissionRow] = await db
      .select({ total: count() })
      .from(formSubmissionsTable)
      .innerJoin(formsTable, eq(formSubmissionsTable.formId, formsTable.id))
      .where(eq(formsTable.createdBy, userId));
    const recentForms = await db.select({ id: formsTable.id, title: formsTable.title, slug: formsTable.slug, status: formsTable.status, visibility: formsTable.visibility, createdAt: formsTable.createdAt }).from(formsTable).where(eq(formsTable.createdBy, userId)).orderBy(desc(formsTable.createdAt)).limit(5);
    const auditLogs = await this.auditLogService.listAuditLogs({ targetType: "user", targetId: userId, page: 1, pageSize: 10 });
    return { user: this.parseUser(user), formCount, publishedFormCount, submissionCount: submissionRow?.total ?? 0, recentForms, auditLogs: auditLogs.rows };
  }

  public async updateUserRole(input: UpdateAdminUserRoleInput) {
    const { actorUserId, userId, role } = await updateAdminUserRoleInputSchema.parseAsync(input);
    if (actorUserId === userId && role !== "admin") throw new Error("Admins cannot demote themselves");
    const [user] = await db.select(safeUserSelect).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) throw new Error(`User With ${userId} Not Found`);
    const previousRole = userRoleSchema.parse(user.role);
    if (previousRole === role) return this.parseUser(user);
    if (previousRole === "admin" && role === "user") {
      const adminCount = await this.scalarCount("users", eq(usersTable.role, "admin"));
      if (adminCount <= 1) throw new Error("Cannot demote the last admin");
    }
    const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, userId)).returning(safeUserSelect);
    await this.auditLogService.createAuditLog({ actorUserId, action: "USER_ROLE_UPDATED", targetType: "user", targetId: userId, metadata: { previousRole, nextRole: role } });
    return this.parseUser(updated ?? user);
  }

  public async updateUserStatus(input: UpdateAdminUserStatusInput) {
    const { actorUserId, userId, status } = await updateAdminUserStatusInputSchema.parseAsync(input);
    if (actorUserId === userId && status === "suspended") throw new Error("Admins cannot suspend themselves");
    const [user] = await db.select(safeUserSelect).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) throw new Error(`User With ${userId} Not Found`);
    const previousStatus = userStatusSchema.parse(user.status);
    const currentRole = userRoleSchema.parse(user.role);
    if (previousStatus === status) return this.parseUser(user);
    if (currentRole === "admin" && status === "suspended") {
      const activeAdminCount = await this.scalarCount("users", and(eq(usersTable.role, "admin"), eq(usersTable.status, "active")));
      if (activeAdminCount <= 1) throw new Error("Cannot suspend the last active admin");
    }
    const [updated] = await db.update(usersTable).set({ status }).where(eq(usersTable.id, userId)).returning(safeUserSelect);
    await this.auditLogService.createAuditLog({ actorUserId, action: "USER_STATUS_UPDATED", targetType: "user", targetId: userId, metadata: { previousStatus, nextStatus: status } });
    return this.parseUser(updated ?? user);
  }

  public async listForms(input: ListAdminFormsInput) {
    const { page, pageSize, search, status, visibility, creatorId } = await listAdminFormsInputSchema.parseAsync(input);
    const filters: SQL[] = [];
    if (search) filters.push(or(ilike(formsTable.title, `%${search}%`), ilike(formsTable.slug, `%${search}%`), ilike(usersTable.email, `%${search}%`))!);
    if (status) filters.push(eq(formsTable.status, status));
    if (visibility) filters.push(eq(formsTable.visibility, visibility));
    if (creatorId) filters.push(eq(formsTable.createdBy, creatorId));
    const where = filters.length > 0 ? and(...filters) : undefined;
    const [totalRow] = await db.select({ total: count() }).from(formsTable).leftJoin(usersTable, eq(formsTable.createdBy, usersTable.id)).where(where);
    const rows = await db.select({ id: formsTable.id, title: formsTable.title, slug: formsTable.slug, status: formsTable.status, visibility: formsTable.visibility, creatorId: formsTable.createdBy, creatorEmail: usersTable.email, creatorFullName: usersTable.fullName, createdAt: formsTable.createdAt, updatedAt: formsTable.updatedAt, publishedAt: formsTable.publishedAt }).from(formsTable).leftJoin(usersTable, eq(formsTable.createdBy, usersTable.id)).where(where).orderBy(desc(formsTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
    return { rows: rows.map((row) => ({ ...row, status: formStatusSchema.parse(row.status), visibility: formVisibilitySchema.parse(row.visibility) })), pagination: this.pagination(page, pageSize, totalRow?.total ?? 0) };
  }

  public async getFormDetail(input: GetAdminFormDetailInput) {
    const { formId } = await getAdminFormDetailInputSchema.parseAsync(input);
    const [form] = await db.select({ id: formsTable.id, title: formsTable.title, description: formsTable.description, slug: formsTable.slug, status: formsTable.status, visibility: formsTable.visibility, creatorId: formsTable.createdBy, creatorEmail: usersTable.email, creatorFullName: usersTable.fullName, createdAt: formsTable.createdAt, updatedAt: formsTable.updatedAt, publishedAt: formsTable.publishedAt }).from(formsTable).leftJoin(usersTable, eq(formsTable.createdBy, usersTable.id)).where(eq(formsTable.id, formId)).limit(1);
    if (!form) throw new Error(`Form With ${formId} Not Found`);
    const fields = await db.select({ id: formFieldsTable.id, label: formFieldsTable.label, type: formFieldsTable.type, isRequired: formFieldsTable.isRequired, index: formFieldsTable.index }).from(formFieldsTable).where(eq(formFieldsTable.formId, formId)).orderBy(formFieldsTable.index);
    const responseCount = await this.scalarCount("formSubmissions", eq(formSubmissionsTable.formId, formId));
    const recentSubmissions = await db.select({ id: formSubmissionsTable.id, respondentEmail: formSubmissionsTable.respondentEmail, metadata: formSubmissionsTable.metadata, submittedAt: formSubmissionsTable.submittedAt, valueCount: sql<number>`coalesce(json_array_length(${formSubmissionsTable.values}), 0)::int` }).from(formSubmissionsTable).where(eq(formSubmissionsTable.formId, formId)).orderBy(desc(formSubmissionsTable.submittedAt)).limit(10);
    const auditLogs = await this.auditLogService.listAuditLogs({ targetType: "form", targetId: formId, page: 1, pageSize: 10 });
    return { form: { ...form, status: formStatusSchema.parse(form.status), visibility: formVisibilitySchema.parse(form.visibility) }, fields, responseCount, recentSubmissions, auditLogs: auditLogs.rows };
  }

  private async moderateForm(formId: string, actorUserId: string, nextStatus: "draft" | "archived", action: "FORM_FORCE_UNPUBLISHED" | "FORM_ARCHIVED" | "FORM_RESTORED") {
    const [form] = await db.select({ id: formsTable.id, status: formsTable.status }).from(formsTable).where(eq(formsTable.id, formId)).limit(1);
    if (!form) throw new Error(`Form With ${formId} Not Found`);
    const previousStatus = formStatusSchema.parse(form.status);
    if (previousStatus === nextStatus) return { id: formId, status: previousStatus, changed: false };
    if (action === "FORM_RESTORED" && previousStatus !== "archived") return { id: formId, status: previousStatus, changed: false };
    await db.update(formsTable).set({ status: nextStatus, publishedAt: null }).where(eq(formsTable.id, formId));
    await this.auditLogService.createAuditLog({ actorUserId, action, targetType: "form", targetId: formId, metadata: { previousStatus, nextStatus } });
    return { id: formId, status: nextStatus, changed: true };
  }

  public async forceUnpublishForm(input: ForceUnpublishAdminFormInput) {
    const { actorUserId, formId } = await forceUnpublishAdminFormInputSchema.parseAsync(input);
    return this.moderateForm(formId, actorUserId, "draft", "FORM_FORCE_UNPUBLISHED");
  }

  public async archiveForm(input: ArchiveAdminFormInput) {
    const { actorUserId, formId } = await archiveAdminFormInputSchema.parseAsync(input);
    return this.moderateForm(formId, actorUserId, "archived", "FORM_ARCHIVED");
  }

  public async restoreForm(input: RestoreAdminFormInput) {
    const { actorUserId, formId } = await restoreAdminFormInputSchema.parseAsync(input);
    return this.moderateForm(formId, actorUserId, "draft", "FORM_RESTORED");
  }

  public async listSubmissions(input: ListAdminSubmissionsInput) {
    const { page, pageSize, formId, creatorId } = await listAdminSubmissionsInputSchema.parseAsync(input);
    const filters: SQL[] = [];
    if (formId) filters.push(eq(formSubmissionsTable.formId, formId));
    if (creatorId) filters.push(eq(formsTable.createdBy, creatorId));
    const where = filters.length > 0 ? and(...filters) : undefined;
    const [totalRow] = await db.select({ total: count() }).from(formSubmissionsTable).leftJoin(formsTable, eq(formSubmissionsTable.formId, formsTable.id)).where(where);
    const rows = await db.select({ id: formSubmissionsTable.id, formId: formSubmissionsTable.formId, formTitle: formsTable.title, formSlug: formsTable.slug, creatorEmail: usersTable.email, respondentEmail: formSubmissionsTable.respondentEmail, metadata: formSubmissionsTable.metadata, submittedAt: formSubmissionsTable.submittedAt, valueCount: sql<number>`coalesce(json_array_length(${formSubmissionsTable.values}), 0)::int` }).from(formSubmissionsTable).leftJoin(formsTable, eq(formSubmissionsTable.formId, formsTable.id)).leftJoin(usersTable, eq(formsTable.createdBy, usersTable.id)).where(where).orderBy(desc(formSubmissionsTable.submittedAt)).limit(pageSize).offset((page - 1) * pageSize);
    return { rows, pagination: this.pagination(page, pageSize, totalRow?.total ?? 0) };
  }
}

export default AdminService;
