import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  numeric,
  pgEnum,
  unique,
  json,
} from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { formsTable } from "./form";
import { formFieldsTable } from "./form-field";

export interface FormSubmissionValues {
  formFieldId: string;
  value: string;
}

export type FormSunmissionValueRow = FormSubmissionValues[];

export const formSubmissionsTable = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),

  formId: uuid("form_id").references(() => formsTable.id),
  formFieldId: uuid("form_field_id").references(() => formFieldsTable.id),

  values: json("values").$type<FormSunmissionValueRow>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});
