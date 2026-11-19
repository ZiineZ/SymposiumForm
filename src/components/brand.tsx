import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-sm text-brand-bar-foreground outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="text-lg font-extrabold tracking-tight">GEWIS</span>
      <span aria-hidden className="h-5 w-px bg-current opacity-40" />
      <span className="text-sm font-medium opacity-95">Lustrum Symposium</span>
    </Link>
  );
}

export function BrandBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bg-brand-bar text-brand-bar-foreground shadow-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        {children}
      </div>
    </header>
  );
}
