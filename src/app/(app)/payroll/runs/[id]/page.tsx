"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { formatDateTime, formatDays, formatMoney, monthLabel } from "@/lib/format";
import type {
  ComponentKind,
  PayrollRunDetail,
  PayrollSettings,
  PayslipDetail,
  PayslipLine,
  PayslipSummary,
} from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { PayslipView, RunStatusBadge } from "@/components/payroll";
import { useSession, useToast } from "@/components/session";
import {
  Alert,
  Badge,
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
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";

export default function PayrollRunPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useSession();
  const detail = useApi<PayrollRunDetail>(`/payroll/runs/${id}`);
  const settings = useApi<PayrollSettings>("/payroll/settings");
  const approvalRequired = settings.data?.finalizeApprovalRequired ?? false;
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"finalize" | "delete" | "submit" | "approve" | "sendBack" | null>(null);
  const [note, setNote] = useState("");
  const [openPayslip, setOpenPayslip] = useState<string | null>(null);

  async function action(name: string, run: () => Promise<unknown>, success: string) {
    setBusy(name);
    try {
      await run();
      toast(success);
      detail.reload();
    } catch (e) {
      toast(toApiError(e).message, "error");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  async function download(path: string, name: string) {
    try {
      await downloadFile(path, name);
    } catch (e) {
      toast(toApiError(e).message, "error");
    }
  }

  return (
    <HrOnly>
      <Link href="/payroll" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Payroll
      </Link>
      <DataState data={detail.data} error={detail.error}>
        {({ run, payslips, missingSalary, unreturnedAssets }) => {
          const draft = run.status === "DRAFT";
          const pending = run.status === "PENDING_APPROVAL";
          const iSubmitted = pending && run.submittedBy?.toLowerCase() === user.email.toLowerCase();
          const money = (n: number) => formatMoney(n, run.currency);
          return (
            <>
              <PageHeader
                title={`Payroll · ${monthLabel(run.year, run.month)}`}
                description={
                  run.status === "PAID"
                    ? `Paid · marked by ${run.paidBy} on ${formatDateTime(run.paidAt)}`
                    : run.status === "FINALIZED"
                      ? `Finalized by ${run.finalizedBy} on ${formatDateTime(run.finalizedAt)}. Payslips were sent to employees.`
                      : pending
                        ? "Waiting for a second HR admin's approval. Payslips are locked and not visible to employees yet."
                        : "Draft: nothing is visible to employees yet. Recalculate after changing salaries, leave or settings."
                }
                actions={
                  <>
                    <RunStatusBadge status={run.status} />
                    <Button size="sm" variant="secondary" onClick={() => download(`/payroll/runs/${id}/register.csv`, "payroll-register.csv")}>
                      Register CSV
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => download(`/payroll/runs/${id}/bank-transfer.csv`, "bank-transfer.csv")}>
                      Bank transfer CSV
                    </Button>
                    {draft && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busy === "recalc"}
                          onClick={() => action("recalc", () => api(`/payroll/runs/${id}/recalculate`, { method: "POST" }), "Payroll recalculated")}
                        >
                          Recalculate
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm("delete")}>
                          Delete draft
                        </Button>
                        {approvalRequired ? (
                          <Button size="sm" onClick={() => setConfirm("submit")} disabled={payslips.length === 0}>
                            Submit for approval
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setConfirm("finalize")}
                            disabled={payslips.length === 0 || settings.data === undefined}
                          >
                            Finalize
                          </Button>
                        )}
                      </>
                    )}
                    {pending &&
                      (iSubmitted ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busy === "withdraw"}
                          onClick={() =>
                            action(
                              "withdraw",
                              () => api(`/payroll/runs/${id}/send-back`, { method: "POST", body: {} }),
                              "Withdrawn; the payroll is a draft again",
                            )
                          }
                        >
                          Withdraw
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => setConfirm("sendBack")}>
                            Send back
                          </Button>
                          <Button size="sm" onClick={() => setConfirm("approve")}>
                            Approve and finalize
                          </Button>
                        </>
                      ))}
                    {run.status === "FINALIZED" && (
                      <Button
                        size="sm"
                        loading={busy === "paid"}
                        onClick={() => action("paid", () => api(`/payroll/runs/${id}/mark-paid`, { method: "POST" }), "Marked as paid")}
                      >
                        Mark as paid
                      </Button>
                    )}
                  </>
                }
              />

              {pending && (
                <div className="mb-4">
                  <Alert kind="info">
                    Submitted for approval by <strong className="font-semibold">{run.submittedBy}</strong> on{" "}
                    {formatDateTime(run.submittedAt)}.{" "}
                    {iSubmitted
                      ? "Another HR admin has to approve it. You can withdraw it to make changes."
                      : "Review the payslips, then approve to finalize and send them, or send it back with a note."}
                  </Alert>
                </div>
              )}
              {draft && run.returnedBy && (
                <div className="mb-4">
                  <Alert kind="error">
                    Sent back to draft by <strong className="font-semibold">{run.returnedBy}</strong> on{" "}
                    {formatDateTime(run.returnedAt)}
                    {run.returnNote ? <>: “{run.returnNote}”</> : "."}
                  </Alert>
                </div>
              )}

              {(draft || pending) && missingSalary.length > 0 && (
                <div className="mb-4">
                  <Alert kind="info">
                    <strong className="font-semibold">
                      {missingSalary.length} employee{missingSalary.length === 1 ? " has" : "s have"} no salary for this month
                    </strong>{" "}
                    and {missingSalary.length === 1 ? "is" : "are"} left out: {missingSalary.slice(0, 8).join(", ")}
                    {missingSalary.length > 8 && ` and ${missingSalary.length - 8} more`}. Set salaries on their employee page,
                    then recalculate.
                  </Alert>
                </div>
              )}

              {unreturnedAssets.length > 0 && (
                <div className="mb-4">
                  <Alert>
                    <strong className="font-semibold">Company items not returned yet:</strong> {unreturnedAssets.join(", ")}.
                    Collect them (or record them as lost) before the final settlement. See{" "}
                    <Link href="/assets" className="font-medium underline">
                      Assets
                    </Link>
                    .
                  </Alert>
                </div>
              )}

              <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Employees" value={String(run.totals.employees)} />
                <Stat label="Gross pay" value={money(run.totals.gross)} />
                <Stat label="Deductions" value={money(run.totals.deductions)} hint="incl. tax" />
                <Stat label="Tax" value={money(run.totals.tax)} />
                <Stat label="Net pay" value={money(run.totals.netPay)} strong />
                <Stat label="Employer contributions" value={money(run.totals.employerContributions)} />
              </div>

              <Card bodyClassName="pb-0">
                {payslips.length === 0 ? (
                  <EmptyState title="No payslips">Nobody has a salary for this month yet.</EmptyState>
                ) : (
                  <PayslipTable payslips={payslips} money={money} onOpen={setOpenPayslip} />
                )}
              </Card>

              <PayslipDialog
                runId={id}
                payslipId={openPayslip}
                editable={draft}
                onClose={() => setOpenPayslip(null)}
                onChanged={detail.reload}
              />

              <Modal
                open={confirm === "finalize"}
                onClose={() => setConfirm(null)}
                title={`Finalize ${monthLabel(run.year, run.month)}?`}
                description="Payslips are locked and each employee is emailed that theirs is ready. This can't be undone."
                footer={
                  <>
                    <Button variant="secondary" onClick={() => setConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      loading={busy === "finalize"}
                      onClick={() =>
                        action("finalize", () => api(`/payroll/runs/${id}/finalize`, { method: "POST" }), "Payroll finalized; payslips sent")
                      }
                    >
                      Finalize and send payslips
                    </Button>
                  </>
                }
              >
                <p className="text-sm text-slate-600">
                  {run.totals.employees} payslips, net pay {money(run.totals.netPay)} in total.
                </p>
              </Modal>
              <Modal
                open={confirm === "submit"}
                onClose={() => setConfirm(null)}
                title={`Submit ${monthLabel(run.year, run.month)} for approval?`}
                description="The payroll is locked and the other HR admins are emailed to review it. One of them has to approve it before payslips go out."
                footer={
                  <>
                    <Button variant="secondary" onClick={() => setConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      loading={busy === "submit"}
                      onClick={() =>
                        action("submit", () => api(`/payroll/runs/${id}/submit`, { method: "POST" }), "Submitted for approval")
                      }
                    >
                      Submit for approval
                    </Button>
                  </>
                }
              >
                <p className="text-sm text-slate-600">
                  {run.totals.employees} payslips, net pay {money(run.totals.netPay)} in total.
                </p>
              </Modal>
              <Modal
                open={confirm === "approve"}
                onClose={() => setConfirm(null)}
                title={`Approve ${monthLabel(run.year, run.month)}?`}
                description="The payroll is finalized, payslips are locked and each employee is emailed that theirs is ready. This can't be undone."
                footer={
                  <>
                    <Button variant="secondary" onClick={() => setConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      loading={busy === "approve"}
                      onClick={() =>
                        action("approve", () => api(`/payroll/runs/${id}/approve`, { method: "POST" }), "Payroll approved; payslips sent")
                      }
                    >
                      Approve and send payslips
                    </Button>
                  </>
                }
              >
                <p className="text-sm text-slate-600">
                  Submitted by {run.submittedBy}. {run.totals.employees} payslips, net pay {money(run.totals.netPay)} in total.
                </p>
              </Modal>
              <Modal
                open={confirm === "sendBack"}
                onClose={() => setConfirm(null)}
                title="Send back to draft?"
                description={`${run.submittedBy} is emailed your note and can change the payroll and submit it again.`}
                footer={
                  <>
                    <Button variant="secondary" onClick={() => setConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      loading={busy === "sendBack"}
                      disabled={!note.trim()}
                      onClick={() =>
                        action(
                          "sendBack",
                          async () => {
                            await api(`/payroll/runs/${id}/send-back`, { method: "POST", body: { note: note.trim() } });
                            setNote("");
                          },
                          "Sent back to draft",
                        )
                      }
                    >
                      Send back
                    </Button>
                  </>
                }
              >
                <Field label="What needs to change?" required>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} autoFocus />
                </Field>
              </Modal>
              <Modal
                open={confirm === "delete"}
                onClose={() => setConfirm(null)}
                title="Delete this draft?"
                description="The draft and any one-off adjustments are removed. You can start the month again."
                footer={
                  <>
                    <Button variant="secondary" onClick={() => setConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      loading={busy === "delete"}
                      onClick={async () => {
                        setBusy("delete");
                        try {
                          await api(`/payroll/runs/${id}`, { method: "DELETE" });
                          toast("Draft deleted");
                          router.push("/payroll");
                        } catch (e) {
                          toast(toApiError(e).message, "error");
                          setBusy(null);
                        }
                      }}
                    >
                      Delete draft
                    </Button>
                  </>
                }
              >
                <span />
              </Modal>
            </>
          );
        }}
      </DataState>
    </HrOnly>
  );
}

function Stat({ label, value, hint, strong = false }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={strong ? "rounded-xl bg-indigo-600 p-4 text-white" : "rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"}>
      <p className={strong ? "text-xs text-indigo-100" : "text-xs text-slate-500"}>
        {label}
        {hint && <span className="ml-1 opacity-70">({hint})</span>}
      </p>
      <p className={`mt-1 font-semibold tabular-nums ${strong ? "text-white" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function PayslipTable({
  payslips,
  money,
  onOpen,
}: {
  payslips: PayslipSummary[];
  money: (n: number) => string;
  onOpen: (id: string) => void;
}) {
  return (
    <Table>
      <thead className="bg-slate-50">
        <tr>
          <Th>Employee</Th>
          <Th>Days paid</Th>
          <Th className="text-right">Gross</Th>
          <Th className="text-right">Deductions</Th>
          <Th className="text-right">Tax</Th>
          <Th className="text-right">Net pay</Th>
          <Th />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {payslips.map((p) => (
          <tr key={p.id}>
            <Td>
              <p className="font-medium text-slate-900">
                {p.employeeName}
                {p.hasOneOffs && (
                  <span className="ml-2">
                    <Badge tone="blue">Adjusted</Badge>
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">{[p.employeeCode, p.departmentName].filter(Boolean).join(" · ")}</p>
            </Td>
            <Td className="whitespace-nowrap">
              {formatDays(p.payableDays)} / {formatDays(p.workingDays)}
              {Number(p.unpaidLeaveDays) > 0 && (
                <span className="ml-1 text-xs text-amber-700">({formatDays(p.unpaidLeaveDays)} unpaid)</span>
              )}
            </Td>
            <Td className="text-right tabular-nums">{money(p.gross)}</Td>
            <Td className="text-right tabular-nums">{money(p.totalDeductions)}</Td>
            <Td className="text-right tabular-nums">{money(p.tax)}</Td>
            <Td className="text-right font-semibold text-slate-900 tabular-nums">{money(p.netPay)}</Td>
            <Td className="text-right">
              <Button size="sm" variant="ghost" onClick={() => onOpen(p.id)}>
                View
              </Button>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function PayslipDialog({
  runId,
  payslipId,
  editable,
  onClose,
  onChanged,
}: {
  runId: string;
  payslipId: string | null;
  editable: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const payslip = useApi<PayslipDetail>(payslipId ? `/payslips/${payslipId}` : null);

  async function remove(line: PayslipLine) {
    try {
      await api(`/payroll/runs/${runId}/payslips/${payslipId}/adjustments/${line.id}`, { method: "DELETE" });
      toast(`Removed “${line.name}”`);
      payslip.reload();
      onChanged();
    } catch (e) {
      toast(toApiError(e).message, "error");
    }
  }

  return (
    <Modal open={payslipId !== null} onClose={onClose} title={payslip.data?.employeeName ?? "Payslip"} size="lg">
      {payslip.data && (
        <div className="space-y-6">
          <PayslipView payslip={payslip.data} onRemoveOneOff={editable ? remove : undefined} />
          {editable && (
            <AdjustmentForm
              key={payslipId}
              runId={runId}
              payslipId={payslipId!}
              currency={payslip.data.currency}
              onAdded={() => {
                payslip.reload();
                onChanged();
              }}
            />
          )}
        </div>
      )}
      {payslip.error && <Alert>{payslip.error.message}</Alert>}
    </Modal>
  );
}

/** One-off earning (bonus, overtime) or deduction (advance recovery) for this month only. */
function AdjustmentForm({
  runId,
  payslipId,
  currency,
  onAdded,
}: {
  runId: string;
  payslipId: string;
  currency: string;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<ComponentKind>("EARNING");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [taxable, setTaxable] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/payroll/runs/${runId}/payslips/${payslipId}/adjustments`, {
        body: { kind, name: name.trim(), amount: Number(amount), taxable },
      });
      toast(`Added “${name.trim()}”`);
      setName("");
      setAmount("");
      onAdded();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="mb-3 text-sm font-semibold text-slate-900">Add a one-off for this month</p>
      <FormError error={error} />
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr_9rem]">
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as ComponentKind)}>
            <option value="EARNING">Earning</option>
            <option value="DEDUCTION">Deduction</option>
          </Select>
        </Field>
        <Field label="Description" error={fe.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "EARNING" ? "Festival bonus, overtime…" : "Advance recovery…"}
            maxLength={120}
            required
          />
        </Field>
        <Field label={`Amount (${currency})`} error={fe.amount}>
          <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {kind === "EARNING" ? (
          <Checkbox label="Taxable" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} />
        ) : (
          <span className="text-xs text-slate-500">Deductions are taken after tax.</span>
        )}
        <Button type="submit" size="sm" loading={saving}>
          Add to payslip
        </Button>
      </div>
    </form>
  );
}
