import { index, pgTable, uuid, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { formsTable } from "./form";
import { formVersionsTable } from "./form-version";

export interface FormSubmissionValues {
  formFieldId: string;
  value: string;
}

export type FormSubmissionValueRow = FormSubmissionValues[];

export type FormSubmissionMetadata = {
  ip?: string;
  userAgent?: string;
  slug?: string;
};

export const formSubmissionsTable = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id").references(() => formsTable.id).notNull(),
    formVersionId: uuid("form_version_id").references(() => formVersionsTable.id).notNull(),
    respondentEmail: varchar("respondent_email", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    submittedAt: timestamp("submitted_at").defaultNow(),
    metadata: json("metadata").$type<FormSubmissionMetadata | null>(),
    rawPayload: json("raw_payload").$type<FormSubmissionValueRow | null>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("form_submissions_form_submitted_idx").on(table.formId, table.submittedAt),
    index("form_submissions_form_version_idx").on(table.formVersionId),
    index("form_submissions_status_idx").on(table.status),
    index("form_submissions_respondent_email_idx").on(table.respondentEmail),
  ],
);

export type SelectFormSubmission = typeof formSubmissionsTable.$inferSelect;
export type InsertFormSubmission = typeof formSubmissionsTable.$inferInsert;
