import "server-only";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agendaItem, enrollment, invite, speaker, timeslot, user } from "@/db/schema";
import { toLocalInput } from "./datetime";
import { formatDateTime, formatShortDay, formatTimeRange } from "./format";
import { inviteStatus } from "./invites";

function slotsWithCounts() {
  return db
    .select({
      id: timeslot.id,
      speakerId: timeslot.speakerId,
      startsAt: timeslot.startsAt,
      endsAt: timeslot.endsAt,
      location: timeslot.location,
      capacity: timeslot.capacity,
      taken: count(enrollment.userId),
    })
    .from(timeslot)
    .leftJoin(enrollment, eq(enrollment.timeslotId, timeslot.id))
    .groupBy(timeslot.id)
    .orderBy(asc(timeslot.startsAt));
}

type SlotRow = Awaited<ReturnType<typeof slotsWithCounts>>[number];

export type AdminSlot = {
  id: number;
  time: string;
  day: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  taken: number;
};

export type AdminSpeaker = {
  id: number;
  name: string;
  affiliation: string;
  talkTitle: string;
  abstract: string;
  slots: AdminSlot[];
};

function toAdminSlot(s: SlotRow): AdminSlot {
  return {
    id: s.id,
    time: formatTimeRange(s.startsAt, s.endsAt),
    day: formatShortDay(s.startsAt),
    startsAt: toLocalInput(s.startsAt),
    endsAt: toLocalInput(s.endsAt),
    location: s.location,
    capacity: s.capacity,
    taken: s.taken,
  };
}

export async function getAdminSpeakers(): Promise<AdminSpeaker[]> {
  const [slots, speakers] = await Promise.all([
    slotsWithCounts(),
    db.select().from(speaker).orderBy(asc(speaker.sortOrder), asc(speaker.name)),
  ]);
  return speakers.map((sp) => ({
    id: sp.id,
    name: sp.name,
    affiliation: sp.affiliation,
    talkTitle: sp.talkTitle,
    abstract: sp.abstract,
    slots: slots.filter((s) => s.speakerId === sp.id).map(toAdminSlot),
  }));
}

export async function getOverview() {
  const [speakers, [users], [verified]] = await Promise.all([
    getAdminSpeakers(),
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(user).where(eq(user.emailVerified, true)),
  ]);
  const slots = speakers.flatMap((sp) => sp.slots.map((s) => ({ ...s, speaker: sp.name, talkTitle: sp.talkTitle })));
  return {
    users: users.n,
    verified: verified.n,
    subscriptions: slots.reduce((sum, s) => sum + s.taken, 0),
    seats: slots.reduce((sum, s) => sum + s.capacity, 0),
    full: slots.filter((s) => s.taken >= s.capacity).length,
    slots: [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  };
}

export async function getSessionDetail(timeslotId: number) {
  const [row] = await db
    .select({
      id: timeslot.id,
      startsAt: timeslot.startsAt,
      endsAt: timeslot.endsAt,
      location: timeslot.location,
      capacity: timeslot.capacity,
      speaker: speaker.name,
      speakerId: speaker.id,
      talkTitle: speaker.talkTitle,
    })
    .from(timeslot)
    .innerJoin(speaker, eq(timeslot.speakerId, speaker.id))
    .where(eq(timeslot.id, timeslotId));
  if (!row) return null;

  const subscribers = await db
    .select({ id: user.id, name: user.name, email: user.email, subscribedAt: enrollment.createdAt })
    .from(enrollment)
    .innerJoin(user, eq(enrollment.userId, user.id))
    .where(eq(enrollment.timeslotId, timeslotId))
    .orderBy(asc(enrollment.createdAt));

  return {
    id: row.id,
    time: formatTimeRange(row.startsAt, row.endsAt),
    day: formatShortDay(row.startsAt),
    location: row.location,
    capacity: row.capacity,
    speaker: row.speaker,
    speakerId: row.speakerId,
    talkTitle: row.talkTitle,
    subscribers: subscribers.map((s) => ({ ...s, subscribedAt: formatDateTime(s.subscribedAt) })),
  };
}

export async function getAdminPlenary() {
  const rows = await db.select().from(agendaItem).orderBy(asc(agendaItem.startsAt));
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    location: a.location,
    time: formatTimeRange(a.startsAt, a.endsAt),
    day: formatShortDay(a.startsAt),
    startsAt: toLocalInput(a.startsAt),
    endsAt: toLocalInput(a.endsAt),
  }));
}

export async function getAdminInvites() {
  const now = new Date();
  const rows = await db.select().from(invite).orderBy(desc(invite.createdAt), desc(invite.id));
  return rows.map((i) => ({
    id: i.id,
    label: i.label,
    created: formatDateTime(i.createdAt),
    expires: formatDateTime(i.expiresAt),
    uses: i.uses,
    maxUses: i.maxUses,
    status: inviteStatus(i, now),
  }));
}

export async function getAdminUsers() {
  const [counts, users] = await Promise.all([
    db.select({ userId: enrollment.userId, n: count() }).from(enrollment).groupBy(enrollment.userId),
    db.select().from(user).orderBy(asc(user.name)),
  ]);
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    verified: u.emailVerified,
    created: formatDateTime(u.createdAt),
    subscriptions: counts.find((c) => c.userId === u.id)?.n ?? 0,
  }));
}
