"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Page, PlatformOverview, TenantSummary } from "@/lib/types";
import {
  Badge,
  Card,
  DataState,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Pagination,
  Table,
  Td,
  Th,
} from "@/components/ui";

export default function PlatformCompaniesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const overview = useApi<PlatformOverview>("/platform/overview");
  const tenants = useApi<Page<TenantSummary>>("/platform/tenants", { q: query.trim(), page, size: 20 });

  const stats: [string, number | undefined, string?][] = [
    ["Companies", overview.data?.tenants],
    ["Active companies", overview.data?.activeTenants],
    ["Active employees", overview.data?.activeEmployees, "across all companies"],
    ["User accounts", overview.data?.users],
  ];

  return (
    <>
      <PageHeader
        title="Companies"
        description="Every company (tenant) on the platform."
        actions={<LinkButton href="/platform/tenants/new" variant="dark">New company</LinkButton>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value ?? "—"}</p>
            {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
          </div>
        ))}
      </div>

      <Card bodyClassName="pb-4">
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search by name or company ID"
          className="mb-4 max-w-sm"
          aria-label="Search companies"
        />
        <DataState
          data={tenants.data}
          error={tenants.error}
          isEmpty={(d) => d.content.length === 0}
          empty={
            <EmptyState title={query ? "No companies match your search" : "No companies yet"}>
              {!query && "Create the first company and its HR admin."}
            </EmptyState>
          }
        >
          {(data) => (
            <>
              <Table>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Company</Th>
                    <Th>Status</Th>
                    <Th>Active employees</Th>
                    <Th>Users</Th>
                    <Th>Timezone</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.content.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <Td>
                        <Link href={`/platform/tenants/${t.id}`} className="block">
                          <span className="block font-medium text-slate-900">{t.name}</span>
                          <span className="block font-mono text-xs text-slate-500">{t.slug}</span>
                        </Link>
                      </Td>
                      <Td>{t.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}</Td>
                      <Td>{t.activeEmployees}</Td>
                      <Td>{t.users}</Td>
                      <Td className="whitespace-nowrap">{t.timezone}</Td>
                      <Td className="whitespace-nowrap">{formatDate(t.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={data.page.number}
                totalPages={data.page.totalPages}
                totalElements={data.page.totalElements}
                onChange={setPage}
              />
            </>
          )}
        </DataState>
      </Card>
    </>
  );
}
