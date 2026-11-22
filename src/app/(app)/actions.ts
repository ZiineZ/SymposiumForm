"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/dal";
import { enroll, unenroll, type EnrollmentError } from "@/lib/enrollment";
import { markNotificationsRead } from "@/lib/notifications";
import { getRegistrationWindow } from "@/lib/settings";

export type ActionResult = { ok: true } | { ok: false; message: string };

const MESSAGES: Record<EnrollmentError | "unauthorized" | "invalid", string> = {
  unauthorized: "Your session has expired. Please sign in again.",
  invalid: "Something went wrong. Please refresh the page.",
  closed: "Subscriptions are closed.",
  not_found: "This session no longer exists. Please refresh the page.",
  full: "This session is full.",
  already_enrolled: "You are already subscribed to this session.",
  same_speaker: "You are already subscribed to another session of this talk.",
  overlap: "This session overlaps with your schedule.",
  not_enrolled: "You are not subscribed to this session.",
};

const TimeslotId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

async function run(
  timeslotId: unknown,
  op: typeof enroll | typeof unenroll,
): Promise<ActionResult> {
  // Server Actions are public HTTP endpoints: authenticate and validate every call.
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: MESSAGES.unauthorized };

  const id = TimeslotId.safeParse(timeslotId);
  if (!id.success) return { ok: false, message: MESSAGES.invalid };

  const result = await op(db, user.id, id.data, await getRegistrationWindow());
  revalidatePath("/", "layout");
  return result.ok ? { ok: true } : { ok: false, message: MESSAGES[result.error] };
}

export async function subscribe(timeslotId: number): Promise<ActionResult> {
  return run(timeslotId, enroll);
}

export async function unsubscribe(timeslotId: number): Promise<ActionResult> {
  return run(timeslotId, unenroll);
}

const NotificationIds = z.array(z.number().int().positive()).max(100);

export async function markRead(ids: number[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: MESSAGES.unauthorized };
  const parsed = NotificationIds.safeParse(ids);
  if (!parsed.success) return { ok: false, message: MESSAGES.invalid };
  await markNotificationsRead(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}
