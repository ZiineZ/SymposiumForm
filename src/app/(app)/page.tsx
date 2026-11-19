import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/dal";
import { EVENT } from "@/lib/event";
import { getSchedule } from "@/lib/program";
import { CalendarButton, ScheduleList } from "./schedule-view";

export const metadata: Metadata = { title: "My schedule" };

export default async function SchedulePage() {
  const user = await requireUser();
  const schedule = getSchedule(user.id);

  return (
    <>
      <PageHeader
        title="My schedule"
        description={[schedule.day, EVENT.venue].filter(Boolean).join(" · ")}
        actions={schedule.talks > 0 ? <CalendarButton /> : undefined}
      />
      <ScheduleList items={schedule.items} hasTalks={schedule.talks > 0} />
    </>
  );
}
