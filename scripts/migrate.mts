/**
 * Applies the migrations in ./drizzle to DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * In the container this runs as an init container before the app starts.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { openDatabase } from "../src/db/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const { db, pool } = openDatabase(url, 1);
try {
  await migrate(db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "./drizzle" });
  console.log("Database is up to date.");
} finally {
  await pool.end();
}
