import type { Metadata } from "next";
import { getAdminPlenary } from "@/lib/admin-data";
import { ScheduleAdmin } from "./schedule-admin";

export const metadata: Metadata = { title: "Schedule" };

export default async function AdminSchedulePage() {
  return <ScheduleAdmin items={await getAdminPlenary()} />;
}
