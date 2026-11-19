import { NavLinks, SignOutButton } from "@/components/app-nav";
import { BrandBar } from "@/components/brand";
import { AutoRefresh, NotificationBanner, NotificationBell } from "@/components/notifications";
import { requireUser } from "@/lib/dal";
import { getNotifications } from "@/lib/notifications";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const unread = getNotifications(user.id).filter((n) => !n.read);

  return (
    <>
      <BrandBar>
        <div className="flex items-center gap-1 sm:gap-4">
          <div className="hidden sm:block">
            <NavLinks />
          </div>
          <span className="hidden max-w-40 truncate text-sm text-white/80 md:inline" title={user.email}>
            {user.name}
          </span>
          <NotificationBell unread={unread.length} />
          <SignOutButton />
        </div>
      </BrandBar>
      <div className="bg-brand-bar border-t border-white/10 sm:hidden">
        <div className="mx-auto max-w-4xl px-4 py-2">
          <NavLinks />
        </div>
      </div>
      {unread[0] && <NotificationBanner latest={unread[0]} unread={unread.length} />}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <AutoRefresh />
    </>
  );
}
