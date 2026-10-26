"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import type { AssetDetail } from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { AssetForm, AssetStatusBadge, AssignForm, ConditionBadge, ReturnForm } from "@/components/assets";
import { Alert, Button, Card, DataState, DescriptionList, Modal, PageHeader, Table, Td, Th } from "@/components/ui";

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useApi<AssetDetail>(`/assets/${id}`);
  const [dialog, setDialog] = useState<"edit" | "assign" | "return" | null>(null);
  const done = () => {
    setDialog(null);
    detail.reload();
  };

  return (
    <HrOnly>
      <Link href="/assets" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Assets
      </Link>
      <DataState data={detail.data} error={detail.error}>
        {({ asset: a, history }) => {
          const open = history.find((h) => !h.returnedOn);
          return (
            <>
              <PageHeader
                title={a.name}
                description={`${a.assetTag} · ${a.category}`}
                actions={
                  <>
                    <AssetStatusBadge status={a.status} />
                    <Button variant="secondary" onClick={() => setDialog("edit")}>
                      Edit
                    </Button>
                    {a.status === "AVAILABLE" && <Button onClick={() => setDialog("assign")}>Assign</Button>}
                    {a.status === "ASSIGNED" && <Button onClick={() => setDialog("return")}>Record return</Button>}
                  </>
                }
              />
              <div className="space-y-6">
                {a.holder?.leaving && (
                  <Alert>
                    {a.holder.employeeName} is leaving
                    {a.holder.exitDate ? ` on ${formatDate(a.holder.exitDate)}` : ""}. Collect this item before then.
                  </Alert>
                )}
                <Card>
                  <DescriptionList
                    items={[
                      [
                        "With",
                        a.holder ? (
                          <Link key="h" href={`/employees/${a.holder.employeeId}`} className="font-medium text-indigo-600">
                            {a.holder.employeeName} (since {formatDate(a.holder.assignedOn)})
                          </Link>
                        ) : (
                          "Nobody"
                        ),
                      ],
                      ["Condition", <ConditionBadge key="c" condition={a.condition} />],
                      ["Serial number", a.serialNumber],
                      ["Purchased", [a.purchaseDate && formatDate(a.purchaseDate), a.purchaseCost != null && Number(a.purchaseCost).toLocaleString()].filter(Boolean).join(" · ")],
                      ["Notes", a.description],
                    ]}
                  />
                </Card>
                <Card title="History" bodyClassName="pb-0">
                  {history.length === 0 ? (
                    <p className="pb-5 text-sm text-slate-500">Never assigned yet.</p>
                  ) : (
                    <Table>
                      <thead className="bg-slate-50">
                        <tr>
                          <Th>Employee</Th>
                          <Th>Handed over</Th>
                          <Th>Returned</Th>
                          <Th>Notes</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map((h) => (
                          <tr key={h.id}>
                            <Td className="font-medium text-slate-900">
                              <Link href={`/employees/${h.employeeId}`} className="hover:text-indigo-600">
                                {h.employeeName}
                              </Link>
                            </Td>
                            <Td className="text-xs">
                              {formatDate(h.assignedOn)} · {humanize(h.issueCondition)}
                              <p className="text-slate-500">by {h.assignedBy}</p>
                            </Td>
                            <Td className="text-xs">
                              {h.returnedOn ? (
                                <>
                                  {formatDate(h.returnedOn)} · {h.returnCondition && humanize(h.returnCondition)}
                                  <p className="text-slate-500">received by {h.receivedBy}</p>
                                </>
                              ) : (
                                <span className="font-medium text-indigo-600">Still with them</span>
                              )}
                            </Td>
                            <Td className="max-w-xs text-xs text-slate-500">
                              {h.issueNotes && <p>Out: {h.issueNotes}</p>}
                              {h.returnNotes && <p>Back: {h.returnNotes}</p>}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card>
              </div>

              <Modal open={dialog === "edit"} onClose={() => setDialog(null)} title={`Edit ${a.assetTag}`} size="lg">
                {dialog === "edit" && <AssetForm asset={a} onClose={() => setDialog(null)} onDone={done} />}
              </Modal>
              <Modal open={dialog === "assign"} onClose={() => setDialog(null)} title={`Assign ${a.assetTag}`} size="lg">
                {dialog === "assign" && <AssignForm asset={a} onClose={() => setDialog(null)} onDone={done} />}
              </Modal>
              <Modal open={dialog === "return"} onClose={() => setDialog(null)} title="Record a return" size="lg">
                {dialog === "return" && open && <ReturnForm assignment={open} onClose={() => setDialog(null)} onDone={done} />}
              </Modal>
            </>
          );
        }}
      </DataState>
    </HrOnly>
  );
}
