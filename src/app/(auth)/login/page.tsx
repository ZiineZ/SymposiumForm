import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const access = await getAccess();
  if (access.status === "ok") redirect("/");

  const { error } = await searchParams;
  const notice = error ? "This link is invalid or has expired. Sign in to receive a new one." : undefined;

  return <LoginForm notice={notice} />;
}
