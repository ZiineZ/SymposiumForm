import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { DB } from "./client";
import * as schema from "./schema";

/** A real Postgres (PGlite, in-process) with all migrations applied. */
export async function createTestDatabase(): Promise<DB> {
  const db = drizzle({ client: new PGlite(), schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

/** Empties every table and resets identity columns, for test isolation. */
export async function resetDatabase(db: DB) {
  const tables = Object.values(schema)
    .map((t) => `"${(t as unknown as { [k: symbol]: string })[Symbol.for("drizzle:Name")]}"`)
    .join(", ");
  await db.execute(sql.raw(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`));
}
