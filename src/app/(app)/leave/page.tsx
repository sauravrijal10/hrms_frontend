"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatDateRange, formatDays, todayIso } from "@/lib/format";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";
import { useToast } from "@/components/session";
import { BalanceCards, LeaveRequestTable } from "@/components/leave";
import {
  Button,
  Card,
  Checkbox,
  DataState,
  EmptyState,
  Field,
  FormError,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";

export default function MyLeavePage() {
  const searchParams = useSearchParams();
  const [applying, setApplying] = useState(searchParams.get("apply") === "1");
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null);
  const balances = useApi<LeaveBalance[]>("/leave-balances/me");
  const requests = useApi<LeaveRequest[]>("/leave-requests/me");

  const refresh = () => {
    balances.reload();
    requests.reload();
  };

  const today = todayIso();
  const canCancel = (r: LeaveRequest) =>
    r.status === "PENDING" || (r.status === "APPROVED" && r.startDate > today);

  return (
    <>
      <PageHeader
        title="My leave"
        description="Your balances for this year and every request you've made."
        actions={<Button onClick={() => setApplying(true)}>Apply for leave</Button>}
      />

      <section className="mb-8">
        <DataState data={balances.data} error={balances.error} empty={null}>
          {(data) => <BalanceCards balances={data} />}
        </DataState>
      </section>

      <Card title="My requests" bodyClassName="pb-0">
        <DataState
          data={requests.data}
          error={requests.error}
          empty={<EmptyState title="No leave requests yet">Click “Apply for leave” to submit your first request.</EmptyState>}
        >
          {(data) => (
            <LeaveRequestTable
              requests={data}
              actions={(r) =>
                canCancel(r) && (
                  <Button size="sm" variant="secondary" onClick={() => setCancelling(r)}>
                    Cancel
                  </Button>
                )
              }
            />
          )}
        </DataState>
      </Card>

      <ApplyLeaveDialog
        open={applying}
        balances={balances.data ?? []}
        onClose={() => setApplying(false)}
        onDone={() => {
          setApplying(false);
          refresh();
        }}
      />
      <CancelDialog
        request={cancelling}
        onClose={() => setCancelling(null)}
        onDone={() => {
          setCancelling(null);
          refresh();
        }}
      />
    </>
  );
}

function ApplyLeaveDialog({
  open,
  balances,
  onClose,
  onDone,
}: {
  open: boolean;
  balances: LeaveBalance[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const types = useApi<LeaveType[]>(open ? "/leave-types" : null);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", halfDay: false, reason: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  const singleDay = !!form.startDate && form.startDate === form.endDate;
  const balance = balances.find((b) => b.leaveTypeId === form.leaveTypeId);

  const close = () => {
    setError(null);
    onClose();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api<LeaveRequest>("/leave-requests", {
        body: {
          leaveTypeId: form.leaveTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          halfDay: singleDay && form.halfDay,
          reason: form.reason.trim() || null,
        },
      });
      toast(`Request submitted for ${formatDays(created.days)} day(s)`);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", halfDay: false, reason: "" });
      onDone();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Apply for leave"
      description="Weekends and company holidays are not counted."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="apply-leave" loading={saving}>
            Submit request
          </Button>
        </>
      }
    >
      <form id="apply-leave" className="space-y-4" onSubmit={submit}>
        <FormError error={error} />
        <Field label="Leave type" error={fe.leaveTypeId} required>
          <Select
            value={form.leaveTypeId}
            onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
            required
          >
            <option value="">{types.data ? "Select a leave type" : "Loading…"}</option>
            {types.data?.map((t) => {
              const b = balances.find((x) => x.leaveTypeId === t.id);
              return (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {b ? ` — ${formatDays(b.available)} days available` : ""}
                </option>
              );
            })}
          </Select>
        </Field>
        {balance && Number(balance.available) <= 0 && (
          <p className="-mt-2 text-xs text-amber-700">You have no {balance.leaveTypeName} days left.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From" error={fe.startDate} required>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                setForm((f) => ({
                  ...f,
                  startDate,
                  endDate: !f.endDate || f.endDate < startDate ? startDate : f.endDate,
                }));
              }}
              required
            />
          </Field>
          <Field label="To" error={fe.endDate} required>
            <Input
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </Field>
        </div>
        {singleDay && (
          <Checkbox
            label="Half day"
            checked={form.halfDay}
            onChange={(e) => setForm({ ...form, halfDay: e.target.checked })}
          />
        )}
        <Field label="Reason" error={fe.reason}>
          <Textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            maxLength={1000}
            placeholder="Optional"
          />
        </Field>
      </form>
    </Modal>
  );
}

function CancelDialog({
  request,
  onClose,
  onDone,
}: {
  request: LeaveRequest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!request) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/leave-requests/${request.id}/cancel`, { method: "POST" });
      toast("Leave request cancelled");
      onDone();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!request}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title="Cancel leave request?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" loading={saving} onClick={confirm}>
            Cancel request
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-600">
        <FormError error={error} />
        {request && (
          <p>
            {request.leaveTypeName}, {formatDateRange(request.startDate, request.endDate)}. The{" "}
            {formatDays(request.days)} day(s) will be returned to your balance.
          </p>
        )}
      </div>
    </Modal>
  );
}
