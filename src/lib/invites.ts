import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import type { DB } from "@/db/client";
import { invite } from "@/db/schema";

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type InviteStatus = "active" | "expired" | "revoked" | "used_up";

export function inviteStatus(
  row: { expiresAt: Date; revokedAt: Date | null; maxUses: number | null; uses: number },
  now: Date = new Date(),
): InviteStatus {
  if (row.revokedAt) return "revoked";
  if (row.expiresAt <= now) return "expired";
  if (row.maxUses !== null && row.uses >= row.maxUses) return "used_up";
  return "active";
}

/** Creates an invite and returns its token. Only the hash is stored, so the token is shown once. */
export function createInvite(
  db: DB,
  input: { label: string; expiresAt: Date; maxUses: number | null },
): string {
  const token = randomBytes(32).toString("base64url");
  db.insert(invite)
    .values({ tokenHash: hashToken(token), label: input.label, expiresAt: input.expiresAt, maxUses: input.maxUses })
    .run();
  return token;
}

function usable(now: Date) {
  return and(
    isNull(invite.revokedAt),
    gt(invite.expiresAt, now),
    or(isNull(invite.maxUses), lt(invite.uses, invite.maxUses)),
  );
}

export function isInviteUsable(db: DB, token: string, now: Date = new Date()): boolean {
  if (!TOKEN_FORMAT.test(token)) return false;
  const row = db
    .select({ id: invite.id })
    .from(invite)
    .where(and(eq(invite.tokenHash, hashToken(token)), usable(now)))
    .get();
  return Boolean(row);
}

/** Uses up one use of the invite. A single UPDATE, so concurrent sign-ups cannot exceed `maxUses`. */
export function consumeInvite(db: DB, token: string, now: Date = new Date()): boolean {
  if (!TOKEN_FORMAT.test(token)) return false;
  const row = db
    .update(invite)
    .set({ uses: sql`${invite.uses} + 1` })
    .where(and(eq(invite.tokenHash, hashToken(token)), usable(now)))
    .returning({ id: invite.id })
    .get();
  return Boolean(row);
}
