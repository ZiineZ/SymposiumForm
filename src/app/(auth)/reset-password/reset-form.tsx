"use client";

import { Button, Description, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import { AuthCard, FormAlert, TextLink, authErrorMessage } from "@/components/auth-ui";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.resetPassword({
      newPassword: String(data.get("password") ?? ""),
      token,
    });

    setPending(false);
    if (error) setError(authErrorMessage(error));
    else setDone(true);
  }

  if (done) {
    return (
      <AuthCard title="Password updated">
        <FormAlert status="success">You can now sign in with your new password.</FormAlert>
        <TextLink href="/login">Sign in</TextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" footer={<TextLink href="/login">Back to sign in</TextLink>}>
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {error && <FormAlert>{error}</FormAlert>}
        <TextField isRequired name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128}>
          <Label>New password</Label>
          <Input />
          <Description>At least 10 characters.</Description>
          <FieldError />
        </TextField>
        <Button type="submit" fullWidth isPending={pending} className="mt-2">
          Update password
        </Button>
      </Form>
    </AuthCard>
  );
}
