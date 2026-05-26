"use client";

import { trpc } from "@/trpc/client";

export const useAdminDashboard = () => trpc.admin.getDashboard.useQuery();
export const useAdminUsers = (filters: { page?: number; pageSize?: number; search?: string; role?: "user" | "admin"; status?: "active" | "suspended" }) => trpc.admin.listUsers.useQuery(filters);
export const useAdminUserDetail = (userId: string) => trpc.admin.getUserDetail.useQuery({ userId });
export const useAdminForms = (filters: { page?: number; pageSize?: number; search?: string; status?: "draft" | "published" | "archived"; visibility?: "public" | "unlisted" }) => trpc.admin.listForms.useQuery(filters);
export const useAdminFormDetail = (formId: string) => trpc.admin.getFormDetail.useQuery({ formId });
export const useAdminSubmissions = (filters: { page?: number; pageSize?: number; formId?: string; creatorId?: string }) => trpc.admin.listSubmissions.useQuery(filters);
export const useAdminAuditLogs = (filters: { page?: number; pageSize?: number; action?: "USER_ROLE_UPDATED" | "USER_STATUS_UPDATED" | "FORM_FORCE_UNPUBLISHED" | "FORM_ARCHIVED" | "FORM_RESTORED"; targetType?: "user" | "form"; targetId?: string; actorUserId?: string }) => trpc.admin.listAuditLogs.useQuery(filters);

export const useUpdateAdminUserRole = () => {
  const utils = trpc.useUtils();
  return trpc.admin.updateUserRole.useMutation({ onSuccess: async () => { await utils.admin.invalidate(); await utils.auth.getLoggedInUserInfo.invalidate(); } });
};

export const useUpdateAdminUserStatus = () => {
  const utils = trpc.useUtils();
  return trpc.admin.updateUserStatus.useMutation({ onSuccess: async () => { await utils.admin.invalidate(); await utils.auth.getLoggedInUserInfo.invalidate(); } });
};

export const useForceUnpublishAdminForm = () => {
  const utils = trpc.useUtils();
  return trpc.admin.forceUnpublishForm.useMutation({ onSuccess: async () => { await utils.admin.invalidate(); await utils.form.invalidate(); } });
};

export const useArchiveAdminForm = () => {
  const utils = trpc.useUtils();
  return trpc.admin.archiveForm.useMutation({ onSuccess: async () => { await utils.admin.invalidate(); await utils.form.invalidate(); } });
};

export const useRestoreAdminForm = () => {
  const utils = trpc.useUtils();
  return trpc.admin.restoreForm.useMutation({ onSuccess: async () => { await utils.admin.invalidate(); await utils.form.invalidate(); } });
};
