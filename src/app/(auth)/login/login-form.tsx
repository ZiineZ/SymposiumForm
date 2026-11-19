"use client";

import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, FormAlert, TextLink, authErrorMessage } from "@/components/auth-ui";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.signIn.email({
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      callbackURL: "/login",
    });

    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="Sign in"
      footer="No account yet? Use the link from your invitation email."
    >
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {(error || notice) && <FormAlert>{error ?? notice}</FormAlert>}

        <TextField isRequired name="email" type="email" autoComplete="username">
          <Label>Email</Label>
          <Input />
          <FieldError />
        </TextField>

        <TextField isRequired name="password" type="password" autoComplete="current-password">
          <div className="flex items-baseline justify-between">
            <Label>Password</Label>
            <span className="text-sm">
              <TextLink href="/forgot-password">Forgot?</TextLink>
            </span>
          </div>
          <Input />
          <FieldError />
        </TextField>

        <Button type="submit" fullWidth isPending={pending} className="mt-2">
          Sign in
        </Button>
      </Form>
    </AuthCard>
  );
}
