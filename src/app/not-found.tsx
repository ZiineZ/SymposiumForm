import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import { BrandBar } from "@/components/brand";

export default function NotFound() {
  return (
    <>
      <BrandBar />
      <main className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          Go to your schedule
        </Link>
      </main>
    </>
  );
}
