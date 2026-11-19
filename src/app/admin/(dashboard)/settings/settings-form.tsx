"use client";

import { Button, Card, Form, toast } from "@heroui/react";
import { useState, useTransition } from "react";
import { updateSettings } from "@/app/admin/actions";
import { Field } from "@/components/admin/kit";
import { FormAlert } from "@/components/auth-ui";
import { PageHeader } from "@/components/page-header";

export function SettingsForm({ opensAt, closesAt }: { opensAt: string; closesAt: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await updateSettings(fd);
      if (res.ok) toast.success("Settings saved");
      else setError(res.message);
    });
  }

  return (
    <>
      <PageHeader title="Settings" />
      <Card className="max-w-2xl gap-5 p-6">
        <Card.Header className="gap-1">
          <Card.Title>Subscribing to talks</Card.Title>
          <Card.Description>
            Attendees can subscribe and unsubscribe between these times (Amsterdam time). Leave Opens empty to keep
            subscriptions closed.
          </Card.Description>
        </Card.Header>
        <Form onSubmit={submit} className="flex flex-col gap-4">
          {error && <FormAlert>{error}</FormAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="registrationOpensAt" label="Opens" type="datetime-local" isRequired={false} defaultValue={opensAt} />
            <Field name="registrationClosesAt" label="Closes" type="datetime-local" isRequired={false} defaultValue={closesAt} />
          </div>
          <div>
            <Button type="submit" isPending={pending}>
              Save
            </Button>
          </div>
        </Form>
      </Card>
    </>
  );
}
