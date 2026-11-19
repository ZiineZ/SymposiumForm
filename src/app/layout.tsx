import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { EVENT } from "@/lib/event";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: EVENT.name, template: `%s · ${EVENT.name}` },
  description: `${EVENT.name} – ${EVENT.theme}`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d40000" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e11" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
