import { json, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

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

export type SelectAuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
