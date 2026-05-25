import { json, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { formsTable } from "./form";
import { type FormSubmissionMetadata, formSubmissionsTable } from "./form-submission";

export const responseEventsTable = pgTable("response_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formsTable.id),
  submissionId: uuid("submission_id").references(() => formSubmissionsTable.id),
  type: varchar("type", { length: 30 }).notNull(),
  metadata: json("metadata").$type<FormSubmissionMetadata | null>(),
  createdAt: timestamp("created_at").defaultNow(),
});
