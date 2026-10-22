"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatMoney, monthLabel, todayIso } from "@/lib/format";
import type { PayrollRunDetail, PayrollRunSummary, PayrollSettings } from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { RunStatusBadge } from "@/components/payroll";
import { Alert, Button, Card, DataState, EmptyState, Field, FormError, Input, LinkButton, Modal, PageHeader, Table, Td, Th } from "@/components/ui";

export default function PayrollPage() {
  const runs = useApi<PayrollRunSummary[]>("/payroll/runs");
  const settings = useApi<PayrollSettings>("/payroll/settings");
  const [starting, setStarting] = useState(false);
  const noTax = settings.data && settings.data.singleSlabs.length === 0;

  return (
    <HrOnly>
      <PageHeader
        title="Payroll"
        description="Run payroll once a month: review the draft, add one-off bonuses or corrections, then finalize to send payslips."
        actions={
          <>
            <LinkButton href="/payroll/settings" variant="secondary">
              Payroll settings
            </LinkButton>
            <Button onClick={() => setStarting(true)}>Run payroll</Button>
          </>
        }
      />
      {noTax && (
        <div className="mb-4">
          <Alert kind="info">
            No income tax slabs are set up yet, so payslips will show no tax. Add them in{" "}
            <Link href="/payroll/settings" className="font-medium underline">
              Payroll settings
            </Link>
            , along with allowances and contributions such as SSF. Salaries are set on each employee&apos;s page.
          </Alert>
        </div>
      )}
      <Card bodyClassName="pb-0">
        <DataState
          data={runs.data}
          error={runs.error}
          empty={<EmptyState title="No payroll yet">Start with “Run payroll” once employees have salaries.</EmptyState>}
        >
          {(data) => (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Month</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Employees</Th>
                  <Th className="text-right">Gross</Th>
                  <Th className="text-right">Tax</Th>
                  <Th className="text-right">Net pay</Th>
                  <Th className="text-right">Employer cost</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((r) => (
                  <tr key={r.id}>
                    <Td className="font-medium text-slate-900">{monthLabel(r.year, r.month)}</Td>
                    <Td>
                      <RunStatusBadge status={r.status} />
                    </Td>
                    <Td className="text-right">{r.totals.employees}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(r.totals.gross, r.currency)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(r.totals.tax, r.currency)}</Td>
                    <Td className="text-right font-semibold text-slate-900 tabular-nums">{formatMoney(r.totals.netPay, r.currency)}</Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(Number(r.totals.gross) + Number(r.totals.employerContributions), r.currency)}
                    </Td>
                    <Td className="text-right">
                      <Link href={`/payroll/runs/${r.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        {r.status === "DRAFT" ? "Review" : "Open"}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DataState>
      </Card>
      <StartRunDialog open={starting} onClose={() => setStarting(false)} />
    </HrOnly>
  );
}

function StartRunDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const [year, m] = month.split("-").map(Number);
    setSaving(true);
    setError(null);
    try {
      const run = await api<PayrollRunDetail>("/payroll/runs", { body: { year, month: m } });
      router.push(`/payroll/runs/${run.run.id}`);
    } catch (err) {
      setError(toApiError(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Run payroll"
      description="Calculates a draft payslip for everyone with a salary. Nothing is sent until you finalize."
    >
      <form className="space-y-4" onSubmit={submit}>
        <FormError error={error} />
        <Field label="Month" required>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Calculate draft
          </Button>
        </div>
      </form>
    </Modal>
  );
}
