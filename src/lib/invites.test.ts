import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type DB } from "@/db/client";
import { invite } from "@/db/schema";
import { consumeInvite, createInvite, inviteStatus, isInviteUsable } from "./invites";

let db: DB;
const now = new Date("2027-02-01T12:00:00Z");
const later = new Date("2027-02-15T12:00:00Z");

beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
});

describe("invites", () => {
  it("stores only a hash of the token", () => {
    const token = createInvite(db, { label: "mail", expiresAt: later, maxUses: null });
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = db.select().from(invite).get();
    expect(row?.tokenHash).not.toContain(token);
    expect(row?.tokenHash).toHaveLength(64);
  });

  it("accepts a valid token and counts uses", () => {
    const token = createInvite(db, { label: "mail", expiresAt: later, maxUses: null });
    expect(isInviteUsable(db, token, now)).toBe(true);
    expect(consumeInvite(db, token, now)).toBe(true);
    expect(consumeInvite(db, token, now)).toBe(true);
    expect(db.select().from(invite).get()?.uses).toBe(2);
  });

  it("stops at maxUses", () => {
    const token = createInvite(db, { label: "one", expiresAt: later, maxUses: 1 });
    expect(consumeInvite(db, token, now)).toBe(true);
    expect(consumeInvite(db, token, now)).toBe(false);
    expect(isInviteUsable(db, token, now)).toBe(false);
    const row = db.select().from(invite).get()!;
    expect(inviteStatus(row, now)).toBe("used_up");
  });

  it("rejects expired, revoked, unknown and malformed tokens", () => {
    const token = createInvite(db, { label: "x", expiresAt: later, maxUses: null });
    expect(consumeInvite(db, token, later)).toBe(false);
    db.update(invite).set({ revokedAt: now }).where(eq(invite.label, "x")).run();
    expect(consumeInvite(db, token, now)).toBe(false);
    expect(consumeInvite(db, "A".repeat(43), now)).toBe(false);
    expect(consumeInvite(db, "' OR 1=1 --", now)).toBe(false);
    expect(isInviteUsable(db, "", now)).toBe(false);
  });
});
