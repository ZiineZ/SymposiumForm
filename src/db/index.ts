import "server-only";
import { env } from "@/lib/env";
import { openDatabase, type DB } from "./client";

// One pool per server process, reused across hot reloads in development.
const globalForDb = globalThis as unknown as { __db?: DB };

export const db: DB = globalForDb.__db ?? openDatabase(env.DATABASE_URL, env.DATABASE_POOL_MAX).db;

if (env.NODE_ENV !== "production") globalForDb.__db = db;
