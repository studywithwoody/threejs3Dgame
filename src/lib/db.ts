import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __dawnSql?: ReturnType<typeof postgres>;
  __dawnDb?: Database;
};

export function getDb(): Database | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalForDb.__dawnDb) {
    // Neon pooled URLs (and any PgBouncer transaction pool) reject prepared statements.
    const sql = postgres(url, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    globalForDb.__dawnSql = sql;
    globalForDb.__dawnDb = drizzle(sql, { schema });
  }
  return globalForDb.__dawnDb;
}
