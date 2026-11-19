import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type DB } from "@/db/client";
import { THROTTLE, clearAttempts, registerAttempt } from "./login-throttle";

let db: DB;
beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("admin login throttle", () => {
  it("allows the limit, then blocks until the window passes", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(registerAttempt(db, "ip:1", 5, t)).toBe(true);
    expect(registerAttempt(db, "ip:1", 5, t + 1)).toBe(false);
    expect(registerAttempt(db, "ip:2", 5, t + 1)).toBe(true);
    expect(registerAttempt(db, "ip:1", 5, t + THROTTLE.windowMs)).toBe(true);
  });

  it("resets after a successful sign-in", () => {
    for (let i = 0; i < 6; i++) registerAttempt(db, "ip:1", 5, 0);
    clearAttempts(db, "ip:1");
    expect(registerAttempt(db, "ip:1", 5, 1)).toBe(true);
  });
});
