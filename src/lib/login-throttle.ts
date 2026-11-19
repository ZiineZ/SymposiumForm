import { eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { adminLoginAttempt } from "@/db/schema";

export const THROTTLE = {
  windowMs: 15 * 60 * 1000,
  perClient: 5,
  global: 50,
} as const;

/**
 * Counts an attempt for `key` and reports whether it is still within `limit`
 * for the current fixed window. Counting happens before the password check,
 * so parallel requests cannot slip past the limit.
 */
export function registerAttempt(db: DB, key: string, limit: number, now: number = Date.now()): boolean {
  return db.transaction(
    (tx) => {
      const row = tx.select().from(adminLoginAttempt).where(eq(adminLoginAttempt.key, key)).get();
      if (!row || now - row.windowStart >= THROTTLE.windowMs) {
        tx.insert(adminLoginAttempt)
          .values({ key, count: 1, windowStart: now })
          .onConflictDoUpdate({ target: adminLoginAttempt.key, set: { count: 1, windowStart: now } })
          .run();
        return true;
      }
      tx.update(adminLoginAttempt)
        .set({ count: row.count + 1 })
        .where(eq(adminLoginAttempt.key, key))
        .run();
      return row.count + 1 <= limit;
    },
    { behavior: "immediate" },
  );
}

export function clearAttempts(db: DB, key: string) {
  db.delete(adminLoginAttempt).where(eq(adminLoginAttempt.key, key)).run();
}
