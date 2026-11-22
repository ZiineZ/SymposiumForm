import type { Metadata } from "next";
import { getAdminUsers } from "@/lib/admin-data";
import { UsersAdmin } from "./users-admin";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  return <UsersAdmin users={await getAdminUsers()} />;
}
