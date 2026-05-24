import { integer, pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const formsTable = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 55 }).notNull(),
  description: varchar("description", { length: 300 }),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  visibility: varchar("visibility", { length: 20 }).notNull().default("unlisted"),
  publishedAt: timestamp("published_at"),
  themeId: uuid("theme_id"),
  thankYouTitle: varchar("thank_you_title", { length: 120 }).default("Thanks for your response"),
  thankYouMessage: varchar("thank_you_message", { length: 300 }).default(
    "Your submission has been recorded.",
  ),
  expiresAt: timestamp("expires_at"),
  responseLimit: integer("response_limit"),

  createdBy: uuid("created_by").references(() => usersTable.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
