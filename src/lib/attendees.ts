import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attendee } from "@/db/schema";

export function isRegisteredAttendee(email: string): boolean {
  const row = db
    .select({ email: attendee.email })
    .from(attendee)
    .where(eq(attendee.email, email.trim().toLowerCase()))
    .get();
  return Boolean(row);
}
