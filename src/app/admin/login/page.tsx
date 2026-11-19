import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandBar } from "@/components/brand";
import { adminLoginEnabled, getAdminSession } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");

  return (
    <>
      <BrandBar homeHref="/admin/login" />
      <main className="mx-auto flex w-full max-w-sm flex-col px-4 py-12 sm:py-20">
        <AdminLoginForm enabled={adminLoginEnabled()} />
      </main>
    </>
  );
}
