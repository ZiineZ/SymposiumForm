"use client";

import { ArrowRightFromSquare } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const LINKS = [
  { href: "/", label: "Schedule" },
  { href: "/speakers", label: "Speakers" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
              active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      setPending(false);
      toast.danger("Could not sign out. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      isPending={pending}
      onPress={signOut}
      aria-label="Sign out"
      className="text-white hover:bg-white/10"
    >
      <ArrowRightFromSquare aria-hidden />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
