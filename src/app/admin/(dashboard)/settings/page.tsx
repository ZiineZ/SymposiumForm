import type { Metadata } from "next";
import { toLocalInput } from "@/lib/datetime";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const s = await getSettings();
  return (
    <SettingsForm
      opensAt={toLocalInput(s.registrationOpensAt)}
      closesAt={toLocalInput(s.registrationClosesAt)}
    />
  );
}
