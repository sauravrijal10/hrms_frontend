"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toApiError, useApi } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { monthLabel } from "@/lib/format";
import type { PayslipDetail } from "@/lib/types";
import { PayslipView } from "@/components/payroll";
import { useSession, useToast } from "@/components/session";
import { Button, Card, DataState, PageHeader } from "@/components/ui";

export default function PayslipPage() {
  const { id } = useParams<{ id: string }>();
  const { isHr, user } = useSession();
  const toast = useToast();
  const payslip = useApi<PayslipDetail>(`/payslips/${id}`);
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      await downloadFile(`/payslips/${id}/pdf`, "payslip.pdf");
    } catch (e) {
      toast(toApiError(e).message, "error");
    } finally {
      setDownloading(false);
    }
  }

  const own = payslip.data?.employeeId === user.employeeId;
  return (
    <>
      <Link
        href={own || !isHr || !payslip.data ? "/payslips" : `/payroll/runs/${payslip.data.runId}`}
        className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← {own || !isHr ? "My payslips" : "Payroll"}
      </Link>
      <DataState data={payslip.data} error={payslip.error}>
        {(p) => (
          <>
            <PageHeader
              title={`Payslip · ${monthLabel(p.year, p.month)}`}
              description={own ? undefined : p.employeeName}
              actions={
                <Button variant="secondary" onClick={download} loading={downloading}>
                  Download PDF
                </Button>
              }
            />
            <Card className="max-w-3xl">
              <PayslipView payslip={p} />
            </Card>
          </>
        )}
      </DataState>
    </>
  );
}
