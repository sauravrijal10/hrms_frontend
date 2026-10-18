"use client";

import Link from "next/link";
import { useApi } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { Avatar, Card, DataState, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";

export default function TeamPage() {
  const team = useApi<Employee[]>("/employees/me/team");

  return (
    <>
      <PageHeader title="My team" description="People who report directly to you." />
      <Card bodyClassName="pb-0">
        <DataState
          data={team.data}
          error={team.error}
          empty={<EmptyState title="No direct reports">Nobody reports to you yet.</EmptyState>}
        >
          {(data) => (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Designation</Th>
                  <Th>Department</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/employees/${e.id}`} className="flex items-center gap-3">
                        <Avatar name={e.fullName} />
                        <span>
                          <span className="block font-medium text-slate-900">{e.fullName}</span>
                          <span className="block text-xs text-slate-500">{e.email}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td>{e.designation || "—"}</Td>
                    <Td>{e.departmentName || "—"}</Td>
                    <Td>
                      <StatusBadge status={e.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DataState>
      </Card>
    </>
  );
}
