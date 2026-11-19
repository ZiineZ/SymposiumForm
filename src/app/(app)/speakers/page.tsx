import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/dal";
import { isRegistrationOpen } from "@/lib/enrollment";
import { formatDateTime } from "@/lib/format";
import { getSpeakers } from "@/lib/program";
import { registrationWindow } from "@/lib/registration";
import { SpeakerList } from "./speaker-list";

export const metadata: Metadata = { title: "Speakers" };

export default async function SpeakersPage() {
  const user = await requireUser();
  const speakers = getSpeakers(user.id);

  const now = new Date();
  const open = isRegistrationOpen(registrationWindow, now);
  const { opensAt, closesAt } = registrationWindow;

  let notice: string | undefined;
  if (now < opensAt) notice = `Subscriptions open on ${formatDateTime(opensAt)}.`;
  else if (!open) notice = "Subscriptions are closed.";
  else if (closesAt) notice = `Subscriptions close on ${formatDateTime(closesAt)}.`;

  return (
    <>
      <PageHeader title="Speakers" description={notice} />
      <SpeakerList speakers={speakers} open={open} />
    </>
  );
}
