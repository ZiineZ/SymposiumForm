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
    .orderBy(asc(timeslot.startsAt))
    .all();
}

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

function toAdminSlot(s: ReturnType<typeof slotsWithCounts>[number]): AdminSlot {
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

export function getAdminSpeakers(): AdminSpeaker[] {
  const slots = slotsWithCounts();
  return db
    .select()
    .from(speaker)
    .orderBy(asc(speaker.sortOrder), asc(speaker.name))
    .all()
    .map((sp) => ({
      id: sp.id,
      name: sp.name,
      affiliation: sp.affiliation,
      talkTitle: sp.talkTitle,
      abstract: sp.abstract,
      slots: slots.filter((s) => s.speakerId === sp.id).map(toAdminSlot),
    }));
}

export function getOverview() {
  const speakers = getAdminSpeakers();
  const slots = speakers.flatMap((sp) => sp.slots.map((s) => ({ ...s, speaker: sp.name, talkTitle: sp.talkTitle })));
  const users = db.select({ n: count() }).from(user).get()?.n ?? 0;
  const verified = db.select({ n: count() }).from(user).where(eq(user.emailVerified, true)).get()?.n ?? 0;
  return {
    users,
    verified,
    subscriptions: slots.reduce((sum, s) => sum + s.taken, 0),
    seats: slots.reduce((sum, s) => sum + s.capacity, 0),
    full: slots.filter((s) => s.taken >= s.capacity).length,
    slots: [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  };
}

export function getSessionDetail(timeslotId: number) {
  const row = db
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
    .where(eq(timeslot.id, timeslotId))
    .get();
  if (!row) return null;

  const subscribers = db
    .select({ id: user.id, name: user.name, email: user.email, subscribedAt: enrollment.createdAt })
    .from(enrollment)
    .innerJoin(user, eq(enrollment.userId, user.id))
    .where(eq(enrollment.timeslotId, timeslotId))
    .orderBy(asc(enrollment.createdAt))
    .all()
    .map((s) => ({ ...s, subscribedAt: formatDateTime(s.subscribedAt) }));

  return {
    id: row.id,
    time: formatTimeRange(row.startsAt, row.endsAt),
    day: formatShortDay(row.startsAt),
    location: row.location,
    capacity: row.capacity,
    speaker: row.speaker,
    speakerId: row.speakerId,
    talkTitle: row.talkTitle,
    subscribers,
  };
}

export function getAdminPlenary() {
  return db
    .select()
    .from(agendaItem)
    .orderBy(asc(agendaItem.startsAt))
    .all()
    .map((a) => ({
      id: a.id,
      title: a.title,
      location: a.location,
      time: formatTimeRange(a.startsAt, a.endsAt),
      day: formatShortDay(a.startsAt),
      startsAt: toLocalInput(a.startsAt),
      endsAt: toLocalInput(a.endsAt),
    }));
}

export function getAdminInvites() {
  const now = new Date();
  return db
    .select()
    .from(invite)
    .orderBy(desc(invite.createdAt), desc(invite.id))
    .all()
    .map((i) => ({
      id: i.id,
      label: i.label,
      created: formatDateTime(i.createdAt),
      expires: formatDateTime(i.expiresAt),
      uses: i.uses,
      maxUses: i.maxUses,
      status: inviteStatus(i, now),
    }));
}

export function getAdminUsers() {
  const counts = db
    .select({ userId: enrollment.userId, n: count() })
    .from(enrollment)
    .groupBy(enrollment.userId)
    .all();
  return db
    .select()
    .from(user)
    .orderBy(asc(user.name))
    .all()
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      verified: u.emailVerified,
      created: formatDateTime(u.createdAt),
      subscriptions: counts.find((c) => c.userId === u.id)?.n ?? 0,
    }));
}
