import { and, count, db, desc, eq, type SQL } from "@repo/database";
import { auditLogsTable, usersTable } from "@repo/database/schema";
import {
  auditLogActionSchema,
  auditLogTargetTypeSchema,
  createAuditLogInputSchema,
  listAuditLogsInputSchema,
  type CreateAuditLogInput,
  type ListAuditLogsInput,
} from "./model";

class AuditLogService {
  public async createAuditLog(input: CreateAuditLogInput) {
    const parsed = await createAuditLogInputSchema.parseAsync(input);
    const [row] = await db
      .insert(auditLogsTable)
      .values({ ...parsed, metadata: parsed.metadata ?? null })
      .returning({ id: auditLogsTable.id });

    if (!row) throw new Error("Failed to create audit log");
    return row;
  }

  public async listAuditLogs(input: ListAuditLogsInput) {
    const { page, pageSize, action, targetType, targetId, actorUserId } =
      await listAuditLogsInputSchema.parseAsync(input);
    const filters: SQL[] = [];
    if (action) filters.push(eq(auditLogsTable.action, action));
    if (targetType) filters.push(eq(auditLogsTable.targetType, targetType));
    if (targetId) filters.push(eq(auditLogsTable.targetId, targetId));
    if (actorUserId) filters.push(eq(auditLogsTable.actorUserId, actorUserId));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const totalRows = await db.select({ total: count() }).from(auditLogsTable).where(where);
    const total = totalRows[0]?.total ?? 0;
    const rows = await db
      .select({
        id: auditLogsTable.id,
        actorUserId: auditLogsTable.actorUserId,
        actorEmail: usersTable.email,
        actorFullName: usersTable.fullName,
        action: auditLogsTable.action,
        targetType: auditLogsTable.targetType,
        targetId: auditLogsTable.targetId,
        metadata: auditLogsTable.metadata,
        createdAt: auditLogsTable.createdAt,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.actorUserId, usersTable.id))
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      rows: rows.map((row) => ({
        ...row,
        action: auditLogActionSchema.parse(row.action),
        targetType: auditLogTargetTypeSchema.parse(row.targetType),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}

export default AuditLogService;
