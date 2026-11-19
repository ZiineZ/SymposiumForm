import type { Metadata } from "next";
import { getAdminSpeakers } from "@/lib/admin-data";
import { SpeakersAdmin } from "./speakers-admin";

export const metadata: Metadata = { title: "Speakers" };

export default function AdminSpeakersPage() {
  return <SpeakersAdmin speakers={getAdminSpeakers()} />;
}
