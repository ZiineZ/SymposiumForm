"use client";

import { Button, Description, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import { AuthCard, FormAlert, TextLink, authErrorMessage } from "@/components/auth-ui";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    setPending(true);
    setError(null);

    const { error } = await authClient.signUp.email({
      name: String(data.get("name") ?? "").trim(),
      email,
      password: String(data.get("password") ?? ""),
      callbackURL: "/login",
    });

    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        footer={<TextLink href="/login">Back to sign in</TextLink>}
      >
        <p className="text-sm leading-relaxed">
          We sent an email to <span className="font-semibold [overflow-wrap:anywhere]">{sentTo}</span>. Follow
          the link in it to activate your account.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create account"
      description="Use the email address you registered with on gewis.nl."
      footer={
        <>
          Already have an account? <TextLink href="/login">Sign in</TextLink>
        </>
      }
    >
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {error && <FormAlert>{error}</FormAlert>}

        <TextField isRequired name="name" autoComplete="name" maxLength={100}>
          <Label>Full name</Label>
          <Input />
          <FieldError />
        </TextField>

        <TextField isRequired name="email" type="email" autoComplete="email" maxLength={254}>
          <Label>Email</Label>
          <Input />
          <FieldError />
        </TextField>

        <TextField isRequired name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128}>
          <Label>Password</Label>
          <Input />
          <Description>At least 10 characters.</Description>
          <FieldError />
        </TextField>

        <Button type="submit" fullWidth isPending={pending} className="mt-2">
          Create account
        </Button>
      </Form>
    </AuthCard>
  );
}
