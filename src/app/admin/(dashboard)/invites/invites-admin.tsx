"use client";

import { Copy, Plus } from "@gravity-ui/icons";
import { Button, Chip, Input, Modal, Table, toast } from "@heroui/react";
import { useState } from "react";
import { createInviteLink, revokeInvite } from "@/app/admin/actions";
import { ConfirmButton, EmptyState, Field, FormDialog } from "@/components/admin/kit";
import { FormAlert } from "@/components/auth-ui";
import { PageHeader } from "@/components/page-header";
import type { getAdminInvites } from "@/lib/admin-data";
import type { InviteStatus } from "@/lib/invites";

type Invite = Awaited<ReturnType<typeof getAdminInvites>>[number];

const STATUS: Record<InviteStatus, { label: string; color: "success" | "default" | "danger" | "warning" }> = {
  active: { label: "Active", color: "success" },
  expired: { label: "Expired", color: "default" },
  revoked: { label: "Revoked", color: "danger" },
  used_up: { label: "Used up", color: "warning" },
};

export function InvitesAdmin({ invites, defaultExpiry }: { invites: Invite[]; defaultExpiry: string }) {
  const [created, setCreated] = useState<string | null>(null);

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      toast.success("Link copied");
    } catch {
      toast.danger("Could not copy to the clipboard");
    }
  }

  return (
    <>
      <PageHeader
        title="Invites"
        description="Accounts can only be created through one of these links."
        actions={
          <FormDialog
            triggerLabel="New invite link"
            triggerVariant="primary"
            triggerSize="md"
            triggerIcon={<Plus aria-hidden />}
            title="New invite link"
            submitLabel="Create link"
            action={createInviteLink}
            onSuccess={(res) => setCreated(res.url)}
          >
            <Field name="label" label="Label" maxLength={120} description="For example: Sign-up email, late registrations." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="expiresAt" label="Expires" type="datetime-local" defaultValue={defaultExpiry} />
              <Field
                name="maxUses"
                label="Maximum uses"
                type="number"
                min={1}
                inputMode="numeric"
                isRequired={false}
                description="Empty for unlimited."
              />
            </div>
          </FormDialog>
        }
      />

      <Modal.Backdrop isOpen={created !== null} onOpenChange={(open) => !open && setCreated(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Invite link created</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <FormAlert status="warning">Copy it now. For security it is not shown again.</FormAlert>
              <Input aria-label="Invite link" value={created ?? ""} readOnly className="font-mono text-xs" />
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                Close
              </Button>
              <Button onPress={copy}>
                <Copy aria-hidden />
                Copy link
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {invites.length === 0 ? (
        <EmptyState title="No invite links yet." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Invite links" className="min-w-[680px]">
              <Table.Header>
                <Table.Column isRowHeader>Label</Table.Column>
                <Table.Column>Created</Table.Column>
                <Table.Column>Expires</Table.Column>
                <Table.Column>Used</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column className="text-end">Revoke</Table.Column>
              </Table.Header>
              <Table.Body>
                {invites.map((i) => (
                  <Table.Row key={i.id}>
                    <Table.Cell className="font-medium">{i.label}</Table.Cell>
                    <Table.Cell className="text-muted whitespace-nowrap">{i.created}</Table.Cell>
                    <Table.Cell className="text-muted whitespace-nowrap">{i.expires}</Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {i.uses}
                      {i.maxUses !== null && ` / ${i.maxUses}`}
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="soft" color={STATUS[i.status].color}>
                        <Chip.Label>{STATUS[i.status].label}</Chip.Label>
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        {i.status === "active" && (
                          <ConfirmButton
                            label="Revoke"
                            title={`Revoke "${i.label}"?`}
                            body="The link stops working immediately. Accounts already created with it stay."
                            confirmLabel="Revoke"
                            successMessage="Invite revoked"
                            onConfirm={() => revokeInvite(i.id)}
                          />
                        )}
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
