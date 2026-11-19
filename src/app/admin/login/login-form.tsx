"use client";

import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useState, useTransition } from "react";
import { adminSignIn } from "@/app/admin/actions";
import { AuthCard, FormAlert } from "@/components/auth-ui";

export function AdminLoginForm({ enabled }: { enabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await adminSignIn(fd);
      if (res && !res.ok) setError(res.message);
    });
  }

  return (
    <AuthCard title="Admin">
      {!enabled ? (
        <FormAlert>Admin sign-in is not configured.</FormAlert>
      ) : (
        <Form className="flex flex-col gap-4" onSubmit={submit}>
          {error && <FormAlert>{error}</FormAlert>}
          <TextField isRequired name="username" autoComplete="username" minLength={32} maxLength={32}>
            <Label>Username</Label>
            <Input spellCheck={false} autoCapitalize="none" />
            <FieldError />
          </TextField>
          <TextField isRequired name="password" type="password" autoComplete="current-password" minLength={32} maxLength={32}>
            <Label>Password</Label>
            <Input />
            <FieldError />
          </TextField>
          <Button type="submit" fullWidth isPending={pending} className="mt-2">
            Sign in
          </Button>
        </Form>
      )}
    </AuthCard>
  );
}
