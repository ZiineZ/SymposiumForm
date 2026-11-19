import { createEvents, type EventAttributes } from "ics";
import { getCurrentUser } from "@/lib/dal";
import { EVENT } from "@/lib/event";
import { getScheduleRows } from "@/lib/program";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const events: EventAttributes[] = getScheduleRows(user.id).map((r) => ({
    uid: `${r.key}@lustrum-symposium.gewis.nl`,
    title: r.speaker ? `${r.title} – ${r.speaker}` : r.title,
    start: r.startsAt.getTime(),
    end: r.endsAt.getTime(),
    startInputType: "utc",
    startOutputType: "utc",
    endInputType: "utc",
    endOutputType: "utc",
    location: `${r.location}, ${EVENT.venue}`,
    calName: EVENT.name,
    productId: "gewis/lustrum-symposium",
  }));

  const { error, value } = createEvents(events);
  if (error || !value) return new Response("Could not create calendar", { status: 500 });

  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lustrum-symposium.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
