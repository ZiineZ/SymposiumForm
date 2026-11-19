import type { Metadata } from "next";
import { getNotificationsForAdmin } from "@/lib/notifications";
import { NotificationsAdmin } from "./notifications-admin";

export const metadata: Metadata = { title: "Notifications" };

export default function AdminNotificationsPage() {
  return <NotificationsAdmin notifications={getNotificationsForAdmin()} />;
}
