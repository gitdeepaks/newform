import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { formsTable } from "./form";
import { formSubmissionsTable } from "./form-submission";

export const emailEventsTable = pgTable("email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formsTable.id),
  submissionId: uuid("submission_id").references(() => formSubmissionsTable.id),
  recipient: varchar("recipient", { length: 255 }),
  type: varchar("type", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});
