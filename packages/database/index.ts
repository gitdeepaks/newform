import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";

export const db = drizzle(env.DATABASE_URL);
export * from "drizzle-orm/node-postgres";
export { and, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
export default db;
