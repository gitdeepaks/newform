import { index, json, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { formsTable } from "./form";
import { formSubmissionsTable } from "./form-submission";
import { formVersionsTable } from "./form-version";

export const responseAnswersTable = pgTable(
  "response_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").references(() => formSubmissionsTable.id).notNull(),
    formId: uuid("form_id").references(() => formsTable.id).notNull(),
    formVersionId: uuid("form_version_id").references(() => formVersionsTable.id).notNull(),
    fieldId: uuid("field_id").notNull(),
    fieldKey: varchar("field_key", { length: 100 }).notNull(),
    fieldLabelSnapshot: text("field_label_snapshot").notNull(),
    fieldType: varchar("field_type", { length: 30 }).notNull(),
    rawValue: json("raw_value").$type<string | string[] | number | boolean | null>(),
    normalizedText: text("normalized_text"),
    normalizedNumber: numeric("normalized_number"),
    normalizedDate: timestamp("normalized_date"),
    optionValues: json("option_values").$type<string[] | null>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("response_answers_submission_idx").on(table.submissionId),
    index("response_answers_form_field_idx").on(table.formId, table.fieldId),
    index("response_answers_form_created_idx").on(table.formId, table.createdAt),
    index("response_answers_version_field_idx").on(table.formVersionId, table.fieldId),
  ],
);

export type SelectResponseAnswer = typeof responseAnswersTable.$inferSelect;
export type InsertResponseAnswer = typeof responseAnswersTable.$inferInsert;
