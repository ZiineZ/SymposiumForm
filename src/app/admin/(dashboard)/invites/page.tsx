import type { Metadata } from "next";
import { getAdminInvites } from "@/lib/admin-data";
import { localInputInDays } from "@/lib/datetime";
import { InvitesAdmin } from "./invites-admin";

export const metadata: Metadata = { title: "Invites" };

export default async function AdminInvitesPage() {
  return (
    <InvitesAdmin
      invites={await getAdminInvites()}
      defaultExpiry={localInputInDays(14)}
    />
  );
}
