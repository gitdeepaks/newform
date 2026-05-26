import { z } from "zod";
import {
  auditLogActionSchema,
  auditLogMetadataSchema,
  auditLogTargetTypeSchema,
  listAuditLogsInputSchema,
} from "@repo/services/audit-log/model";
import { formStatusSchema, formVisibilitySchema } from "@repo/services/form/model";
import { userRoleSchema, userStatusSchema } from "@repo/services/user/model";
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
} from "@repo/services/admin/model";

const nullableDateSchema = z.date().nullable();
const paginationOutputSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
const safeUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  fullName: z.string(),
  emailVerified: z.boolean(),
  profileImageUrl: z.string().nullable(),
  role: userRoleSchema,
  status: userStatusSchema,
  createdAt: nullableDateSchema,
});
const auditLogRowSchema = z.object({
  id: z.string(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  actorFullName: z.string().nullable(),
  action: auditLogActionSchema,
  targetType: auditLogTargetTypeSchema,
  targetId: z.string(),
  metadata: auditLogMetadataSchema.nullable(),
  createdAt: nullableDateSchema,
});
const adminFormListRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: formStatusSchema,
  visibility: formVisibilitySchema,
  creatorId: z.string().nullable(),
  creatorEmail: z.string().nullable(),
  creatorFullName: z.string().nullable(),
  createdAt: nullableDateSchema,
  updatedAt: nullableDateSchema,
  publishedAt: nullableDateSchema,
});
const fieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  isRequired: z.boolean().nullable(),
  index: z.string(),
  pageIndex: z.number(),
  visibilityCondition: z
    .object({
      sourceFieldId: z.string(),
      operator: z.enum(["equals", "not_equals"]),
      value: z.string(),
    })
    .nullable(),
});
const submissionMetadataSchema = z
  .object({
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    slug: z.string().optional(),
  })
  .nullable();

export const getAdminDashboardInputSchema = z.undefined();
export const getAdminDashboardOutputSchema = z.object({
  metrics: z.object({
    totalUsers: z.number(),
    activeUsers: z.number(),
    suspendedUsers: z.number(),
    adminUsers: z.number(),
    verifiedUsers: z.number(),
    totalForms: z.number(),
    publishedForms: z.number(),
    draftForms: z.number(),
    archivedForms: z.number(),
    publicForms: z.number(),
    unlistedForms: z.number(),
    totalFields: z.number(),
    totalSubmissions: z.number(),
    submissionsLast24h: z.number(),
    submissionsLast7d: z.number(),
    usersLast7d: z.number(),
    formsLast7d: z.number(),
  }),
  recentUsers: z.array(safeUserSchema),
  recentForms: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      status: z.string(),
      visibility: z.string(),
      createdAt: nullableDateSchema,
      creatorEmail: z.string().nullable(),
    }),
  ),
  topForms: z.array(
    z.object({ id: z.string(), title: z.string(), slug: z.string(), responseCount: z.number() }),
  ),
});

export {
  listAdminUsersInputSchema,
  getAdminUserDetailInputSchema,
  updateAdminUserRoleInputSchema,
  updateAdminUserStatusInputSchema,
  listAdminFormsInputSchema,
  getAdminFormDetailInputSchema,
  forceUnpublishAdminFormInputSchema,
  archiveAdminFormInputSchema,
  restoreAdminFormInputSchema,
  listAdminSubmissionsInputSchema,
  listAuditLogsInputSchema,
};

export const listAdminUsersOutputSchema = z.object({
  rows: z.array(safeUserSchema),
  pagination: paginationOutputSchema,
});
export const getAdminUserDetailOutputSchema = z.object({
  user: safeUserSchema,
  formCount: z.number(),
  publishedFormCount: z.number(),
  submissionCount: z.number(),
  recentForms: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      status: z.string(),
      visibility: z.string(),
      createdAt: nullableDateSchema,
    }),
  ),
  auditLogs: z.array(auditLogRowSchema),
});
export const updateAdminUserOutputSchema = safeUserSchema;
export const listAdminFormsOutputSchema = z.object({
  rows: z.array(adminFormListRowSchema),
  pagination: paginationOutputSchema,
});
export const getAdminFormDetailOutputSchema = z.object({
  form: adminFormListRowSchema.extend({ description: z.string().nullable() }),
  fields: z.array(fieldSchema),
  responseCount: z.number(),
  recentSubmissions: z.array(
    z.object({
      id: z.string(),
      respondentEmail: z.string().nullable(),
      metadata: submissionMetadataSchema,
      submittedAt: nullableDateSchema,
      valueCount: z.number(),
    }),
  ),
  auditLogs: z.array(auditLogRowSchema),
});
export const moderateAdminFormOutputSchema = z.object({
  id: z.string(),
  status: formStatusSchema,
  changed: z.boolean(),
});
export const listAdminSubmissionsOutputSchema = z.object({
  rows: z.array(
    z.object({
      id: z.string(),
      formId: z.string().nullable(),
      formTitle: z.string().nullable(),
      formSlug: z.string().nullable(),
      creatorEmail: z.string().nullable(),
      respondentEmail: z.string().nullable(),
      metadata: submissionMetadataSchema,
      submittedAt: nullableDateSchema,
      valueCount: z.number(),
    }),
  ),
  pagination: paginationOutputSchema,
});
export const listAuditLogsOutputSchema = z.object({
  rows: z.array(auditLogRowSchema),
  pagination: paginationOutputSchema,
});
