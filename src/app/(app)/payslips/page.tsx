"use client";

import Link from "next/link";
import { useApi } from "@/lib/api";
import { formatMoney, monthLabel } from "@/lib/format";
import type { MyPayslip } from "@/lib/types";
import { RunStatusBadge } from "@/components/payroll";
import { Card, DataState, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default function MyPayslipsPage() {
  const payslips = useApi<MyPayslip[]>("/payslips/me");
  return (
    <>
      <PageHeader title="My payslips" description="Your monthly payslips, once HR has finalized the payroll." />
      <Card bodyClassName="pb-0">
        <DataState
          data={payslips.data}
          error={payslips.error}
          empty={<EmptyState title="No payslips yet">They appear here after each month&apos;s payroll is finalized.</EmptyState>}
        >
          {(data) => (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Month</Th>
                  <Th className="text-right">Gross</Th>
                  <Th className="text-right">Net pay</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-medium text-slate-900">{monthLabel(p.year, p.month)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(p.gross, p.currency)}</Td>
                    <Td className="text-right font-semibold text-slate-900 tabular-nums">{formatMoney(p.netPay, p.currency)}</Td>
                    <Td>
                      <RunStatusBadge status={p.runStatus} />
                    </Td>
                    <Td className="text-right">
                      <Link href={`/payslips/${p.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        View
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DataState>
      </Card>
    </>
  );
}
