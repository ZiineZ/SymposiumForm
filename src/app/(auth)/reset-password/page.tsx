import type { Metadata } from "next";
import { AuthCard, FormAlert, TextLink } from "@/components/auth-ui";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;

  if (error || typeof token !== "string" || token.length === 0 || token.length > 256) {
    return (
      <AuthCard title="Link expired" footer={<TextLink href="/login">Back to sign in</TextLink>}>
        <FormAlert>This link is invalid or has expired.</FormAlert>
        <TextLink href="/forgot-password">Request a new link</TextLink>
      </AuthCard>
    );
  }

  return <ResetPasswordForm token={token} />;
}
