/**
 * Imports the e-mail addresses of people registered for the symposium on gewis.nl.
 *
 *   npm run attendees:import -- registrations.csv            add new addresses
 *   npm run attendees:import -- registrations.csv --replace  also remove addresses
 *                                                            no longer in the file
 *
 * Any CSV/TSV/plain-text export works: every cell that looks like an e-mail
 * address is imported.
 */
import { readFileSync } from "node:fs";
import { notInArray } from "drizzle-orm";
import { z } from "zod";
import { openDatabase } from "../src/db/client";
import { attendee } from "../src/db/schema";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const replace = args.includes("--replace");

if (!file) {
  console.error("Usage: npm run attendees:import -- <file> [--replace]");
  process.exit(1);
}

const email = z.email();
const emails = new Set<string>();
for (const cell of readFileSync(file, "utf8").split(/[\r\n,;\t]+/)) {
  const candidate = cell.trim().replace(/^"|"$/g, "").toLowerCase();
  if (email.safeParse(candidate).success) emails.add(candidate);
}

if (emails.size === 0) {
  console.error("No e-mail addresses found; nothing changed.");
  process.exit(1);
}

const db = openDatabase(process.env.DATABASE_PATH ?? "./data/symposium.db");
const list = [...emails];

const { added, removed } = db.transaction((tx) => {
  let added = 0;
  for (const e of list) {
    added += tx.insert(attendee).values({ email: e }).onConflictDoNothing().run().changes;
  }
  const removed = replace ? tx.delete(attendee).where(notInArray(attendee.email, list)).run().changes : 0;
  return { added, removed };
});

console.log(`Found ${list.length} addresses: ${added} added, ${removed} removed.`);
