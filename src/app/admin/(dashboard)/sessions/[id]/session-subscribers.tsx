"use client";

import { ArrowLeft, Copy, PersonXmark } from "@gravity-ui/icons";
import { Button, Table, toast } from "@heroui/react";
import Link from "next/link";
import { removeSubscriber } from "@/app/admin/actions";
import { ConfirmButton, EmptyState, Fill } from "@/components/admin/kit";
import { PageHeader } from "@/components/page-header";
import type { getSessionDetail } from "@/lib/admin-data";

type Session = NonNullable<ReturnType<typeof getSessionDetail>>;

export function SessionSubscribers({ session }: { session: Session }) {
  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(session.subscribers.map((s) => s.email).join(", "));
      toast.success("Email addresses copied");
    } catch {
      toast.danger("Could not copy to the clipboard");
    }
  }

  return (
    <>
      <Link
        href="/admin/speakers"
        className="text-muted hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Speakers
      </Link>
      <PageHeader
        title={session.talkTitle}
        description={`${session.speaker} · ${session.day} ${session.time} · ${session.location}`}
        actions={
          session.subscribers.length > 0 ? (
            <Button variant="secondary" onPress={copyEmails}>
              <Copy aria-hidden />
              Copy emails
            </Button>
          ) : undefined
        }
      />

      <p className="text-muted mb-3 text-sm">
        <Fill taken={session.subscribers.length} capacity={session.capacity} /> subscribed
      </p>

      {session.subscribers.length === 0 ? (
        <EmptyState title="Nobody has subscribed yet." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Subscribers" className="min-w-[560px]">
              <Table.Header>
                <Table.Column isRowHeader>Name</Table.Column>
                <Table.Column>Email</Table.Column>
                <Table.Column>Subscribed</Table.Column>
                <Table.Column className="text-end">Remove</Table.Column>
              </Table.Header>
              <Table.Body>
                {session.subscribers.map((s) => (
                  <Table.Row key={s.id}>
                    <Table.Cell className="font-medium">{s.name}</Table.Cell>
                    <Table.Cell className="text-muted">{s.email}</Table.Cell>
                    <Table.Cell className="text-muted whitespace-nowrap">{s.subscribedAt}</Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        <ConfirmButton
                          label={`Remove ${s.name}`}
                          icon={<PersonXmark aria-hidden />}
                          iconOnly
                          variant="ghost"
                          title={`Remove ${s.name}?`}
                          body="They are unsubscribed from this session and the seat becomes available."
                          confirmLabel="Remove"
                          successMessage="Subscription removed"
                          onConfirm={() => removeSubscriber(session.id, s.id)}
                        />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </>
  );
}
