import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  json,
  text,
  numeric,
  unique,
} from "drizzle-orm/pg-core";
import { formsTable } from "./form";

export type FormFieldOption = {
  id: string;
  label: string;
  value: string;
};

export type FormFieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  ratingMax?: number;
  dateMin?: string;
  dateMax?: string;
};

export const formFieldsTable = pgTable(
  "form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: varchar("label", { length: 100 }).notNull(),
    description: text("description"),
    labelKey: varchar("label_key", { length: 100 }).notNull(),
    placeholder: text("placeholder"),
    isRequired: boolean("is_required").default(false),

    index: numeric("index", { scale: 2 }).notNull(),

    type: varchar("type", { length: 30 }).notNull(),
    options: json("options").$type<FormFieldOption[] | null>(),
    validation: json("validation").$type<FormFieldValidation | null>(),

    formId: uuid("form_id").references(() => formsTable.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      uniqueFormIdAndIndex: unique().on(table.formId, table.index),
    };
  },
);
