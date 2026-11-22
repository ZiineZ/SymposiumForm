import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import { invite } from "@/db/schema";
import { createTestDatabase, resetDatabase } from "@/db/test-db";
import { consumeInvite, createInvite, inviteStatus, isInviteUsable } from "./invites";

let db: DB;
const now = new Date("2027-02-01T12:00:00Z");
const later = new Date("2027-02-15T12:00:00Z");

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(() => resetDatabase(db));

describe("invites", () => {
  it("stores only a hash of the token", async () => {
    const token = await createInvite(db, { label: "mail", expiresAt: later, maxUses: null });
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const [row] = await db.select().from(invite);
    expect(row.tokenHash).not.toContain(token);
    expect(row.tokenHash).toHaveLength(64);
  });

  it("accepts a valid token and counts uses", async () => {
    const token = await createInvite(db, { label: "mail", expiresAt: later, maxUses: null });
    expect(await isInviteUsable(db, token, now)).toBe(true);
    expect(await consumeInvite(db, token, now)).toBe(true);
    expect(await consumeInvite(db, token, now)).toBe(true);
    const [row] = await db.select().from(invite);
    expect(row.uses).toBe(2);
  });

  it("stops at maxUses, also under concurrent sign-ups", async () => {
    const token = await createInvite(db, { label: "two", expiresAt: later, maxUses: 2 });
    const results = await Promise.all([1, 2, 3, 4].map(() => consumeInvite(db, token, now)));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(await isInviteUsable(db, token, now)).toBe(false);
    const [row] = await db.select().from(invite);
    expect(inviteStatus(row, now)).toBe("used_up");
  });

  it("rejects expired, revoked, unknown and malformed tokens", async () => {
    const token = await createInvite(db, { label: "x", expiresAt: later, maxUses: null });
    expect(await consumeInvite(db, token, later)).toBe(false);
    await db.update(invite).set({ revokedAt: now }).where(eq(invite.label, "x"));
    expect(await consumeInvite(db, token, now)).toBe(false);
    expect(await consumeInvite(db, "A".repeat(43), now)).toBe(false);
    expect(await consumeInvite(db, "' OR 1=1 --", now)).toBe(false);
    expect(await isInviteUsable(db, "", now)).toBe(false);
  });
});
