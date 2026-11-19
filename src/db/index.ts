import "server-only";
import { env } from "@/lib/env";
import { openDatabase, type DB } from "./client";

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __db?: DB };

export const db: DB = globalForDb.__db ?? openDatabase(env.DATABASE_PATH);

if (env.NODE_ENV !== "production") globalForDb.__db = db;
