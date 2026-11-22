import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import { createTestDatabase, resetDatabase } from "@/db/test-db";
import { THROTTLE, clearAttempts, registerAttempt } from "./login-throttle";

let db: DB;
beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(() => resetDatabase(db));

describe("admin login throttle", () => {
  it("allows the limit, then blocks until the window passes", async () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(await registerAttempt(db, "ip:1", 5, t)).toBe(true);
    expect(await registerAttempt(db, "ip:1", 5, t + 1)).toBe(false);
    expect(await registerAttempt(db, "ip:2", 5, t + 1)).toBe(true);
    expect(await registerAttempt(db, "ip:1", 5, t + THROTTLE.windowMs)).toBe(true);
  });

  it("resets after a successful sign-in", async () => {
    for (let i = 0; i < 6; i++) await registerAttempt(db, "ip:1", 5, 0);
    await clearAttempts(db, "ip:1");
    expect(await registerAttempt(db, "ip:1", 5, 1)).toBe(true);
  });

  it("counts parallel attempts exactly", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => registerAttempt(db, "ip:9", 5, 0)));
    expect(results.filter(Boolean)).toHaveLength(5);
  });
});
