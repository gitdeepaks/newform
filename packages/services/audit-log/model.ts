import { z } from "zod";

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
  actorUserId: z.string().uuid(),
  action: auditLogActionSchema,
  targetType: auditLogTargetTypeSchema,
  targetId: z.string(),
  metadata: auditLogMetadataSchema.nullable().optional(),
});

export const listAuditLogsInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  action: auditLogActionSchema.optional(),
  targetType: auditLogTargetTypeSchema.optional(),
  targetId: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
});

export type AuditLogAction = z.infer<typeof auditLogActionSchema>;
export type AuditLogTargetType = z.infer<typeof auditLogTargetTypeSchema>;
export type AuditLogMetadata = z.infer<typeof auditLogMetadataSchema>;
export type CreateAuditLogInput = z.infer<typeof createAuditLogInputSchema>;
export type ListAuditLogsInput = z.infer<typeof listAuditLogsInputSchema>;
