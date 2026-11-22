"use client";

import { TrashBin } from "@gravity-ui/icons";
import { Chip, SearchField, Table } from "@heroui/react";
import { useMemo, useState } from "react";
import { deleteUser } from "@/app/admin/actions";
import { ConfirmButton, EmptyState } from "@/components/admin/kit";
import { PageHeader } from "@/components/page-header";
import type { getAdminUsers } from "@/lib/admin-data";

type User = Awaited<ReturnType<typeof getAdminUsers>>[number];

export function UsersAdmin({ users }: { users: User[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.includes(q)) : users;
  }, [users, query]);

  return (
    <>
      <PageHeader
        title="Users"
        description={`${users.length} account${users.length === 1 ? "" : "s"}`}
        actions={
          <SearchField aria-label="Search users" value={query} onChange={setQuery} className="w-64">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search name or email" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        }
      />

      {shown.length === 0 ? (
        <EmptyState title={users.length === 0 ? "No accounts yet." : "No matches."} />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Users" className="min-w-[720px]">
              <Table.Header>
                <Table.Column isRowHeader>Name</Table.Column>
                <Table.Column>Email</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column>Created</Table.Column>
                <Table.Column>Talks</Table.Column>
                <Table.Column className="text-end">Delete</Table.Column>
              </Table.Header>
              <Table.Body>
                {shown.map((u) => (
                  <Table.Row key={u.id}>
                    <Table.Cell className="font-medium">{u.name}</Table.Cell>
                    <Table.Cell className="text-muted">{u.email}</Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="soft" color={u.verified ? "success" : "warning"}>
                        <Chip.Label>{u.verified ? "Verified" : "Unverified"}</Chip.Label>
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="text-muted whitespace-nowrap">{u.created}</Table.Cell>
                    <Table.Cell className="tabular-nums">{u.subscriptions}</Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        <ConfirmButton
                          label={`Delete ${u.name}`}
                          icon={<TrashBin aria-hidden />}
                          iconOnly
                          variant="ghost"
                          title={`Delete ${u.name}'s account?`}
                          body={`${u.email} is signed out, and their account and ${u.subscriptions} subscription(s) are removed. This cannot be undone.`}
                          successMessage="Account deleted"
                          onConfirm={() => deleteUser(u.id)}
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
