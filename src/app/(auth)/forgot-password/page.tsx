"use client";

import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import { AuthCard, FormAlert, TextLink, authErrorMessage } from "@/components/auth-ui";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.requestPasswordReset({
      email: String(data.get("email") ?? "").trim(),
      redirectTo: "/reset-password",
    });

    setPending(false);
    if (error) setError(authErrorMessage(error));
    else setSent(true);
  }

  return (
    <AuthCard title="Reset password" footer={<TextLink href="/login">Back to sign in</TextLink>}>
      {sent ? (
        <FormAlert status="success">If an account exists for this address, we&apos;ve sent a reset link.</FormAlert>
      ) : (
        <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {error && <FormAlert>{error}</FormAlert>}
          <TextField isRequired name="email" type="email" autoComplete="email">
            <Label>Email</Label>
            <Input />
            <FieldError />
          </TextField>
          <Button type="submit" fullWidth isPending={pending} className="mt-2">
            Send reset link
          </Button>
        </Form>
      )}
    </AuthCard>
  );
}
