import type { Metadata } from "next";
import { getAdminSpeakers } from "@/lib/admin-data";
import { SpeakersAdmin } from "./speakers-admin";

export const metadata: Metadata = { title: "Speakers" };

export default async function AdminSpeakersPage() {
  return <SpeakersAdmin speakers={await getAdminSpeakers()} />;
}
