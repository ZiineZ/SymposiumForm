import { bigint, boolean, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () =>
  ts("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* -------------------------------------------------------------------------- */
/* Better Auth tables                                                          */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
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
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* -------------------------------------------------------------------------- */
/* Symposium tables                                                            */
/* -------------------------------------------------------------------------- */

export const speaker = pgTable("speaker", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  affiliation: text("affiliation").notNull(),
  talkTitle: text("talk_title").notNull(),
  abstract: text("abstract").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** One occurrence of a speaker's talk: a time, a room and a capacity. */
export const timeslot = pgTable(
  "timeslot",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    key: text("key").notNull().unique(),
    speakerId: integer("speaker_id")
      .notNull()
      .references(() => speaker.id, { onDelete: "restrict" }),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    location: text("location").notNull(),
    capacity: integer("capacity").notNull(),
  },
  (t) => [index("timeslot_speaker_id_idx").on(t.speakerId)],
);

export const enrollment = pgTable(
  "enrollment",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    timeslotId: integer("timeslot_id")
      .notNull()
      .references(() => timeslot.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.timeslotId] }),
    index("enrollment_timeslot_id_idx").on(t.timeslotId),
  ],
);

/** Plenary programme items everyone attends (opening, lunch, drinks). */
export const agendaItem = pgTable("agenda_item", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  location: text("location").notNull(),
});

/* -------------------------------------------------------------------------- */
/* Access and administration                                                   */
/* -------------------------------------------------------------------------- */

/** Account-creation link. Only the SHA-256 of the token is stored. */
export const invite = pgTable("invite", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label").notNull(),
  createdAt: createdAt(),
  expiresAt: ts("expires_at").notNull(),
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
  revokedAt: ts("revoked_at"),
});

/** Admin sessions. `id` is the SHA-256 of the cookie token. */
export const adminSession = pgTable("admin_session", {
  id: text("id").primaryKey(),
  createdAt: createdAt(),
  expiresAt: ts("expires_at").notNull(),
  lastSeenAt: ts("last_seen_at").notNull(),
  userAgent: text("user_agent"),
});

/** Failed admin sign-ins per client (and one global key), per fixed window. */
export const adminLoginAttempt = pgTable("admin_login_attempt", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});

/** Single-row table (id = 1) with settings the admin can change. */
export const setting = pgTable("setting", {
  id: integer("id").primaryKey(),
  registrationOpensAt: ts("registration_opens_at"),
  registrationClosesAt: ts("registration_closes_at"),
});

export const notification = pgTable("notification", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const notificationRead = pgTable(
  "notification_read",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notification.id, { onDelete: "cascade" }),
    readAt: ts("read_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.notificationId] })],
);
