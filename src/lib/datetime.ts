import { fromDate, parseDateTime, toCalendarDateTime, toZoned } from "@internationalized/date";
import { z } from "zod";
import { EVENT } from "./event";

/** A Date as the value of an `<input type="datetime-local">`, in the event's time zone. */
export function toLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  return toCalendarDateTime(fromDate(date, EVENT.timeZone)).toString().slice(0, 16);
}

/** Parses a `datetime-local` value as a wall-clock time in the event's time zone. */
export function fromLocalInput(value: string): Date {
  return toZoned(parseDateTime(value), EVENT.timeZone).toDate();
}

export const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time")
  .transform((value, ctx) => {
    try {
      return fromLocalInput(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid date and time" });
      return z.NEVER;
    }
  });

/** `datetime-local` value for a moment `days` from now. */
export function localInputInDays(days: number): string {
  return toLocalInput(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}
