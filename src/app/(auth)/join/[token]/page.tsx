import type { Metadata } from "next";
import { AuthCard, FormAlert, TextLink } from "@/components/auth-ui";
import { db } from "@/db";
import { isInviteUsable } from "@/lib/invites";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Create account", referrer: "no-referrer" };

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;

  if (!(await isInviteUsable(db, token))) {
    return (
      <AuthCard title="Link expired" footer={<TextLink href="/login">Back to sign in</TextLink>}>
        <FormAlert>This invite link is invalid or has expired. Ask the organisers for a new one.</FormAlert>
      </AuthCard>
    );
  }

  return <JoinForm token={token} />;
}
