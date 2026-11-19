import Link from "next/link";
import { EVENT } from "@/lib/event";

export function Brand({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <div className="flex items-center gap-3 text-brand-bar-foreground">
      <a
        href={EVENT.gewisUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GEWIS website (opens in a new tab)"
        className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
        <img src="/gewis-logo.svg" alt="GEWIS" width={44} height={44} className="size-11" />
      </a>
      <span aria-hidden className="h-6 w-px bg-current opacity-40" />
      <Link
        href={homeHref}
        className="rounded-sm text-sm font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-base"
      >
        Lustrum Symposium
      </Link>
    </div>
  );
}

export function BrandBar({
  children,
  wide = false,
  homeHref,
}: {
  children?: React.ReactNode;
  wide?: boolean;
  homeHref?: string;
}) {
  return (
    <header className="bg-brand-bar text-brand-bar-foreground shadow-md">
      <div
        className={`mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 ${wide ? "max-w-6xl" : "max-w-4xl"}`}
      >
        <Brand homeHref={homeHref} />
        {children}
      </div>
    </header>
  );
}
