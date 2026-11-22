import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/** Any Drizzle Postgres database with this schema: node-postgres in the app, PGlite in tests. */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Opens a connection pool. TLS follows the URL, e.g. `?sslmode=verify-full`.
 * Shared by the app and the scripts.
 */
export function openDatabase(url: string, max = 10) {
  const pool = new Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "lustrum-symposium",
  });
  pool.on("error", (err) => console.error("[db] idle client error", err.message));
  return { db: drizzle({ client: pool, schema }), pool };
}
