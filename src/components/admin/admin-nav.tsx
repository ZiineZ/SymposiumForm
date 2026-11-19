"use client";

import { ArrowRightFromSquare } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { adminSignOut } from "@/app/admin/actions";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/speakers", label: "Speakers" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mb-px flex gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
              active
                ? "border-accent text-foreground"
                : "text-muted hover:text-foreground border-transparent"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSignOut() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      isPending={pending}
      onPress={() => startTransition(() => adminSignOut())}
      aria-label="Sign out"
      className="text-white hover:bg-white/10"
    >
      <ArrowRightFromSquare aria-hidden />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
