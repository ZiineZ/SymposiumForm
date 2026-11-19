"use client";

import { Card } from "@heroui/react";
import type { NotificationView } from "@/lib/notifications";

export function NotificationList({ notifications }: { notifications: NotificationView[] }) {
  if (notifications.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>No notifications yet</Card.Title>
        </Card.Header>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {notifications.map((n) => (
        <li key={n.id}>
          <Card className={n.read ? "" : "border-l-accent border-l-[3px]"}>
            <Card.Header className="gap-1">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-semibold">{n.title}</h2>
                <time className="text-muted shrink-0 text-xs">{n.date}</time>
              </div>
            </Card.Header>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
