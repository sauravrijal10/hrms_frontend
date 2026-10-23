"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { humanize } from "@/lib/format";
import { LEAVE_STATUSES, type Employee, type LeaveRequest, type LeaveStatus, type Page } from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { useSession } from "@/components/session";
import { DecisionButtons, DecisionDialog, LeaveRequestTable, type Decision } from "@/components/leave";
import { Button, Card, DataState, EmptyState, Field, Input, PageHeader, Pagination, Select } from "@/components/ui";

export default function LeaveRequestsPage() {
  return (
    <HrOnly>
      <LeaveRequests />
    </HrOnly>
  );
}

const EMPTY_FILTERS = { status: "" as LeaveStatus | "", employeeId: "", from: "", to: "" };

function LeaveRequests() {
  const { user } = useSession();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const people = useApi<Page<Employee>>("/employees", { size: 500, sort: "firstName" });
  const requests = useApi<Page<LeaveRequest>>("/leave-requests", { ...filters, page, size: 20 });

  const update = (patch: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <>
      <PageHeader title="All leave requests" description="Search every leave request in your company." />
      <Card bodyClassName="pb-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Field label="Status">
            <Select value={filters.status} onChange={(e) => update({ status: e.target.value as LeaveStatus | "" })}>
              <option value="">Any status</option>
              {LEAVE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Employee">
            <Select value={filters.employeeId} onChange={(e) => update({ employeeId: e.target.value })}>
              <option value="">Everyone</option>
              {people.data?.content.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
          </Field>
          <Field label="To">
            <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} />
          </Field>
          <div>
            {filtered && (
              <Button variant="ghost" onClick={() => update(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
        <DataState
          data={requests.data}
          error={requests.error}
          isEmpty={(d) => d.content.length === 0}
          empty={<EmptyState title="No leave requests match these filters" />}
        >
          {(data) => (
            <>
              <LeaveRequestTable
                requests={data.content}
                showEmployee
                actions={(r) =>
                  r.status === "PENDING" && r.employeeId !== user.employeeId ? (
                    <DecisionButtons request={r} onDecide={setDecision} />
                  ) : null
                }
              />
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
      <DecisionDialog
        isHr
        decision={decision}
        onClose={() => setDecision(null)}
        onDone={() => {
          setDecision(null);
          requests.reload();
        }}
      />
    </>
  );
}
