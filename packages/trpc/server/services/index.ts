import UserService from "@repo/services/user";
import FormService from "@repo/services/form";
import FormFieldService from "@repo/services/form-field";
import FormSubmissionService from "@repo/services/form-submission";
import ThemeService from "@repo/services/theme";
import AuditLogService from "@repo/services/audit-log";
import AdminService from "@repo/services/admin";

export const userService = new UserService();
export const formService = new FormService();
export const formFieldService = new FormFieldService();
export const formSubmissionService = new FormSubmissionService();
export const themeService = new ThemeService();
export const auditLogService = new AuditLogService();
export const adminService = new AdminService();
