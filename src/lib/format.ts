import { EVENT } from "./event";

const locale = "en-GB";
const tz = EVENT.timeZone;

const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat(locale, {
  timeZone: tz,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dateTime = new Intl.DateTimeFormat(locale, {
  timeZone: tz,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatTime = (d: Date) => time.format(d);
export const formatTimeRange = (a: Date, b: Date) => `${time.format(a)} – ${time.format(b)}`;
export const formatDay = (d: Date) => day.format(d);
export const formatDateTime = (d: Date) => dateTime.format(d);

const shortDay = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
export const formatShortDay = (d: Date) => shortDay.format(d);
