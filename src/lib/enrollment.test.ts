import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import { enrollment, speaker, timeslot, user } from "@/db/schema";
import { createTestDatabase, resetDatabase } from "@/db/test-db";
import { enroll, isRegistrationOpen, unenroll } from "./enrollment";

const at = (hhmm: string) => new Date(`2027-03-17T${hhmm}:00+01:00`);
const window = { opensAt: new Date("2027-02-01T12:00:00+01:00"), closesAt: new Date("2027-03-16T00:00:00+01:00") };
const now = new Date("2027-02-10T12:00:00+01:00");

let db: DB;
let slots: Record<"a1" | "a2" | "b1" | "c1", number>;

beforeAll(async () => {
  db = await createTestDatabase();
});

beforeEach(async () => {
  await resetDatabase(db);
  const sp = async (slug: string) => {
    const [row] = await db
      .insert(speaker)
      .values({ slug, name: slug, affiliation: "x", talkTitle: "t", abstract: "a" })
      .returning();
    return row.id;
  };
  const a = await sp("a");
  const b = await sp("b");
  const c = await sp("c");
  const slot = async (key: string, speakerId: number, from: string, to: string, capacity = 2) => {
    const [row] = await db
      .insert(timeslot)
      .values({ key, speakerId, startsAt: at(from), endsAt: at(to), location: "R1", capacity })
      .returning();
    return row.id;
  };
  slots = {
    a1: await slot("a1", a, "10:30", "11:15"),
    a2: await slot("a2", a, "13:15", "14:00"),
    b1: await slot("b1", b, "11:00", "11:45"), // overlaps a1
    c1: await slot("c1", c, "11:15", "12:00"), // touches a1 at 11:15, no overlap
  };
  await db.insert(user).values(["u1", "u2", "u3"].map((id) => ({ id, name: id, email: `${id}@example.com` })));
});

describe("registration window", () => {
  it("is closed before it opens, after it closes, and when not scheduled", () => {
    expect(isRegistrationOpen(window, new Date("2027-01-01"))).toBe(false);
    expect(isRegistrationOpen(window, now)).toBe(true);
    expect(isRegistrationOpen(window, window.closesAt)).toBe(false);
    expect(isRegistrationOpen({ opensAt: window.opensAt }, new Date("2030-01-01"))).toBe(true);
    expect(isRegistrationOpen({ opensAt: null }, now)).toBe(false);
  });

  it("rejects (un)subscribing while closed", async () => {
    const early = new Date("2027-01-01");
    expect(await enroll(db, "u1", slots.a1, window, early)).toEqual({ ok: false, error: "closed" });
    expect(await unenroll(db, "u1", slots.a1, window, early)).toEqual({ ok: false, error: "closed" });
  });
});

describe("enroll", () => {
  it("subscribes once", async () => {
    expect(await enroll(db, "u1", slots.a1, window, now)).toEqual({ ok: true });
    expect(await enroll(db, "u1", slots.a1, window, now)).toEqual({ ok: false, error: "already_enrolled" });
  });

  it("rejects unknown timeslots", async () => {
    expect(await enroll(db, "u1", 9999, window, now)).toEqual({ ok: false, error: "not_found" });
  });

  it("allows one session per speaker", async () => {
    await enroll(db, "u1", slots.a1, window, now);
    expect(await enroll(db, "u1", slots.a2, window, now)).toEqual({ ok: false, error: "same_speaker" });
  });

  it("rejects overlapping sessions but allows back-to-back ones", async () => {
    await enroll(db, "u1", slots.a1, window, now);
    expect(await enroll(db, "u1", slots.b1, window, now)).toEqual({ ok: false, error: "overlap" });
    expect(await enroll(db, "u1", slots.c1, window, now)).toEqual({ ok: true });
  });

  it("is first come, first served up to capacity", async () => {
    expect((await enroll(db, "u1", slots.a1, window, now)).ok).toBe(true);
    expect((await enroll(db, "u2", slots.a1, window, now)).ok).toBe(true);
    expect(await enroll(db, "u3", slots.a1, window, now)).toEqual({ ok: false, error: "full" });
    expect(await db.select().from(enrollment)).toHaveLength(2);
  });

  it("never overbooks under concurrent requests", async () => {
    const results = await Promise.all(["u1", "u2", "u3"].map((u) => enroll(db, u, slots.a1, window, now)));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(await db.select().from(enrollment)).toHaveLength(2);
  });

  it("frees a seat on unsubscribe", async () => {
    await enroll(db, "u1", slots.a1, window, now);
    await enroll(db, "u2", slots.a1, window, now);
    expect(await unenroll(db, "u1", slots.a1, window, now)).toEqual({ ok: true });
    expect(await unenroll(db, "u1", slots.a1, window, now)).toEqual({ ok: false, error: "not_enrolled" });
    expect(await enroll(db, "u3", slots.a1, window, now)).toEqual({ ok: true });
  });
});
