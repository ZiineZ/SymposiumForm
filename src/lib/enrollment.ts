import { and, count, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { enrollment, timeslot, user } from "@/db/schema";

/** `opensAt: null` means subscriptions have not been scheduled to open. */
export type RegistrationWindow = { opensAt: Date | null; closesAt?: Date };

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
  if (!window.opensAt || now < window.opensAt) return false;
  if (window.closesAt && now >= window.closesAt) return false;
  return true;
}

/**
 * First come, first served. The transaction locks the user's row and the
 * timeslot's row (in that order, so concurrent requests cannot deadlock):
 * two people can never take the last seat, and one person double-clicking
 * cannot slip past the overlap check.
 */
export async function enroll(
  db: DB,
  userId: string,
  timeslotId: number,
  window: RegistrationWindow,
  now: Date = new Date(),
): Promise<EnrollmentResult> {
  if (!isRegistrationOpen(window, now)) return { ok: false, error: "closed" };

  return db.transaction(async (tx): Promise<EnrollmentResult> => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    const [slot] = await tx.select().from(timeslot).where(eq(timeslot.id, timeslotId)).for("update");
    if (!slot) return { ok: false, error: "not_found" };

    const mine = await tx
      .select({
        timeslotId: timeslot.id,
        speakerId: timeslot.speakerId,
        startsAt: timeslot.startsAt,
        endsAt: timeslot.endsAt,
      })
      .from(enrollment)
      .innerJoin(timeslot, eq(enrollment.timeslotId, timeslot.id))
      .where(eq(enrollment.userId, userId));

    if (mine.some((m) => m.timeslotId === slot.id)) return { ok: false, error: "already_enrolled" };
    if (mine.some((m) => m.speakerId === slot.speakerId)) return { ok: false, error: "same_speaker" };
    if (mine.some((m) => m.startsAt < slot.endsAt && m.endsAt > slot.startsAt)) {
      return { ok: false, error: "overlap" };
    }

    const [{ n }] = await tx.select({ n: count() }).from(enrollment).where(eq(enrollment.timeslotId, slot.id));
    if (n >= slot.capacity) return { ok: false, error: "full" };

    await tx.insert(enrollment).values({ userId, timeslotId: slot.id });
    return { ok: true };
  });
}

export async function unenroll(
  db: DB,
  userId: string,
  timeslotId: number,
  window: RegistrationWindow,
  now: Date = new Date(),
): Promise<EnrollmentResult> {
  if (!isRegistrationOpen(window, now)) return { ok: false, error: "closed" };

  const removed = await db
    .delete(enrollment)
    .where(and(eq(enrollment.userId, userId), eq(enrollment.timeslotId, timeslotId)))
    .returning({ userId: enrollment.userId });
  return removed.length > 0 ? { ok: true } : { ok: false, error: "not_enrolled" };
}
