import { BrandBar } from "@/components/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <BrandBar />
      <main className="mx-auto flex w-full max-w-sm flex-col px-4 py-12 sm:py-20">{children}</main>
    </>
  );
}
