import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDatabase } from "../src/db/client";

const path = process.env.DATABASE_PATH ?? "./data/symposium.db";
migrate(openDatabase(path), { migrationsFolder: "./drizzle" });
console.log(`Migrated ${path}`);
