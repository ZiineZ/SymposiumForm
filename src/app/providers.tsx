"use client";

import { Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";

export function Providers({ nonce, children }: { nonce?: string; children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute={["class", "data-theme"]}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
      <Toast.Provider placement="bottom" />
    </ThemeProvider>
  );
}
