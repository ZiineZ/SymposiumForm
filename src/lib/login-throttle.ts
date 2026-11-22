import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { adminLoginAttempt } from "@/db/schema";

export const THROTTLE = {
  windowMs: 5 * 60 * 1000,
  perClient: 5,
  global: 50,
} as const;

/**
 * Counts an attempt for `key` and reports whether it is still within `limit`
 * for the current fixed window. One atomic upsert, done before the password
 * check, so parallel requests cannot slip past the limit.
 */
export async function registerAttempt(db: DB, key: string, limit: number, now: number = Date.now()): Promise<boolean> {
  const expired = sql`${now} - ${adminLoginAttempt.windowStart} >= ${THROTTLE.windowMs}`;
  const [row] = await db
    .insert(adminLoginAttempt)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: adminLoginAttempt.key,
      set: {
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${adminLoginAttempt.count} + 1 END`,
        windowStart: sql`CASE WHEN ${expired} THEN ${now}::bigint ELSE ${adminLoginAttempt.windowStart} END`,
      },
    })
    .returning({ count: adminLoginAttempt.count });
  return row.count <= limit;
}

export async function clearAttempts(db: DB, key: string) {
  await db.delete(adminLoginAttempt).where(eq(adminLoginAttempt.key, key));
}
