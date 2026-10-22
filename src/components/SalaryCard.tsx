"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, humanize, todayIso } from "@/lib/format";
import type { EmployeeSalaryOverview, FilingStatus, PayComponent, Salary } from "@/lib/types";
import { useToast } from "./session";
import { Badge, Button, Card, Field, FormError, Input, Loading, Modal, Select, Table, Td, Textarea, Th } from "./ui";

/** HR only: an employee's salary, its history, and changing it. */
export function SalaryCard({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const overview = useApi<EmployeeSalaryOverview>(`/employees/${employeeId}/salary`);
  const [changing, setChanging] = useState(false);
  const data = overview.data;
  const today = todayIso();

  return (
    <Card
      title="Salary"
      description="Visible to HR only. Employees see their payslips."
      actions={<Button size="sm" onClick={() => setChanging(true)}>{data?.history.length ? "Change salary" : "Set salary"}</Button>}
    >
      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          {data.current ? (
            <SalaryBreakdown salary={data.current} currency={data.currency} />
          ) : (
            <p className="text-sm text-slate-500">
              {data.history.length
                ? "No salary in force yet: the first one starts later (see history)."
                : "No salary set. Until one is set, this employee is left out of payroll."}
            </p>
          )}
          {data.history.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">History</p>
              <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
                <Table>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>From</Th>
                      <Th className="text-right">Basic</Th>
                      <Th className="text-right">Monthly gross</Th>
                      <Th>Tax status</Th>
                      <Th>Changed by</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.history.map((s) => (
                      <tr key={s.id}>
                        <Td className="whitespace-nowrap">
                          {formatDate(s.effectiveFrom)}
                          {s.effectiveFrom > today && (
                            <span className="ml-1.5">
                              <Badge tone="blue">Upcoming</Badge>
                            </span>
                          )}
                          {s.id === data.current?.id && (
                            <span className="ml-1.5">
                              <Badge tone="green">Current</Badge>
                            </span>
                          )}
                          {s.note && <p className="text-xs text-slate-500">{s.note}</p>}
                        </Td>
                        <Td className="text-right tabular-nums">{formatMoney(s.basic, data.currency)}</Td>
                        <Td className="text-right tabular-nums">{formatMoney(s.monthlyGross, data.currency)}</Td>
                        <Td>{humanize(s.filingStatus)}</Td>
                        <Td className="text-xs text-slate-500">
                          {s.changedBy}
                          <br />
                          {formatDateTime(s.changedAt)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
      <Modal open={changing} onClose={() => setChanging(false)} title={`Salary for ${employeeName}`} size="lg">
        {changing && data && (
          <SalaryForm
            employeeId={employeeId}
            currency={data.currency}
            base={data.current ?? data.history[0] ?? null}
            onClose={() => setChanging(false)}
            onDone={() => {
              setChanging(false);
              overview.reload();
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

function SalaryBreakdown({ salary, currency }: { salary: Salary; currency: string }) {
  const earnings = salary.items.filter((i) => i.kind === "EARNING");
  const deductions = salary.items.filter((i) => i.kind === "DEDUCTION");
  const money = (n: number) => formatMoney(n, currency);
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <dl className="space-y-1.5 text-sm">
        <Row label="Basic pay" value={money(salary.basic)} />
        {earnings.map((i) => (
          <Row
            key={i.componentId}
            label={i.name + (i.calculation === "PERCENT_OF_BASIC" ? ` (${Number(i.value)}% of basic)` : "")}
            value={money(i.monthlyAmount)}
          />
        ))}
        <div className="border-t border-slate-200 pt-1.5">
          <Row label="Monthly gross" value={money(salary.monthlyGross)} strong />
        </div>
      </dl>
      <dl className="space-y-1.5 text-sm">
        <Row label="In force since" value={formatDate(salary.effectiveFrom)} />
        <Row label="Tax status" value={humanize(salary.filingStatus)} />
        {deductions.map((i) => (
          <Row
            key={i.componentId}
            label={i.name + (i.calculation === "PERCENT_OF_BASIC" ? ` (${Number(i.value)}% of basic)` : "")}
            value={`− ${money(i.monthlyAmount)}`}
          />
        ))}
        <p className="pt-1 text-xs text-slate-500">Contributions (e.g. SSF) and tax are added when payroll runs.</p>
      </dl>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-semibold text-slate-900" : "text-slate-500"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-slate-900" : "text-slate-900"}`}>{value}</dd>
    </div>
  );
}

function SalaryForm({
  employeeId,
  currency,
  base,
  onClose,
  onDone,
}: {
  employeeId: string;
  currency: string;
  base: Salary | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const components = useApi<PayComponent[]>("/payroll/components");
  const [effectiveFrom, setEffectiveFrom] = useState(base ? todayIso() : todayIso().slice(0, 8) + "01");
  const [basic, setBasic] = useState(base ? String(base.basic) : "");
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(base?.filingStatus ?? "SINGLE");
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries((base?.items ?? []).map((i) => [i.componentId, String(i.value)])),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const items = Object.entries(values)
      .filter(([, v]) => v.trim() !== "" && Number(v) > 0)
      .map(([componentId, v]) => ({ componentId, value: Number(v) }));
    try {
      await api(`/employees/${employeeId}/salary`, {
        body: { effectiveFrom, basic: Number(basic), filingStatus, items, note: note.trim() || null },
      });
      toast("Salary saved");
      onDone();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <FormError error={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Effective from" error={fe.effectiveFrom} hint="Saving the same date again replaces it" required>
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
        </Field>
        <Field label={`Monthly basic (${currency})`} error={fe.basic} required>
          <Input type="number" min="0" step="0.01" value={basic} onChange={(e) => setBasic(e.target.value)} required />
        </Field>
        <Field label="Tax status" hint="Picks the tax bands if married bands are on">
          <Select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
          </Select>
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Allowances and deductions</p>
        {!components.data ? (
          <Loading />
        ) : components.data.length === 0 ? (
          <p className="text-sm text-slate-500">
            None set up yet. Add them in{" "}
            <Link href="/payroll/settings" className="font-medium text-indigo-600">
              Payroll settings
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {components.data.map((c) => (
              <Field
                key={c.id}
                label={`${c.name}${c.kind === "DEDUCTION" ? " (deduction)" : ""}`}
                hint={c.calculation === "PERCENT_OF_BASIC" ? "% of basic. Leave empty if not paid" : `${currency} per month. Leave empty if not paid`}
              >
                <Input
                  type="number"
                  min="0"
                  max={c.calculation === "PERCENT_OF_BASIC" ? 100 : undefined}
                  step="0.01"
                  value={values[c.id] ?? ""}
                  onChange={(e) => setValues({ ...values, [c.id]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        )}
      </div>

      <Field label="Note" hint="Optional, e.g. “Annual raise”">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save salary
        </Button>
      </div>
    </form>
  );
}
