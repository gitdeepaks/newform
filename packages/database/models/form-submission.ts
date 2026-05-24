import { pgTable, uuid, timestamp, json } from "drizzle-orm/pg-core";
import { formsTable } from "./form";
import { formFieldsTable } from "./form-field";

export interface FormSubmissionValues {
  formFieldId: string;
  value: string;
}

export type FormSubmissionValueRow = FormSubmissionValues[];

export const formSubmissionsTable = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),

  formId: uuid("form_id").references(() => formsTable.id),
  formFieldId: uuid("form_field_id").references(() => formFieldsTable.id),

  values: json("values").$type<FormSubmissionValueRow>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});
