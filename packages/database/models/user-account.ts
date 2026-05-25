import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const userAccountsTable = pgTable(
  "user_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    provider: varchar("provider", { length: 32 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_accounts_provider_account_id_unique").on(
      table.provider,
      table.providerAccountId,
    ),
    uniqueIndex("user_accounts_user_provider_unique").on(table.userId, table.provider),
  ],
);

export type SelectUserAccount = typeof userAccountsTable.$inferSelect;
export type InsertUserAccount = typeof userAccountsTable.$inferInsert;
