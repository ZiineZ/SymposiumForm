"use client";

import { Pencil, Plus, TrashBin } from "@gravity-ui/icons";
import { Card, Table } from "@heroui/react";
import Link from "next/link";
import { deleteSession, deleteSpeaker, saveSession, saveSpeaker } from "@/app/admin/actions";
import { AreaField, ConfirmButton, EmptyState, Field, Fill, FormDialog, Hidden, TimeFields } from "@/components/admin/kit";
import { PageHeader } from "@/components/page-header";
import type { AdminSlot, AdminSpeaker } from "@/lib/admin-data";

function SpeakerFields({ speaker }: { speaker?: AdminSpeaker }) {
  return (
    <>
      {speaker && <Hidden name="id" value={speaker.id} />}
      <Field name="name" label="Name" defaultValue={speaker?.name} maxLength={120} />
      <Field name="affiliation" label="Affiliation" defaultValue={speaker?.affiliation} maxLength={160} />
      <Field name="talkTitle" label="Talk title" defaultValue={speaker?.talkTitle} maxLength={200} />
      <AreaField name="abstract" label="Abstract" defaultValue={speaker?.abstract} maxLength={4000} />
    </>
  );
}

function SessionFields({ speakerId, slot }: { speakerId: number; slot?: AdminSlot }) {
  return (
    <>
      <Hidden name="speakerId" value={speakerId} />
      {slot && <Hidden name="id" value={slot.id} />}
      <TimeFields startsAt={slot?.startsAt} endsAt={slot?.endsAt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="location" label="Room" defaultValue={slot?.location} maxLength={120} />
        <Field
          name="capacity"
          label="Capacity"
          type="number"
          min={1}
          inputMode="numeric"
          defaultValue={slot?.capacity}
          description={slot && slot.taken > 0 ? `${slot.taken} subscribed` : undefined}
        />
      </div>
    </>
  );
}

export function SpeakersAdmin({ speakers }: { speakers: AdminSpeaker[] }) {
  return (
    <>
      <PageHeader
        title="Speakers"
        actions={
          <FormDialog
            triggerLabel="Add speaker"
            triggerVariant="primary"
            triggerSize="md"
            triggerIcon={<Plus aria-hidden />}
            title="Add speaker"
            submitLabel="Add speaker"
            successMessage="Speaker added"
            action={saveSpeaker}
          >
            <SpeakerFields />
          </FormDialog>
        }
      />

      {speakers.length === 0 ? (
        <EmptyState title="No speakers yet." />
      ) : (
        <ul className="flex flex-col gap-6">
          {speakers.map((sp) => (
            <li key={sp.id}>
              <SpeakerCard speaker={sp} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SpeakerCard({ speaker }: { speaker: AdminSpeaker }) {
  const subscribed = speaker.slots.reduce((n, s) => n + s.taken, 0);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{speaker.name}</p>
          <p className="text-muted text-sm">{speaker.affiliation}</p>
          <p className="mt-2 font-medium">{speaker.talkTitle}</p>
          <p className="text-muted mt-1 line-clamp-2 text-sm">{speaker.abstract}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <FormDialog
            triggerLabel="Edit"
            triggerIcon={<Pencil aria-hidden />}
            title="Edit speaker"
            successMessage="Speaker saved"
            action={saveSpeaker}
          >
            <SpeakerFields speaker={speaker} />
          </FormDialog>
          <ConfirmButton
            label="Delete"
            icon={<TrashBin aria-hidden />}
            title={`Delete ${speaker.name}?`}
            body={
              subscribed > 0
                ? `This also deletes ${speaker.slots.length} session(s) and removes ${subscribed} subscription(s). This cannot be undone.`
                : `This also deletes ${speaker.slots.length} session(s). This cannot be undone.`
            }
            successMessage="Speaker deleted"
            onConfirm={() => deleteSpeaker(speaker.id)}
          />
        </div>
      </div>

      <div className="border-separator border-t">
        {speaker.slots.length > 0 && (
          <Table className="rounded-none">
            <Table.ScrollContainer>
              <Table.Content aria-label={`Sessions of ${speaker.name}`} className="min-w-[620px]">
                <Table.Header>
                  <Table.Column isRowHeader>Time</Table.Column>
                  <Table.Column>Room</Table.Column>
                  <Table.Column>Filled</Table.Column>
                  <Table.Column className="text-end">Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {speaker.slots.map((slot) => (
                    <Table.Row key={slot.id}>
                      <Table.Cell className="whitespace-nowrap tabular-nums">
                        <span className="text-muted">{slot.day}</span> {slot.time}
                      </Table.Cell>
                      <Table.Cell>{slot.location}</Table.Cell>
                      <Table.Cell>
                        <Fill taken={slot.taken} capacity={slot.capacity} />
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/sessions/${slot.id}`}
                            className="text-link px-2 text-sm font-medium hover:underline"
                          >
                            Subscribers
                          </Link>
                          <FormDialog
                            triggerLabel="Edit session"
                            triggerIcon={<Pencil aria-hidden />}
                            iconOnly
                            triggerVariant="ghost"
                            title="Edit session"
                            successMessage="Session saved"
                            action={saveSession}
                          >
                            <SessionFields speakerId={speaker.id} slot={slot} />
                          </FormDialog>
                          <ConfirmButton
                            label="Delete session"
                            icon={<TrashBin aria-hidden />}
                            iconOnly
                            variant="ghost"
                            title="Delete this session?"
                            body={
                              slot.taken > 0
                                ? `${slot.taken} people are subscribed. They will be removed from it. This cannot be undone.`
                                : "This cannot be undone."
                            }
                            successMessage="Session deleted"
                            onConfirm={() => deleteSession(slot.id)}
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
        <div className="px-5 py-3">
          <FormDialog
            triggerLabel="Add session"
            triggerVariant="ghost"
            triggerIcon={<Plus aria-hidden />}
            title={`Add session · ${speaker.name}`}
            submitLabel="Add session"
            successMessage="Session added"
            action={saveSession}
          >
            <SessionFields speakerId={speaker.id} />
          </FormDialog>
        </div>
      </div>
    </Card>
  );
}
