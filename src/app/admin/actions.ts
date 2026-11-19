"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { agendaItem, enrollment, invite, notification, speaker, timeslot, user } from "@/db/schema";
import { audit, getAdminSession, signInAdmin, signOutAdmin } from "@/lib/admin-auth";
import { localDateTime } from "@/lib/datetime";
import { env } from "@/lib/env";
import { createInvite } from "@/lib/invites";
import { saveSettings } from "@/lib/settings";

export type AdminResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const EXPIRED = { ok: false, message: "Your admin session has expired. Sign in again." } as const;
const fail = (message: string) => ({ ok: false, message }) as const;

/** Server Actions are public endpoints: every one starts here. */
async function isAdmin() {
  return Boolean(await getAdminSession());
}

function done<T extends object>(extra?: T): AdminResult<T> {
  revalidatePath("/", "layout");
  return { ok: true, ...(extra as T) };
}

const LABELS: Record<string, string> = {
  name: "Name",
  affiliation: "Affiliation",
  talkTitle: "Talk title",
  abstract: "Abstract",
  startsAt: "Start",
  endsAt: "End",
  location: "Room",
  capacity: "Capacity",
  title: "Title",
  body: "Message",
  label: "Label",
  expiresAt: "Expires",
  maxUses: "Maximum uses",
  registrationOpensAt: "Opens",
  registrationClosesAt: "Closes",
};

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | string {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const label = LABELS[String(issue?.path[0] ?? "")];
  return label ? `${label}: ${issue?.message}` : "Invalid input. Please refresh the page.";
}

const fields = (fd: FormData) => Object.fromEntries(fd.entries());
const text = (max: number) => z.string().trim().min(1, "Required").max(max);
const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/* ----------------------------------------------------------------- session */

const Credentials = z.object({
  username: z.string().length(32),
  password: z.string().length(32),
});

export async function adminSignIn(fd: FormData): Promise<AdminResult> {
  const parsed = Credentials.safeParse(fields(fd));
  // Wrong lengths fail like wrong credentials, after the same checks.
  const result = await signInAdmin(
    parsed.success ? parsed.data.username : "x".repeat(32),
    parsed.success ? parsed.data.password : "",
  );
  if (result === "ok" && parsed.success) redirect("/admin");
  if (result === "throttled") return fail("Too many attempts. Try again in 5 minutes.");
  if (result === "disabled") return fail("Admin sign-in is not configured.");
  return fail("Incorrect username or password.");
}

export async function adminSignOut() {
  await signOutAdmin();
  redirect("/admin/login");
}

/* ---------------------------------------------------------------- speakers */

const SpeakerInput = z.object({
  id: id.optional(),
  name: text(120),
  affiliation: text(160),
  talkTitle: text(200),
  abstract: text(4000),
});

export async function saveSpeaker(fd: FormData): Promise<AdminResult<{ id: number }>> {
  if (!(await isAdmin())) return EXPIRED;
  const input = parse(SpeakerInput, { ...fields(fd), id: fd.get("id") || undefined });
  if (typeof input === "string") return fail(input);
  const { id: speakerId, ...values } = input;

  if (speakerId) {
    const res = db.update(speaker).set(values).where(eq(speaker.id, speakerId)).run();
    if (res.changes === 0) return fail("This speaker no longer exists.");
    audit("speaker.update", { speakerId });
    return done({ id: speakerId });
  }

  const order = db.select({ n: count() }).from(speaker).get()?.n ?? 0;
  const created = db
    .insert(speaker)
    .values({ ...values, slug: `speaker-${randomUUID()}`, sortOrder: order })
    .returning({ id: speaker.id })
    .get();
  audit("speaker.create", { speakerId: created.id });
  return done({ id: created.id });
}

export async function deleteSpeaker(speakerId: number): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const sid = parse(id, speakerId);
  if (typeof sid === "string") return fail(sid);
  db.transaction((tx) => {
    const slots = tx.select({ id: timeslot.id }).from(timeslot).where(eq(timeslot.speakerId, sid)).all();
    const ids = slots.map((s) => s.id);
    if (ids.length) {
      tx.delete(enrollment).where(inArray(enrollment.timeslotId, ids)).run();
      tx.delete(timeslot).where(inArray(timeslot.id, ids)).run();
    }
    tx.delete(speaker).where(eq(speaker.id, sid)).run();
  });
  audit("speaker.delete", { speakerId: sid });
  return done();
}

/* ---------------------------------------------------------------- sessions */

const SessionInput = z
  .object({
    id: id.optional(),
    speakerId: id,
    startsAt: localDateTime,
    endsAt: localDateTime,
    location: text(120),
    capacity: z.coerce.number().int().min(1, "Must be at least 1").max(10000),
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "Must be after the start" });

export async function saveSession(fd: FormData): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const input = parse(SessionInput, { ...fields(fd), id: fd.get("id") || undefined });
  if (typeof input === "string") return fail(input);
  const { id: slotId, ...values } = input;

  if (!db.select({ id: speaker.id }).from(speaker).where(eq(speaker.id, values.speakerId)).get()) {
    return fail("This speaker no longer exists.");
  }

  if (slotId) {
    const taken = db.select({ n: count() }).from(enrollment).where(eq(enrollment.timeslotId, slotId)).get()?.n ?? 0;
    if (values.capacity < taken) {
      return fail(`Capacity cannot be lower than the ${taken} people already subscribed.`);
    }
    const res = db.update(timeslot).set(values).where(eq(timeslot.id, slotId)).run();
    if (res.changes === 0) return fail("This session no longer exists.");
    audit("session.update", { slotId });
    return done();
  }

  const created = db
    .insert(timeslot)
    .values({ ...values, key: `slot-${randomUUID()}` })
    .returning({ id: timeslot.id })
    .get();
  audit("session.create", { slotId: created.id });
  return done();
}

export async function deleteSession(slotId: number): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const sid = parse(id, slotId);
  if (typeof sid === "string") return fail(sid);
  db.transaction((tx) => {
    tx.delete(enrollment).where(eq(enrollment.timeslotId, sid)).run();
    tx.delete(timeslot).where(eq(timeslot.id, sid)).run();
  });
  audit("session.delete", { slotId: sid });
  return done();
}

export async function removeSubscriber(slotId: number, userId: string): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const sid = parse(id, slotId);
  const uid = parse(z.string().min(1).max(64), userId);
  if (typeof sid === "string" || typeof uid === "string") return fail("Invalid request.");
  db.delete(enrollment)
    .where(and(eq(enrollment.timeslotId, sid), eq(enrollment.userId, uid)))
    .run();
  audit("subscription.remove", { slotId: sid, userId: uid });
  return done();
}

/* ---------------------------------------------------------------- schedule */

const PlenaryInput = z
  .object({
    id: id.optional(),
    title: text(160),
    location: text(120),
    startsAt: localDateTime,
    endsAt: localDateTime,
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "Must be after the start" });

export async function savePlenary(fd: FormData): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const input = parse(PlenaryInput, { ...fields(fd), id: fd.get("id") || undefined });
  if (typeof input === "string") return fail(input);
  const { id: itemId, ...values } = input;

  if (itemId) {
    const res = db.update(agendaItem).set(values).where(eq(agendaItem.id, itemId)).run();
    if (res.changes === 0) return fail("This item no longer exists.");
    audit("plenary.update", { itemId });
  } else {
    db.insert(agendaItem)
      .values({ ...values, key: `plenary-${randomUUID()}` })
      .run();
    audit("plenary.create");
  }
  return done();
}

export async function deletePlenary(itemId: number): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const iid = parse(id, itemId);
  if (typeof iid === "string") return fail(iid);
  db.delete(agendaItem).where(eq(agendaItem.id, iid)).run();
  audit("plenary.delete", { itemId: iid });
  return done();
}

/* ----------------------------------------------------------- notifications */

const NotificationInput = z.object({ title: text(120), body: text(5000) });

export async function sendNotification(fd: FormData): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const input = parse(NotificationInput, fields(fd));
  if (typeof input === "string") return fail(input);
  const created = db.insert(notification).values(input).returning({ id: notification.id }).get();
  audit("notification.send", { notificationId: created.id });
  return done();
}

export async function deleteNotification(notificationId: number): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const nid = parse(id, notificationId);
  if (typeof nid === "string") return fail(nid);
  db.delete(notification).where(eq(notification.id, nid)).run();
  audit("notification.delete", { notificationId: nid });
  return done();
}

/* ----------------------------------------------------------------- invites */

const InviteInput = z.object({
  label: text(120),
  expiresAt: localDateTime.refine((d) => d > new Date(), "Must be in the future"),
  maxUses: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(100000).nullable()),
});

export async function createInviteLink(fd: FormData): Promise<AdminResult<{ url: string }>> {
  if (!(await isAdmin())) return EXPIRED;
  const input = parse(InviteInput, { ...fields(fd), maxUses: fd.get("maxUses") ?? "" });
  if (typeof input === "string") return fail(input);
  const token = createInvite(db, input);
  audit("invite.create", { label: input.label, maxUses: input.maxUses });
  // Built from the configured URL, never from request headers.
  return done({ url: new URL(`/join/${token}`, env.BETTER_AUTH_URL).toString() });
}

export async function revokeInvite(inviteId: number): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const iid = parse(id, inviteId);
  if (typeof iid === "string") return fail(iid);
  db.update(invite).set({ revokedAt: new Date() }).where(eq(invite.id, iid)).run();
  audit("invite.revoke", { inviteId: iid });
  return done();
}

/* ------------------------------------------------------------------- users */

export async function deleteUser(userId: string): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const uid = parse(z.string().min(1).max(64), userId);
  if (typeof uid === "string") return fail(uid);
  // Sessions, accounts, subscriptions and read receipts cascade.
  db.delete(user).where(eq(user.id, uid)).run();
  audit("user.delete", { userId: uid });
  return done();
}

/* ---------------------------------------------------------------- settings */

const SettingsInput = z
  .object({
    registrationOpensAt: z.union([z.literal(""), localDateTime]),
    registrationClosesAt: z.union([z.literal(""), localDateTime]),
  })
  .transform((v) => ({
    registrationOpensAt: v.registrationOpensAt === "" ? null : v.registrationOpensAt,
    registrationClosesAt: v.registrationClosesAt === "" ? null : v.registrationClosesAt,
  }))
  .refine(
    (v) => !v.registrationOpensAt || !v.registrationClosesAt || v.registrationClosesAt > v.registrationOpensAt,
    { path: ["registrationClosesAt"], message: "Must be after the opening time" },
  );

export async function updateSettings(fd: FormData): Promise<AdminResult> {
  if (!(await isAdmin())) return EXPIRED;
  const input = parse(SettingsInput, fields(fd));
  if (typeof input === "string") return fail(input);
  saveSettings(input);
  audit("settings.update", {
    opensAt: input.registrationOpensAt?.toISOString() ?? null,
    closesAt: input.registrationClosesAt?.toISOString() ?? null,
  });
  return done();
}
