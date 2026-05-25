import { boolean, json, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export type ThemeTokens = {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  accent: string;
  accentText: string;
  border: string;
};

export const themesTable = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  tokens: json("tokens").$type<ThemeTokens>().notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectTheme = typeof themesTable.$inferSelect;
export type InsertTheme = typeof themesTable.$inferInsert;
