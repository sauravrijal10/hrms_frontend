"use client";

import { useState, type ReactNode } from "react";
import { api, toApiError, type ApiError } from "@/lib/api";
import { formatDateRange, formatDateTime, formatDays, pluralDays } from "@/lib/format";
import type { ApprovalStep, ApprovalStepKind, LeaveBalance, LeaveRequest } from "@/lib/types";
import { Badge, Button, cx, Field, FormError, Modal, StatusBadge, Table, Td, Textarea, Th } from "./ui";
import { useToast } from "./session";

// ---------------------------------------------------------------- balances

export function BalanceCards({ balances }: { balances: LeaveBalance[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {balances.map((b) => {
        const total = Number(b.allocated) + Number(b.carriedForward);
        const usedPct = total > 0 ? Math.min(100, (Number(b.used) / total) * 100) : 0;
        const pendingPct = total > 0 ? Math.min(100 - usedPct, (Number(b.pending) / total) * 100) : 0;
        return (
          <div key={b.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-600">{b.leaveTypeName}</p>
              <Badge>{b.leaveTypeCode}</Badge>
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {formatDays(b.available)}
              <span className="ml-1 text-sm font-normal text-slate-500">days left</span>
            </p>
            <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-indigo-600" style={{ width: `${usedPct}%` }} />
              <div className="bg-amber-400" style={{ width: `${pendingPct}%` }} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-slate-500">Total</dt>
                <dd className="font-medium text-slate-900">
                  {formatDays(total)}
                  {Number(b.carriedForward) > 0 && (
                    <span className="font-normal text-slate-500"> (+{formatDays(b.carriedForward)} c/f)</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Used</dt>
                <dd className="font-medium text-slate-900">{formatDays(b.used)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Pending</dt>
                <dd className="font-medium text-slate-900">{formatDays(b.pending)}</dd>
              </div>
            </dl>
            {b.proRated && (
              <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
                Pro-rated: {formatDays(b.allocated)} of {formatDays(b.fullYearDays)} days, as you joined during {b.year}.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- request table

export function LeaveRequestTable({
  requests,
  showEmployee = false,
  actions,
  details,
}: {
  requests: LeaveRequest[];
  showEmployee?: boolean;
  actions?: (r: LeaveRequest) => ReactNode;
  /** Extra lines at the end of the Details column, e.g. who else is off (approval inbox). */
  details?: (r: LeaveRequest) => ReactNode;
}) {
  return (
    <Table>
      <thead className="bg-slate-50">
        <tr>
          {showEmployee && <Th>Employee</Th>}
          <Th>Type</Th>
          <Th>Dates</Th>
          <Th>Days</Th>
          <Th>Status</Th>
          <Th>Details</Th>
          {actions && <Th className="text-right">Actions</Th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {requests.map((r) => (
          <tr key={r.id}>
            {showEmployee && <Td className="font-medium whitespace-nowrap text-slate-900">{r.employeeName}</Td>}
            <Td className="whitespace-nowrap">{r.leaveTypeName}</Td>
            <Td className="whitespace-nowrap">
              {formatDateRange(r.startDate, r.endDate)}
              {r.halfDay && <span className="ml-1 text-xs text-slate-500">(half day)</span>}
            </Td>
            <Td>{formatDays(r.days)}</Td>
            <Td>
              <StatusBadge status={r.status} />
            </Td>
            <Td className="max-w-xs min-w-48 text-xs text-slate-500">
              {r.reason && <p className="text-slate-700">{r.reason}</p>}
              {r.steps?.length ? (
                <ApprovalSteps steps={r.steps} />
              ) : (
                <>
                  {r.status === "PENDING" && r.approverName && <p className="mt-0.5">Approver: {r.approverName}</p>}
                  {r.decidedByName && r.status !== "CANCELLED" && (
                    <p className="mt-0.5">
                      Decided by {r.decidedByName}
                      {r.decidedAt && ` · ${formatDateTime(r.decidedAt)}`}
                    </p>
                  )}
                  {r.decisionComment && <p className="mt-0.5 italic">“{r.decisionComment}”</p>}
                </>
              )}
              {details?.(r)}
            </Td>
            {actions && (
              <Td className="text-right whitespace-nowrap">
                <div className="flex justify-end gap-2">{actions(r)}</div>
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// ---------------------------------------------------------------- approval steps

export const STEP_KIND_LABELS: Record<ApprovalStepKind, string> = {
  REPORTING_MANAGER: "Reporting manager",
  MANAGERS_MANAGER: "Manager's manager",
  HR_ADMIN: "HR admin",
};

/** Who decides a step: the named person, or HR admins when nobody is named. */
export function stepApprover(s: ApprovalStep): string {
  if (!s.hrAdmins) return s.approverName ?? "—";
  return s.kind === "HR_ADMIN" ? "HR admins" : "HR admins (no one in this role)";
}

const STEP_DOT: Record<ApprovalStep["status"], string> = {
  APPROVED: "bg-emerald-500",
  REJECTED: "bg-red-500",
  PENDING: "bg-amber-400 ring-4 ring-amber-100",
  WAITING: "bg-slate-300",
  SKIPPED: "bg-slate-200",
};

/** The approval chain of one request: who approved, who it is waiting on, and what comes next. */
export function ApprovalSteps({ steps }: { steps: ApprovalStep[] }) {
  return (
    <ol className="mt-1 space-y-1">
      {steps.map((s) => (
        <li key={s.order} className={cx("flex gap-2", s.status === "SKIPPED" && "text-slate-400")}>
          <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", STEP_DOT[s.status])} aria-hidden />
          <div>
            <p>
              <span className="font-medium text-slate-700">{STEP_KIND_LABELS[s.kind]}</span>
              {" · "}
              {s.status === "APPROVED" || s.status === "REJECTED" ? (
                <>
                  {s.status === "APPROVED" ? "Approved" : "Rejected"} by {s.decidedByName}
                  {s.decidedAt && ` · ${formatDateTime(s.decidedAt)}`}
                </>
              ) : s.status === "PENDING" ? (
                <>Waiting for {stepApprover(s)}</>
              ) : s.status === "WAITING" ? (
                <>Then {stepApprover(s)}</>
              ) : (
                <>{stepApprover(s)} · not needed</>
              )}
            </p>
            {s.comment && <p className="italic">“{s.comment}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** "Step 1 of 2" style progress for a pending request, or null when there is only one step. */
export function stepProgress(r: LeaveRequest): string | null {
  if (!r.steps || r.steps.length < 2 || r.status !== "PENDING") return null;
  const current = r.steps.find((s) => s.status === "PENDING");
  return current ? `Step ${current.order} of ${r.steps.length}` : null;
}

// ---------------------------------------------------------------- approve / reject

export type Decision = { request: LeaveRequest; action: "approve" | "reject" };

/** Approve (optional comment) or reject (comment required) a pending request. */
export function DecisionDialog({
  decision,
  onClose,
  onDone,
  isHr = false,
}: {
  decision: Decision | null;
  onClose: () => void;
  onDone: () => void;
  /** HR's approval completes the request at any step. */
  isHr?: boolean;
}) {
  const toast = useToast();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setComment("");
    setError(null);
    onClose();
  };

  async function submit() {
    if (!decision) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api<LeaveRequest>(`/leave-requests/${decision.request.id}/${decision.action}`, {
        method: "POST",
        body: { comment: comment.trim() || null },
      });
      const next = updated.steps?.find((s) => s.status === "PENDING");
      toast(
        decision.action === "reject"
          ? "Leave rejected"
          : updated.status === "PENDING" && next
            ? `Approved. Sent to ${stepApprover(next)} for the next approval.`
            : "Leave approved",
      );
      setComment("");
      onDone();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const r = decision?.request;
  const reject = decision?.action === "reject";
  const later = r?.steps?.filter((s) => s.status === "WAITING") ?? [];
  const finalByHr = isHr && later.length > 0;
  return (
    <Modal
      open={!!decision}
      onClose={close}
      title={reject ? "Reject leave request" : "Approve leave request"}
      description={
        r && `${r.employeeName} · ${r.leaveTypeName} · ${formatDateRange(r.startDate, r.endDate)} (${pluralDays(r.days)})`
      }
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={reject ? "danger" : "primary"}
            loading={saving}
            disabled={reject && !comment.trim()}
            onClick={submit}
          >
            {reject ? "Reject" : "Approve"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {r?.reason && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-medium">Reason:</span> {r.reason}
          </p>
        )}
        {r && r.steps?.length > 1 && (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Approval steps</p>
            <ApprovalSteps steps={r.steps} />
          </div>
        )}
        {!reject && later.length > 0 && (
          <p className="text-sm text-slate-600">
            {finalByHr
              ? "As an HR admin, your approval completes the request. The remaining steps will be skipped."
              : `After you approve, it goes to ${stepApprover(later[0])} for the next approval.`}
          </p>
        )}
        <FormError error={error} />
        <Field
          label={reject ? "Reason for rejection" : "Comment (optional)"}
          required={reject}
          error={error?.fieldErrors.comment}
        >
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}

/** Approve / Reject buttons that open the DecisionDialog. */
export function DecisionButtons({
  request,
  onDecide,
}: {
  request: LeaveRequest;
  onDecide: (d: Decision) => void;
}) {
  return (
    <>
      <Button size="sm" onClick={() => onDecide({ request, action: "approve" })}>
        Approve
      </Button>
      <Button size="sm" variant="secondary" onClick={() => onDecide({ request, action: "reject" })}>
        Reject
      </Button>
    </>
  );
}
