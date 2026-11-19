import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/admin-data";
import { SessionSubscribers } from "./session-subscribers";

export const metadata: Metadata = { title: "Subscribers" };

export default async function AdminSessionPage({ params }: PageProps<"/admin/sessions/[id]">) {
  const { id } = await params;
  const slotId = Number(id);
  if (!Number.isSafeInteger(slotId) || slotId <= 0) notFound();

  const session = getSessionDetail(slotId);
  if (!session) notFound();

  return <SessionSubscribers session={session} />;
}
