"use client";

import { PaperPlane, TrashBin } from "@gravity-ui/icons";
import { Card } from "@heroui/react";
import { deleteNotification, sendNotification } from "@/app/admin/actions";
import { AreaField, ConfirmButton, EmptyState, Field, FormDialog } from "@/components/admin/kit";
import { PageHeader } from "@/components/page-header";
import type { getNotificationsForAdmin } from "@/lib/notifications";

type Item = Awaited<ReturnType<typeof getNotificationsForAdmin>>[number];

export function NotificationsAdmin({ notifications }: { notifications: Item[] }) {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Shown to every attendee under the header until they read it."
        actions={
          <FormDialog
            triggerLabel="New notification"
            triggerVariant="primary"
            triggerSize="md"
            triggerIcon={<PaperPlane aria-hidden />}
            title="New notification"
            submitLabel="Send to everyone"
            successMessage="Notification sent"
            action={sendNotification}
          >
            <Field name="title" label="Title" maxLength={120} />
            <AreaField name="body" label="Message" maxLength={5000} rows={7} />
          </FormDialog>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState title="No notifications sent yet." />
      ) : (
        <ul className="flex flex-col gap-4">
          {notifications.map((n) => (
            <li key={n.id}>
              <Card className="gap-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{n.title}</h2>
                    <p className="text-muted text-xs">
                      {n.date} · read by {n.reads}
                    </p>
                  </div>
                  <ConfirmButton
                    label="Delete notification"
                    icon={<TrashBin aria-hidden />}
                    iconOnly
                    variant="ghost"
                    title="Delete this notification?"
                    body="It disappears for everyone, including people who have not read it yet."
                    successMessage="Notification deleted"
                    onConfirm={() => deleteNotification(n.id)}
                  />
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
