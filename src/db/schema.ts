import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

/* -------------------------------------------------------------------------- */
/* Better Auth tables                                                          */
/* -------------------------------------------------------------------------- */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().default(now),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(now)
    .$onUpdate(() => new Date()),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().default(now),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().default(now),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(now),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(now)
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

/* -------------------------------------------------------------------------- */
/* Symposium tables                                                            */
/* -------------------------------------------------------------------------- */

/** E-mail addresses registered for the symposium on gewis.nl (lower-case). */
export const attendee = sqliteTable("attendee", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at").notNull().default(now),
});

export const speaker = sqliteTable("speaker", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  affiliation: text("affiliation").notNull(),
  talkTitle: text("talk_title").notNull(),
  abstract: text("abstract").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** One occurrence of a speaker's talk: a time, a room and a capacity. */
export const timeslot = sqliteTable(
  "timeslot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull().unique(),
    speakerId: integer("speaker_id")
      .notNull()
      .references(() => speaker.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    location: text("location").notNull(),
    capacity: integer("capacity").notNull(),
  },
  (t) => [index("timeslot_speaker_id_idx").on(t.speakerId)],
);

export const enrollment = sqliteTable(
  "enrollment",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    timeslotId: integer("timeslot_id")
      .notNull()
      .references(() => timeslot.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.timeslotId] }),
    index("enrollment_timeslot_id_idx").on(t.timeslotId),
  ],
);

/** Plenary programme items everyone attends (opening, lunch, drinks). */
export const agendaItem = sqliteTable("agenda_item", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  location: text("location").notNull(),
});
