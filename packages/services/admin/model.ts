import { z } from "zod";
import { formStatusSchema, formVisibilitySchema } from "../form/model";
import { userRoleSchema, userStatusSchema } from "../user/model";

export const paginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const listAdminUsersInputSchema = paginationInputSchema.extend({
  search: z.string().trim().min(1).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});

export const getAdminUserDetailInputSchema = z.object({ userId: z.string().uuid() });
export const updateAdminUserRoleInputSchema = getAdminUserDetailInputSchema.extend({
  actorUserId: z.string().uuid(),
  role: userRoleSchema,
});
export const updateAdminUserStatusInputSchema = getAdminUserDetailInputSchema.extend({
  actorUserId: z.string().uuid(),
  status: userStatusSchema,
});

export const listAdminFormsInputSchema = paginationInputSchema.extend({
  search: z.string().trim().min(1).optional(),
  status: formStatusSchema.optional(),
  visibility: formVisibilitySchema.optional(),
  creatorId: z.string().uuid().optional(),
});

export const getAdminFormDetailInputSchema = z.object({ formId: z.string().uuid() });
export const forceUnpublishAdminFormInputSchema = getAdminFormDetailInputSchema.extend({ actorUserId: z.string().uuid() });
export const archiveAdminFormInputSchema = getAdminFormDetailInputSchema.extend({ actorUserId: z.string().uuid() });
export const restoreAdminFormInputSchema = getAdminFormDetailInputSchema.extend({ actorUserId: z.string().uuid() });

export const listAdminSubmissionsInputSchema = paginationInputSchema.extend({
  formId: z.string().uuid().optional(),
  creatorId: z.string().uuid().optional(),
});

export type ListAdminUsersInput = z.infer<typeof listAdminUsersInputSchema>;
export type GetAdminUserDetailInput = z.infer<typeof getAdminUserDetailInputSchema>;
export type UpdateAdminUserRoleInput = z.infer<typeof updateAdminUserRoleInputSchema>;
export type UpdateAdminUserStatusInput = z.infer<typeof updateAdminUserStatusInputSchema>;
export type ListAdminFormsInput = z.infer<typeof listAdminFormsInputSchema>;
export type GetAdminFormDetailInput = z.infer<typeof getAdminFormDetailInputSchema>;
export type ForceUnpublishAdminFormInput = z.infer<typeof forceUnpublishAdminFormInputSchema>;
export type ArchiveAdminFormInput = z.infer<typeof archiveAdminFormInputSchema>;
export type RestoreAdminFormInput = z.infer<typeof restoreAdminFormInputSchema>;
export type ListAdminSubmissionsInput = z.infer<typeof listAdminSubmissionsInputSchema>;
