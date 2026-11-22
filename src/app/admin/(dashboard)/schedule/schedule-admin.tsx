"use client";

import { Pencil, Plus, TrashBin } from "@gravity-ui/icons";
import { Table } from "@heroui/react";
import { deletePlenary, savePlenary } from "@/app/admin/actions";
import { ConfirmButton, EmptyState, Field, FormDialog, Hidden, TimeFields } from "@/components/admin/kit";
import { PageHeader } from "@/components/page-header";
import type { getAdminPlenary } from "@/lib/admin-data";

type Item = Awaited<ReturnType<typeof getAdminPlenary>>[number];

function ItemFields({ item }: { item?: Item }) {
  return (
    <>
      {item && <Hidden name="id" value={item.id} />}
      <Field name="title" label="Title" defaultValue={item?.title} maxLength={160} />
      <Field name="location" label="Room" defaultValue={item?.location} maxLength={120} />
      <TimeFields startsAt={item?.startsAt} endsAt={item?.endsAt} />
    </>
  );
}

export function ScheduleAdmin({ items }: { items: Item[] }) {
  return (
    <>
      <PageHeader
        title="Schedule"
        description="Programme items everyone attends, such as the opening, lunch and drinks."
        actions={
          <FormDialog
            triggerLabel="Add item"
            triggerVariant="primary"
            triggerSize="md"
            triggerIcon={<Plus aria-hidden />}
            title="Add schedule item"
            submitLabel="Add item"
            successMessage="Item added"
            action={savePlenary}
          >
            <ItemFields />
          </FormDialog>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="No schedule items yet." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Schedule" className="min-w-[560px]">
              <Table.Header>
                <Table.Column isRowHeader>Time</Table.Column>
                <Table.Column>Title</Table.Column>
                <Table.Column>Room</Table.Column>
                <Table.Column className="text-end">Actions</Table.Column>
              </Table.Header>
              <Table.Body>
                {items.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell className="whitespace-nowrap tabular-nums">
                      <span className="text-muted">{item.day}</span> {item.time}
                    </Table.Cell>
                    <Table.Cell className="font-medium">{item.title}</Table.Cell>
                    <Table.Cell>{item.location}</Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end gap-2">
                        <FormDialog
                          triggerLabel={`Edit ${item.title}`}
                          triggerIcon={<Pencil aria-hidden />}
                          iconOnly
                          triggerVariant="ghost"
                          title="Edit schedule item"
                          successMessage="Item saved"
                          action={savePlenary}
                        >
                          <ItemFields item={item} />
                        </FormDialog>
                        <ConfirmButton
                          label={`Delete ${item.title}`}
                          icon={<TrashBin aria-hidden />}
                          iconOnly
                          variant="ghost"
                          title={`Delete ${item.title}?`}
                          body="It disappears from everyone's schedule."
                          successMessage="Item deleted"
                          onConfirm={() => deletePlenary(item.id)}
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
