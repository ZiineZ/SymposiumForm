import { BrandBar } from "@/components/brand";
import { NavLinks, SignOutButton } from "@/components/app-nav";
import { requireUser } from "@/lib/dal";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <>
      <BrandBar>
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden sm:block">
            <NavLinks />
          </div>
          <span className="hidden max-w-40 truncate text-sm text-white/80 md:inline" title={user.email}>
            {user.name}
          </span>
          <SignOutButton />
        </div>
      </BrandBar>
      <div className="bg-brand-bar border-t border-white/10 sm:hidden">
        <div className="mx-auto max-w-4xl px-4 py-2">
          <NavLinks />
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}
