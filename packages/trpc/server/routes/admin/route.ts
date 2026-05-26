import { adminService, auditLogService } from "../../services";
import { adminProcedure, router } from "../../trpc";
import {
  archiveAdminFormInputSchema,
  forceUnpublishAdminFormInputSchema,
  getAdminDashboardInputSchema,
  getAdminDashboardOutputSchema,
  getAdminFormDetailInputSchema,
  getAdminFormDetailOutputSchema,
  getAdminUserDetailInputSchema,
  getAdminUserDetailOutputSchema,
  listAdminFormsInputSchema,
  listAdminFormsOutputSchema,
  listAdminSubmissionsInputSchema,
  listAdminSubmissionsOutputSchema,
  listAdminUsersInputSchema,
  listAdminUsersOutputSchema,
  listAuditLogsInputSchema,
  listAuditLogsOutputSchema,
  moderateAdminFormOutputSchema,
  restoreAdminFormInputSchema,
  updateAdminUserOutputSchema,
  updateAdminUserRoleInputSchema,
  updateAdminUserStatusInputSchema,
} from "./model";

export const adminRouter = router({
  getDashboard: adminProcedure
    .input(getAdminDashboardInputSchema)
    .output(getAdminDashboardOutputSchema)
    .query(() => adminService.getDashboard()),

  listUsers: adminProcedure
    .input(listAdminUsersInputSchema)
    .output(listAdminUsersOutputSchema)
    .query(({ input }) => adminService.listUsers(input)),

  getUserDetail: adminProcedure
    .input(getAdminUserDetailInputSchema)
    .output(getAdminUserDetailOutputSchema)
    .query(({ input }) => adminService.getUserDetail(input)),

  updateUserRole: adminProcedure
    .input(updateAdminUserRoleInputSchema.omit({ actorUserId: true }))
    .output(updateAdminUserOutputSchema)
    .mutation(({ input, ctx }) =>
      adminService.updateUserRole({ ...input, actorUserId: ctx.user.id }),
    ),

  updateUserStatus: adminProcedure
    .input(updateAdminUserStatusInputSchema.omit({ actorUserId: true }))
    .output(updateAdminUserOutputSchema)
    .mutation(({ input, ctx }) =>
      adminService.updateUserStatus({ ...input, actorUserId: ctx.user.id }),
    ),

  listForms: adminProcedure
    .input(listAdminFormsInputSchema)
    .output(listAdminFormsOutputSchema)
    .query(({ input }) => adminService.listForms(input)),

  getFormDetail: adminProcedure
    .input(getAdminFormDetailInputSchema)
    .output(getAdminFormDetailOutputSchema)
    .query(({ input }) => adminService.getFormDetail(input)),

  forceUnpublishForm: adminProcedure
    .input(forceUnpublishAdminFormInputSchema.omit({ actorUserId: true }))
    .output(moderateAdminFormOutputSchema)
    .mutation(({ input, ctx }) =>
      adminService.forceUnpublishForm({ ...input, actorUserId: ctx.user.id }),
    ),

  archiveForm: adminProcedure
    .input(archiveAdminFormInputSchema.omit({ actorUserId: true }))
    .output(moderateAdminFormOutputSchema)
    .mutation(({ input, ctx }) =>
      adminService.archiveForm({ ...input, actorUserId: ctx.user.id }),
    ),

  restoreForm: adminProcedure
    .input(restoreAdminFormInputSchema.omit({ actorUserId: true }))
    .output(moderateAdminFormOutputSchema)
    .mutation(({ input, ctx }) =>
      adminService.restoreForm({ ...input, actorUserId: ctx.user.id }),
    ),

  listSubmissions: adminProcedure
    .input(listAdminSubmissionsInputSchema)
    .output(listAdminSubmissionsOutputSchema)
    .query(({ input }) => adminService.listSubmissions(input)),

  listAuditLogs: adminProcedure
    .input(listAuditLogsInputSchema)
    .output(listAuditLogsOutputSchema)
    .query(({ input }) => auditLogService.listAuditLogs(input)),
});
