import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notification, notificationRead } from "@/db/schema";
import { formatDateTime } from "./format";

export type NotificationView = { id: number; title: string; body: string; date: string; read: boolean };

export function getNotifications(userId: string): NotificationView[] {
  return db
    .select({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt,
      readAt: notificationRead.readAt,
    })
    .from(notification)
    .leftJoin(
      notificationRead,
      and(eq(notificationRead.notificationId, notification.id), eq(notificationRead.userId, userId)),
    )
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(100)
    .all()
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      date: formatDateTime(n.createdAt),
      read: n.readAt !== null,
    }));
}

export function markNotificationsRead(userId: string, ids: number[]) {
  if (ids.length === 0) return;
  const existing = db
    .select({ id: notification.id })
    .from(notification)
    .where(inArray(notification.id, ids))
    .all();
  if (existing.length === 0) return;
  db.insert(notificationRead)
    .values(existing.map((n) => ({ userId, notificationId: n.id })))
    .onConflictDoNothing()
    .run();
}

export function getNotificationsForAdmin() {
  const reads = db
    .select({ id: notificationRead.notificationId, n: count() })
    .from(notificationRead)
    .groupBy(notificationRead.notificationId)
    .all();
  return db
    .select()
    .from(notification)
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .all()
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      date: formatDateTime(n.createdAt),
      reads: reads.find((r) => r.id === n.id)?.n ?? 0,
    }));
}
