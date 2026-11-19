import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type DB } from "@/db/client";
import { enrollment, speaker, timeslot, user } from "@/db/schema";
import { enroll, isRegistrationOpen, unenroll } from "./enrollment";

const at = (hhmm: string) => new Date(`2027-03-17T${hhmm}:00+01:00`);
const window = { opensAt: new Date("2027-02-01T12:00:00+01:00"), closesAt: new Date("2027-03-16T00:00:00+01:00") };
const now = new Date("2027-02-10T12:00:00+01:00");

let db: DB;
let slots: Record<"a1" | "a2" | "b1" | "c1", number>;

function addUser(id: string) {
  db.insert(user).values({ id, name: id, email: `${id}@example.com`, emailVerified: true }).run();
}

beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  const sp = (slug: string) =>
    db.insert(speaker).values({ slug, name: slug, affiliation: "x", talkTitle: "t", abstract: "a" }).returning().get().id;
  const a = sp("a");
  const b = sp("b");
  const c = sp("c");
  const slot = (key: string, speakerId: number, from: string, to: string, capacity = 2) =>
    db.insert(timeslot).values({ key, speakerId, startsAt: at(from), endsAt: at(to), location: "R1", capacity }).returning().get().id;
  slots = {
    a1: slot("a1", a, "10:30", "11:15"),
    a2: slot("a2", a, "13:15", "14:00"),
    b1: slot("b1", b, "11:00", "11:45"), // overlaps a1
    c1: slot("c1", c, "11:15", "12:00"), // touches a1 at 11:15, no overlap
  };
  ["u1", "u2", "u3"].forEach(addUser);
});

describe("registration window", () => {
  it("is closed before it opens and after it closes", () => {
    expect(isRegistrationOpen(window, new Date("2027-01-01"))).toBe(false);
    expect(isRegistrationOpen(window, now)).toBe(true);
    expect(isRegistrationOpen(window, window.closesAt)).toBe(false);
    expect(isRegistrationOpen({ opensAt: window.opensAt }, new Date("2030-01-01"))).toBe(true);
  });

  it("rejects (un)subscribing while closed", () => {
    const early = new Date("2027-01-01");
    expect(enroll(db, "u1", slots.a1, window, early)).toEqual({ ok: false, error: "closed" });
    expect(unenroll(db, "u1", slots.a1, window, early)).toEqual({ ok: false, error: "closed" });
  });
});

describe("enroll", () => {
  it("subscribes once", () => {
    expect(enroll(db, "u1", slots.a1, window, now)).toEqual({ ok: true });
    expect(enroll(db, "u1", slots.a1, window, now)).toEqual({ ok: false, error: "already_enrolled" });
  });

  it("rejects unknown timeslots", () => {
    expect(enroll(db, "u1", 9999, window, now)).toEqual({ ok: false, error: "not_found" });
  });

  it("allows one session per speaker", () => {
    enroll(db, "u1", slots.a1, window, now);
    expect(enroll(db, "u1", slots.a2, window, now)).toEqual({ ok: false, error: "same_speaker" });
  });

  it("rejects overlapping sessions but allows back-to-back ones", () => {
    enroll(db, "u1", slots.a1, window, now);
    expect(enroll(db, "u1", slots.b1, window, now)).toEqual({ ok: false, error: "overlap" });
    expect(enroll(db, "u1", slots.c1, window, now)).toEqual({ ok: true });
  });

  it("is first come, first served up to capacity", () => {
    expect(enroll(db, "u1", slots.a1, window, now).ok).toBe(true);
    expect(enroll(db, "u2", slots.a1, window, now).ok).toBe(true);
    expect(enroll(db, "u3", slots.a1, window, now)).toEqual({ ok: false, error: "full" });
    expect(db.select().from(enrollment).all()).toHaveLength(2);
  });

  it("frees a seat on unsubscribe", () => {
    enroll(db, "u1", slots.a1, window, now);
    enroll(db, "u2", slots.a1, window, now);
    expect(unenroll(db, "u1", slots.a1, window, now)).toEqual({ ok: true });
    expect(unenroll(db, "u1", slots.a1, window, now)).toEqual({ ok: false, error: "not_enrolled" });
    expect(enroll(db, "u3", slots.a1, window, now)).toEqual({ ok: true });
  });
});
