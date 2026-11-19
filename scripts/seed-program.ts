/**
 * Loads speakers, timeslots and plenary items from content/program.json.
 *
 *   npm run program:seed
 *
 * Safe to run repeatedly: rows are matched on `slug` / `key` and updated in
 * place, so existing subscriptions are kept. Removing a timeslot that people
 * are subscribed to is refused.
 */
import { readFileSync } from "node:fs";
import { count, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { openDatabase } from "../src/db/client";
import { agendaItem, enrollment, speaker, timeslot } from "../src/db/schema";

const dateTime = z.iso.datetime({ offset: true }).transform((v) => new Date(v));
const key = z.string().regex(/^[a-z0-9-]+$/, "use lower-case letters, digits and dashes");

const timed = { startsAt: dateTime, endsAt: dateTime };
const ordered = (v: { startsAt: Date; endsAt: Date }) => v.endsAt > v.startsAt;
const orderMsg = "endsAt must be after startsAt";

const Plenary = z
  .object({ key, title: z.string().min(1), location: z.string().min(1), ...timed })
  .refine(ordered, orderMsg);
const Session = z
  .object({ key, location: z.string().min(1), capacity: z.number().int().positive(), ...timed })
  .refine(ordered, orderMsg);

const Program = z.object({
  plenary: z.array(Plenary),
  speakers: z.array(
    z.object({
      slug: key,
      name: z.string().min(1),
      affiliation: z.string().min(1),
      talkTitle: z.string().min(1),
      abstract: z.string().min(1),
      sessions: z.array(Session).min(1),
    }),
  ),
});

const file = process.argv[2] ?? "./content/program.json";
const program = Program.parse(JSON.parse(readFileSync(file, "utf8")));
const db = openDatabase(process.env.DATABASE_PATH ?? "./data/symposium.db");

db.transaction((tx) => {
  const slotKeys: string[] = [];

  program.speakers.forEach((s, i) => {
    const values = {
      slug: s.slug,
      name: s.name,
      affiliation: s.affiliation,
      talkTitle: s.talkTitle,
      abstract: s.abstract,
      sortOrder: i,
    };
    const { id } = tx
      .insert(speaker)
      .values(values)
      .onConflictDoUpdate({ target: speaker.slug, set: values })
      .returning({ id: speaker.id })
      .get();

    for (const t of s.sessions) {
      slotKeys.push(t.key);
      const slot = { ...t, speakerId: id };
      const { id: slotId } = tx
        .insert(timeslot)
        .values(slot)
        .onConflictDoUpdate({ target: timeslot.key, set: slot })
        .returning({ id: timeslot.id })
        .get();

      const taken = tx.select({ n: count() }).from(enrollment).where(eq(enrollment.timeslotId, slotId)).get()?.n ?? 0;
      if (taken > t.capacity) {
        console.warn(`! ${t.key}: capacity ${t.capacity} is below the ${taken} people already subscribed`);
      }
    }
  });

  // Foreign keys (ON DELETE RESTRICT) make these throw if anyone is subscribed.
  tx.delete(timeslot).where(notInArray(timeslot.key, slotKeys)).run();
  tx.delete(speaker).where(notInArray(speaker.slug, program.speakers.map((s) => s.slug))).run();

  for (const p of program.plenary) {
    tx.insert(agendaItem).values(p).onConflictDoUpdate({ target: agendaItem.key, set: p }).run();
  }
  tx.delete(agendaItem).where(notInArray(agendaItem.key, program.plenary.map((p) => p.key))).run();
});

console.log(`Seeded ${program.speakers.length} speakers and ${program.plenary.length} plenary items.`);
