"use client";

import { Card, Table } from "@heroui/react";
import Link from "next/link";
import { EmptyState, Fill } from "@/components/admin/kit";
import type { getOverview } from "@/lib/admin-data";

type Overview = Awaited<ReturnType<typeof getOverview>>;

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="gap-1">
      <p className="text-muted text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-muted text-xs">{hint}</p>}
    </Card>
  );
}

export function OverviewView({ overview, registrationStatus }: { overview: Overview; registrationStatus: string }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Accounts" value={overview.users} hint={`${overview.verified} verified`} />
        <Stat label="Subscriptions" value={overview.subscriptions} hint={`${overview.seats} seats in total`} />
        <Stat label="Full sessions" value={`${overview.full} / ${overview.slots.length}`} />
        <Stat label="Registration" value={<span className="text-base">{registrationStatus}</span>} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sessions</h2>
        {overview.slots.length === 0 ? (
          <EmptyState title="No sessions yet.">
            <Link href="/admin/speakers" className="text-link text-sm font-medium hover:underline">
              Add speakers
            </Link>
          </EmptyState>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Sessions" className="min-w-[640px]">
                <Table.Header>
                  <Table.Column isRowHeader>Time</Table.Column>
                  <Table.Column>Talk</Table.Column>
                  <Table.Column>Room</Table.Column>
                  <Table.Column>Filled</Table.Column>
                  <Table.Column className="text-end">Subscribers</Table.Column>
                </Table.Header>
                <Table.Body>
                  {overview.slots.map((s) => (
                    <Table.Row key={s.id}>
                      <Table.Cell className="whitespace-nowrap tabular-nums">
                        <span className="text-muted">{s.day}</span> {s.time}
                      </Table.Cell>
                      <Table.Cell>
                        <p className="font-medium">{s.talkTitle}</p>
                        <p className="text-muted text-xs">{s.speaker}</p>
                      </Table.Cell>
                      <Table.Cell>{s.location}</Table.Cell>
                      <Table.Cell>
                        <Fill taken={s.taken} capacity={s.capacity} />
                      </Table.Cell>
                      <Table.Cell className="text-end">
                        <Link
                          href={`/admin/sessions/${s.id}`}
                          className="text-link text-sm font-medium hover:underline"
                        >
                          View
                        </Link>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </section>
    </div>
  );
}
