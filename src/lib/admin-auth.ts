import "server-only";
import { verifyPassword } from "better-auth/crypto";
import { eq, lt, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { db } from "@/db";
import { adminSession } from "@/db/schema";
import { clientIp } from "./client-ip";
import { env } from "./env";
import { THROTTLE, clearAttempts, registerAttempt } from "./login-throttle";

/**
 * The admin account is separate from attendee accounts: one username and
 * password from the environment (stored only as hashes), its own cookie and
 * its own short-lived sessions.
 */

const ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
const IDLE_TTL_MS = 30 * 60 * 1000;
const TOUCH_AFTER_MS = 60 * 1000;

const isProd = env.NODE_ENV === "production";
// `__Host-` binds the cookie to this exact host, over HTTPS, with path "/".
export const ADMIN_COOKIE = isProd ? "__Host-symposium-admin" : "symposium-admin";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const adminLoginEnabled = () => Boolean(env.ADMIN_USERNAME_SHA256 && env.ADMIN_PASSWORD_HASH);

async function credentialsMatch(username: string, password: string): Promise<boolean> {
  if (!env.ADMIN_USERNAME_SHA256 || !env.ADMIN_PASSWORD_HASH) return false;
  const userOk = timingSafeEqual(
    Buffer.from(sha256(username), "hex"),
    Buffer.from(env.ADMIN_USERNAME_SHA256, "hex"),
  );
  // Always run the slow hash, so timing does not reveal whether the username matched.
  const passwordOk = await verifyPassword({ hash: env.ADMIN_PASSWORD_HASH, password });
  return userOk && passwordOk;
}

export type AdminLoginResult = "ok" | "invalid" | "throttled" | "disabled";

export async function signInAdmin(username: string, password: string): Promise<AdminLoginResult> {
  if (!adminLoginEnabled()) return "disabled";

  const h = await headers();
  const ip = `ip:${clientIp(h)}`;
  const withinClient = registerAttempt(db, ip, THROTTLE.perClient);
  const withinGlobal = registerAttempt(db, "global", THROTTLE.global);
  if (!withinClient || !withinGlobal) {
    console.warn(`[admin] sign-in throttled for ${ip}`);
    return "throttled";
  }

  if (!(await credentialsMatch(username, password))) {
    console.warn(`[admin] failed sign-in from ${ip}`);
    return "invalid";
  }

  clearAttempts(db, ip);
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  db.delete(adminSession)
    .where(or(lt(adminSession.expiresAt, now), lt(adminSession.lastSeenAt, new Date(now.getTime() - IDLE_TTL_MS))))
    .run();
  db.insert(adminSession)
    .values({
      id: sha256(token),
      createdAt: now,
      expiresAt: new Date(now.getTime() + ABSOLUTE_TTL_MS),
      lastSeenAt: now,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    })
    .run();

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: ABSOLUTE_TTL_MS / 1000,
  });
  console.info(`[admin] signed in from ${ip}`);
  return "ok";
}

/** The current admin session, or null. Expires after 8 hours, or 30 minutes of inactivity. */
export const getAdminSession = cache(async (): Promise<{ id: string } | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const id = sha256(token);
  const row = db.select().from(adminSession).where(eq(adminSession.id, id)).get();
  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() <= now || now - row.lastSeenAt.getTime() > IDLE_TTL_MS) {
    db.delete(adminSession).where(eq(adminSession.id, id)).run();
    return null;
  }
  if (now - row.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    db.update(adminSession).set({ lastSeenAt: new Date(now) }).where(eq(adminSession.id, id)).run();
  }
  return { id };
});

/** For admin pages: redirects to the admin login when there is no valid admin session. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function signOutAdmin() {
  const session = await getAdminSession();
  if (session) db.delete(adminSession).where(eq(adminSession.id, session.id)).run();
  (await cookies()).delete(ADMIN_COOKIE);
}

/** One line per admin change, for the cluster's log collection. */
export function audit(action: string, details: Record<string, unknown> = {}) {
  console.info(`[admin] ${action} ${JSON.stringify(details)}`);
}
