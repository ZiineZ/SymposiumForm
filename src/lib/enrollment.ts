import { and, count, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { enrollment, timeslot } from "@/db/schema";

export type RegistrationWindow = { opensAt: Date; closesAt?: Date };

export type EnrollmentError =
  | "closed"
  | "not_found"
  | "full"
  | "already_enrolled"
  | "same_speaker"
  | "overlap"
  | "not_enrolled";

export type EnrollmentResult = { ok: true } | { ok: false; error: EnrollmentError };

export function isRegistrationOpen(window: RegistrationWindow, now: Date): boolean {
  if (now < window.opensAt) return false;
  if (window.closesAt && now >= window.closesAt) return false;
  return true;
}

/**
 * First come, first served. Runs in an IMMEDIATE transaction so the capacity
 * check and the insert are atomic: SQLite allows one writer at a time, so two
 * people can never take the last seat.
 */
export function enroll(
  db: DB,
  userId: string,
  timeslotId: number,
  window: RegistrationWindow,
  now: Date = new Date(),
): EnrollmentResult {
  if (!isRegistrationOpen(window, now)) return { ok: false, error: "closed" };

  return db.transaction(
    (tx): EnrollmentResult => {
      const slot = tx.select().from(timeslot).where(eq(timeslot.id, timeslotId)).get();
      if (!slot) return { ok: false, error: "not_found" };

      const mine = tx
        .select({
          timeslotId: timeslot.id,
          speakerId: timeslot.speakerId,
          startsAt: timeslot.startsAt,
          endsAt: timeslot.endsAt,
        })
        .from(enrollment)
        .innerJoin(timeslot, eq(enrollment.timeslotId, timeslot.id))
        .where(eq(enrollment.userId, userId))
        .all();

      if (mine.some((m) => m.timeslotId === slot.id)) return { ok: false, error: "already_enrolled" };
      if (mine.some((m) => m.speakerId === slot.speakerId)) return { ok: false, error: "same_speaker" };
      if (mine.some((m) => m.startsAt < slot.endsAt && m.endsAt > slot.startsAt)) {
        return { ok: false, error: "overlap" };
      }

      const taken =
        tx
          .select({ n: count() })
          .from(enrollment)
          .where(eq(enrollment.timeslotId, slot.id))
          .get()?.n ?? 0;
      if (taken >= slot.capacity) return { ok: false, error: "full" };

      tx.insert(enrollment).values({ userId, timeslotId: slot.id }).run();
      return { ok: true };
    },
    { behavior: "immediate" },
  );
}

export function unenroll(
  db: DB,
  userId: string,
  timeslotId: number,
  window: RegistrationWindow,
  now: Date = new Date(),
): EnrollmentResult {
  if (!isRegistrationOpen(window, now)) return { ok: false, error: "closed" };

  const res = db
    .delete(enrollment)
    .where(and(eq(enrollment.userId, userId), eq(enrollment.timeslotId, timeslotId)))
    .run();
  return res.changes > 0 ? { ok: true } : { ok: false, error: "not_enrolled" };
}
