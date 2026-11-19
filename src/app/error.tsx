"use client";

import { Button } from "@heroui/react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <Button variant="secondary" onPress={reset}>
        Try again
      </Button>
    </main>
  );
}
