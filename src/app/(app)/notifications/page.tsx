import type { Metadata } from "next";
import { NotificationList } from "./notification-list";
import { PageHeader } from "@/components/page-header";
import { MarkAllRead } from "@/components/notifications";
import { requireUser } from "@/lib/dal";
import { getNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getNotifications(user.id);

  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationList notifications={notifications} />
      <MarkAllRead ids={notifications.filter((n) => !n.read).map((n) => n.id)} />
    </>
  );
}
