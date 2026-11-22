import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { agendaItem, enrollment, speaker, timeslot } from "@/db/schema";
import { formatDay, formatTimeRange } from "./format";

export type SlotState =
  | "enrolled"
  | "available"
  | "full"
  | "same_speaker"
  | "overlap";

export type SlotView = {
  id: number;
  time: string;
  location: string;
  capacity: number;
  left: number;
  state: SlotState;
};

export type SpeakerView = {
  id: number;
  name: string;
  affiliation: string;
  talkTitle: string;
  abstract: string;
  slots: SlotView[];
};

export type ScheduleItem = {
  key: string;
  time: string;
  title: string;
  subtitle?: string;
  location: string;
  kind: "talk" | "plenary";
};

function mySlots(userId: string) {
  return db
    .select({
      id: timeslot.id,
      speakerId: timeslot.speakerId,
      startsAt: timeslot.startsAt,
      endsAt: timeslot.endsAt,
    })
    .from(enrollment)
    .innerJoin(timeslot, eq(enrollment.timeslotId, timeslot.id))
    .where(eq(enrollment.userId, userId));
}

export async function getSpeakers(userId: string): Promise<SpeakerView[]> {
  const speakers = await db.select().from(speaker).orderBy(asc(speaker.sortOrder), asc(speaker.name));
  const slots = await db
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
  const mine = await mySlots(userId);

  const stateOf = (s: (typeof slots)[number]): SlotState => {
    if (mine.some((m) => m.id === s.id)) return "enrolled";
    if (mine.some((m) => m.speakerId === s.speakerId)) return "same_speaker";
    if (mine.some((m) => m.startsAt < s.endsAt && m.endsAt > s.startsAt)) return "overlap";
    if (s.taken >= s.capacity) return "full";
    return "available";
  };

  return speakers.map((sp) => ({
    id: sp.id,
    name: sp.name,
    affiliation: sp.affiliation,
    talkTitle: sp.talkTitle,
    abstract: sp.abstract,
    slots: slots
      .filter((s) => s.speakerId === sp.id)
      .map((s) => ({
        id: s.id,
        time: formatTimeRange(s.startsAt, s.endsAt),
        location: s.location,
        capacity: s.capacity,
        left: Math.max(0, s.capacity - s.taken),
        state: stateOf(s),
      })),
  }));
}

/** Raw schedule rows, used by both the page and the calendar export. */
export async function getScheduleRows(userId: string) {
  const talkRows = await db
    .select({
      id: timeslot.id,
      startsAt: timeslot.startsAt,
      endsAt: timeslot.endsAt,
      location: timeslot.location,
      title: speaker.talkTitle,
      speaker: speaker.name,
    })
    .from(enrollment)
    .innerJoin(timeslot, eq(enrollment.timeslotId, timeslot.id))
    .innerJoin(speaker, eq(timeslot.speakerId, speaker.id))
    .where(eq(enrollment.userId, userId));
  const talks = talkRows.map((t) => ({ ...t, key: `talk-${t.id}`, kind: "talk" as const }));

  const plenary = (await db.select().from(agendaItem)).map((a) => ({
    ...a,
    key: `plenary-${a.id}`,
    speaker: undefined,
    kind: "plenary" as const,
  }));

  return [...talks, ...plenary].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function getSchedule(
  userId: string,
): Promise<{ day: string | null; items: ScheduleItem[]; talks: number }> {
  const rows = await getScheduleRows(userId);
  return {
    day: rows[0] ? formatDay(rows[0].startsAt) : null,
    talks: rows.filter((r) => r.kind === "talk").length,
    items: rows.map((r) => ({
      key: r.key,
      time: formatTimeRange(r.startsAt, r.endsAt),
      title: r.title,
      subtitle: r.speaker,
      location: r.location,
      kind: r.kind,
    })),
  };
}
