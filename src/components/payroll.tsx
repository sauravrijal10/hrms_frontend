"use client";

import type { ReactNode } from "react";
import { formatDays, formatMoney, humanize, monthLabel } from "@/lib/format";
import type { LineCategory, PayslipDetail, PayslipLine, RunStatus } from "@/lib/types";
import { Badge, Button, cx } from "./ui";

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const tone = status === "PAID" ? "green" : status === "FINALIZED" ? "indigo" : status === "PENDING_APPROVAL" ? "blue" : "yellow";
  const label = { DRAFT: "Draft", PENDING_APPROVAL: "Awaiting approval", FINALIZED: "Finalized", PAID: "Paid" }[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Only the last 4 digits of a bank account, like the PDF. */
function maskAccount(account: string | null): string | null {
  if (!account) return null;
  return account.length <= 4 ? account : `•••• ${account.slice(-4)}`;
}

const DEDUCTION_ORDER: LineCategory[] = ["EMPLOYEE_CONTRIBUTION", "DEDUCTION", "TAX"];

/**
 * A payslip, laid out like the PDF. `onRemoveOneOff` shows a remove button on one-off lines
 * (HR, draft payroll only).
 */
export function PayslipView({
  payslip: p,
  onRemoveOneOff,
}: {
  payslip: PayslipDetail;
  onRemoveOneOff?: (line: PayslipLine) => void;
}) {
  const money = (n: number | null) => (n === null ? "" : formatMoney(n, p.currency).replace(`${p.currency} `, ""));
  const earnings = p.lines.filter((l) => l.category === "EARNING");
  const deductions = DEDUCTION_ORDER.flatMap((c) => p.lines.filter((l) => l.category === c));
  const employer = p.lines.filter((l) => l.category === "EMPLOYER_CONTRIBUTION");

  const name = (l: PayslipLine) => (
    <span className="flex flex-wrap items-center gap-1.5">
      {l.name}
      {l.oneOff && <Badge tone="blue">One-off</Badge>}
      {l.category === "EARNING" && !l.taxable && <span className="text-xs text-slate-400">non-taxable</span>}
      {l.oneOff && onRemoveOneOff && (
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-red-600" onClick={() => onRemoveOneOff(l)}>
          Remove
        </Button>
      )}
    </span>
  );

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{p.companyName}</p>
          <p className="text-slate-500">Payslip for {monthLabel(p.year, p.month)}</p>
        </div>
        {p.runStatus === "DRAFT" && <Badge tone="yellow">Draft · may still change</Badge>}
      </div>

      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <Info label="Employee" value={`${p.employeeName} (${p.employeeCode})`} />
        <Info label="Designation" value={p.designation} />
        <Info label="Department" value={p.departmentName} />
        <Info label="Bank" value={[p.bankName, maskAccount(p.bankAccountNumber)].filter(Boolean).join(" · ") || null} />
        <Info label="Tax status" value={humanize(p.filingStatus)} />
      </dl>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-4">
        <Stat label="Working days" value={formatDays(p.workingDays)} />
        <Stat label="Days employed" value={formatDays(p.employedDays)} />
        <Stat label="Unpaid leave" value={formatDays(p.unpaidLeaveDays)} highlight={Number(p.unpaidLeaveDays) > 0} />
        <Stat label="Days paid" value={formatDays(p.payableDays)} />
      </div>

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">Earnings</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-1.5 text-left font-medium">Item</th>
              <th className="py-1.5 text-right font-medium">Full month</th>
              <th className="py-1.5 text-right font-medium">This month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {earnings.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-2">{name(l)}</td>
                <td className="py-2 text-right text-slate-500 tabular-nums">{money(l.fullAmount)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <TotalRow label="Gross pay" value={money(p.gross)} span={2} />
          </tfoot>
        </table>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">Deductions</h3>
        <table className="w-full">
          <tbody className="divide-y divide-slate-100">
            {deductions.length === 0 && (
              <tr>
                <td className="py-2 text-slate-500">No deductions</td>
                <td />
              </tr>
            )}
            {deductions.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-2">{name(l)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <TotalRow label="Total deductions" value={money(p.totalDeductions)} span={1} />
          </tfoot>
        </table>
      </section>

      <div className="flex items-center justify-between rounded-lg bg-indigo-600 px-4 py-3 text-white">
        <span className="font-semibold">Net pay</span>
        <span className="text-lg font-semibold tabular-nums">{formatMoney(p.netPay, p.currency)}</span>
      </div>

      <div className="space-y-1 text-xs text-slate-500">
        {employer.length > 0 && (
          <p>
            Paid by your employer on top of your salary:{" "}
            {employer.map((l) => `${l.name} ${formatMoney(l.amount, p.currency)}`).join(", ")}.
          </p>
        )}
        <p>
          Taxable income this month: {formatMoney(p.taxableIncome, p.currency)}. Basic pay and allowances are paid for days
          paid out of working days.
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 sm:block">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cx("bg-white px-3 py-2", highlight && "bg-amber-50")}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cx("font-semibold text-slate-900", highlight && "text-amber-800")}>{value}</p>
    </div>
  );
}

function TotalRow({ label, value, span }: { label: string; value: string; span: number }) {
  return (
    <tr className="bg-slate-50 font-semibold text-slate-900">
      <td className="px-2 py-2" colSpan={span}>
        {label}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{value}</td>
    </tr>
  );
}
