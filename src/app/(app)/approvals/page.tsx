"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/api";
import type { ApprovalOverlap, LeaveRequest } from "@/lib/types";
import { DecisionButtons, DecisionDialog, LeaveRequestTable, stepProgress, type Decision } from "@/components/leave";
import { Card, DataState, EmptyState, PageHeader } from "@/components/ui";
import { useSession } from "@/components/session";

export default function ApprovalsPage() {
  const { isHr } = useSession();
  const pending = useApi<LeaveRequest[]>("/leave-requests/pending-approvals");
  const overlaps = useApi<ApprovalOverlap[]>("/leave-calendar/approval-overlaps");
  const othersOff = new Map(overlaps.data?.map((o) => [o.requestId, o.others]));
  const [decision, setDecision] = useState<Decision | null>(null);
  // HR also sees requests still waiting on a manager; they can approve those too (and it completes them).
  const mine = pending.data?.filter((r) => r.awaitingYou !== false);
  const earlier = pending.data?.filter((r) => r.awaitingYou === false) ?? [];
  const table = (data: LeaveRequest[]) => (
    <LeaveRequestTable
      requests={data}
      showEmployee
      actions={(r) => <DecisionButtons request={r} onDecide={setDecision} />}
      details={(r) => (
        <>
          {stepProgress(r) && <p className="mt-1 font-medium text-slate-600">{stepProgress(r)}</p>}
          <AlsoOff others={othersOff.get(r.id)} />
        </>
      )}
    />
  );

  return (
    <>
      <PageHeader
        title="Approvals"
        description={
          isHr
            ? "Leave requests waiting for an HR admin. You can also approve requests still waiting on a manager; an HR approval completes the request."
            : "Leave requests waiting for your approval, from your team."
        }
      />
      <Card title={isHr ? "Needs your approval" : undefined} bodyClassName="pb-0">
        <DataState
          data={mine}
          error={pending.error}
          empty={<EmptyState title="You're all caught up">No leave requests are waiting for you.</EmptyState>}
        >
          {table}
        </DataState>
      </Card>
      {isHr && earlier.length > 0 && (
        <div className="mt-6">
          <Card
            title="Waiting on a manager"
            description="These are at an earlier approval step. You can still approve or reject them."
            bodyClassName="pb-0"
          >
            {table(earlier)}
          </Card>
        </div>
      )}
      <DecisionDialog
        isHr={isHr}
        decision={decision}
        onClose={() => setDecision(null)}
        onDone={() => {
          setDecision(null);
          pending.reload();
          overlaps.reload();
        }}
      />
    </>
  );
}

/** "Who else is off": teammates of the applicant with approved or pending leave on the same dates. */
function AlsoOff({ others }: { others: ApprovalOverlap["others"] | undefined }) {
  if (!others) return null;   // still loading
  if (others.length === 0) {
    return <p className="mt-1.5 text-emerald-700">No one else in their team is off then.</p>;
  }
  return (
    <div className="mt-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-amber-900 ring-1 ring-amber-200 ring-inset">
      <p className="font-medium">
        {others.length} other{others.length === 1 ? "" : "s"} in their team {others.length === 1 ? "is" : "are"} off:
      </p>
      <ul className="mt-0.5 space-y-0.5">
        {others.map((o) => (
          <li key={`${o.employeeId}-${o.startDate}`}>
            {o.employeeName} · {shortRange(o.startDate, o.endDate)}
            {o.halfDay && " (half day)"}
            {o.status === "PENDING" && <span className="text-amber-700"> · pending</span>}
          </li>
        ))}
      </ul>
      <Link href="/calendar" className="mt-1 inline-block font-medium text-amber-900 underline underline-offset-2">
        Open team calendar
      </Link>
    </div>
  );
}

/** "Nov 8 – 10" / "8–10 Nov" depending on locale: the year is obvious next to the request itself. */
function shortRange(start: string, end: string): string {
  const toDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  return start === end ? fmt.format(toDate(start)) : fmt.formatRange(toDate(start), toDate(end));
}
