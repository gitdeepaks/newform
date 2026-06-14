import { index, integer, json, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { formsTable } from "./form";
import type { FormFieldOption, FormFieldValidation, FormFieldVisibilityCondition } from "./form-field";
import { usersTable } from "./user";

export type FormVersionFieldSnapshot = {
  id: string;
  label: string;
  labelKey: string;
  description: string | null;
  placeholder: string | null;
  type: string;
  isRequired: boolean | null;
  pageIndex: number;
  index: string | number;
  options: FormFieldOption[] | null;
  validation: FormFieldValidation | null;
  visibilityCondition: FormFieldVisibilityCondition | null;
};

export type FormVersionSchemaSnapshot = {
  form: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    thankYouTitle: string | null;
    thankYouMessage: string | null;
  };
  fields: FormVersionFieldSnapshot[];
  createdAt: string;
};

export const formVersionsTable = pgTable(
  "form_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id").references(() => formsTable.id).notNull(),
    versionNumber: integer("version_number").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    schemaSnapshot: json("schema_snapshot").$type<FormVersionSchemaSnapshot>().notNull(),
    publishedAt: timestamp("published_at").defaultNow(),
    createdBy: uuid("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.formId, table.versionNumber),
    index("form_versions_form_status_idx").on(table.formId, table.status),
  ],
);

export type SelectFormVersion = typeof formVersionsTable.$inferSelect;
export type InsertFormVersion = typeof formVersionsTable.$inferInsert;
