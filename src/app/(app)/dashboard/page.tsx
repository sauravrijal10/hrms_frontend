"use client";

import Link from "next/link";
import { useApi } from "@/lib/api";
import { useIsClient } from "@/lib/hooks";
import { formatDate, formatDateRange, pluralDays, todayIso } from "@/lib/format";
import type { Holiday, LeaveBalance, LeaveRequest } from "@/lib/types";
import { useSession } from "@/components/session";
import { BalanceCards } from "@/components/leave";
import { Card, DataState, EmptyState, LinkButton, PageHeader, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  const { user, employee, isApprover, isHr } = useSession();
  const hasProfile = !!user.employeeId;
  const year = new Date().getFullYear();

  const balances = useApi<LeaveBalance[]>(hasProfile ? "/leave-balances/me" : null);
  const requests = useApi<LeaveRequest[]>(hasProfile ? "/leave-requests/me" : null);
  const pending = useApi<LeaveRequest[]>(isApprover ? "/leave-requests/pending-approvals" : null);
  const holidays = useApi<Holiday[]>("/holidays", { year });

  const today = todayIso();
  const upcoming = (holidays.data ?? []).filter((h) => h.date >= today).slice(0, 5);
  const firstName = employee?.firstName;
  const isClient = useIsClient();

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description={
          isClient
            ? new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
            : "\u00a0"
        }
        actions={hasProfile && <LinkButton href="/leave?apply=1">Apply for leave</LinkButton>}
      />

      {isApprover && (pending.data?.length ?? 0) > 0 && (
        <Link
          href="/approvals"
          className="mb-6 flex items-center justify-between rounded-xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          <span className="text-sm font-medium text-amber-900">
            {pending.data!.length} leave request{pending.data!.length === 1 ? "" : "s"} waiting for your approval
          </span>
          <span className="text-sm font-semibold text-amber-900">Review →</span>
        </Link>
      )}

      {hasProfile && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Leave balances · {year}</h2>
          <DataState
            data={balances.data}
            error={balances.error}
            empty={
              <Card>
                <EmptyState title="No leave balances yet">
                  {isHr ? (
                    <>
                      Create <Link href="/leave-types" className="text-indigo-600">leave types</Link> to allocate balances.
                    </>
                  ) : (
                    "Your HR team hasn't set up leave types yet."
                  )}
                </EmptyState>
              </Card>
            }
          >
            {(data) => <BalanceCards balances={data} />}
          </DataState>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {hasProfile && (
          <Card
            className="lg:col-span-2"
            title="Recent leave requests"
            actions={<LinkButton href="/leave" variant="ghost" size="sm">View all</LinkButton>}
            bodyClassName="p-0"
          >
            <DataState
              data={requests.data}
              error={requests.error}
              empty={<EmptyState title="No leave requests yet">Requests you submit will show up here.</EmptyState>}
            >
              {(data) => (
                <ul className="divide-y divide-slate-100">
                  {data.slice(0, 5).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{r.leaveTypeName}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateRange(r.startDate, r.endDate)} · {pluralDays(r.days)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </Card>
        )}

        <Card
          title="Upcoming holidays"
          actions={<LinkButton href="/holidays" variant="ghost" size="sm">All</LinkButton>}
          bodyClassName="p-0"
        >
          <DataState
            data={holidays.data ? upcoming : undefined}
            error={holidays.error}
            empty={<EmptyState title="No more holidays this year" />}
          >
            {(data) => (
              <ul className="divide-y divide-slate-100">
                {data.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="truncate text-sm text-slate-900">{h.name}</span>
                    <span className="text-xs whitespace-nowrap text-slate-500">{formatDate(h.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </Card>
      </div>
    </>
  );
}
