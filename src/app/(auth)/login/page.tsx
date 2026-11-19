import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const access = await getAccess();
  if (access.status === "ok") redirect("/");

  const { error } = await searchParams;
  let notice: string | undefined;
  if (access.status === "unregistered") notice = "This email address is no longer registered for the symposium.";
  else if (error) notice = "This link is invalid or has expired. Sign in to receive a new one.";

  return <LoginForm notice={notice} />;
}
