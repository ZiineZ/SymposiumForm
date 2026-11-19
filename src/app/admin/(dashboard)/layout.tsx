import type { Metadata } from "next";
import { AdminNav, AdminSignOut } from "@/components/admin/admin-nav";
import { BrandBar } from "@/components/brand";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <>
      <BrandBar wide homeHref="/admin">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-white uppercase">
            Admin
          </span>
          <AdminSignOut />
        </div>
      </BrandBar>
      <div className="border-border bg-surface border-b">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AdminNav />
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}
