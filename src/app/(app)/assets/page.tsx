"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApi, type ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Asset, AssetsDueBack } from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { AssetForm, AssetStatusBadge, ConditionBadge } from "@/components/assets";
import { Badge, Button, Card, DataState, EmptyState, Input, Modal, PageHeader, Select, Table, Td, Th, cx } from "@/components/ui";

type Tab = "all" | "available" | "assigned" | "out" | "due";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "assigned", label: "With employees" },
  { id: "out", label: "Repair / retired / lost" },
  { id: "due", label: "Due back from leavers" },
];

export default function AssetsPage() {
  const router = useRouter();
  const assets = useApi<Asset[]>("/assets");
  const due = useApi<AssetsDueBack[]>("/assets/due-back");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const categories = useMemo(() => Array.from(new Set((assets.data ?? []).map((a) => a.category))).sort(), [assets.data]);
  const dueCount = (due.data ?? []).reduce((n, d) => n + d.items.length, 0);

  const filtered = (assets.data ?? []).filter((a) => {
    if (tab === "available" && a.status !== "AVAILABLE") return false;
    if (tab === "assigned" && a.status !== "ASSIGNED") return false;
    if (tab === "out" && !["IN_REPAIR", "RETIRED", "LOST"].includes(a.status)) return false;
    if (category && a.category !== category) return false;
    const text = `${a.assetTag} ${a.name} ${a.serialNumber ?? ""} ${a.holder?.employeeName ?? ""}`.toLowerCase();
    return !q.trim() || text.includes(q.trim().toLowerCase());
  });

  return (
    <HrOnly>
      <PageHeader
        title="Assets"
        description="Company items handed out to employees, and getting them back when people leave."
        actions={<Button onClick={() => setAdding(true)}>Add asset</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
            {t.id === "due" && dueCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">{dueCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "due" ? (
        <DueBackList data={due.data} error={due.error} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tag, name, serial or person…" className="max-w-xs" />
            <div className="w-48">
              <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
          <Card bodyClassName="pb-0">
            <DataState
              data={assets.data}
              error={assets.error}
              isEmpty={() => filtered.length === 0}
              empty={
                <EmptyState title={assets.data?.length ? "Nothing matches" : "No assets yet"}>
                  {assets.data?.length ? "Try another tab or search." : "Add the laptops, phones and cards you hand out."}
                </EmptyState>
              }
            >
              {() => (
                <Table>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Tag</Th>
                      <Th>Item</Th>
                      <Th>Category</Th>
                      <Th>Status</Th>
                      <Th>Condition</Th>
                      <Th>With</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((a) => (
                      <tr key={a.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/assets/${a.id}`)}>
                        <Td className="font-mono text-xs">{a.assetTag}</Td>
                        <Td>
                          <p className="font-medium text-slate-900">{a.name}</p>
                          {a.serialNumber && <p className="text-xs text-slate-500">Serial {a.serialNumber}</p>}
                        </Td>
                        <Td>{a.category}</Td>
                        <Td>
                          <AssetStatusBadge status={a.status} />
                        </Td>
                        <Td>
                          <ConditionBadge condition={a.condition} />
                        </Td>
                        <Td>
                          {a.holder ? (
                            <>
                              <Link
                                href={`/employees/${a.holder.employeeId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-slate-900 hover:text-indigo-600"
                              >
                                {a.holder.employeeName}
                              </Link>
                              <p className="text-xs text-slate-500">
                                since {formatDate(a.holder.assignedOn)}
                                {a.holder.leaving && (
                                  <span className="ml-1.5">
                                    <Badge tone="red">Leaving{a.holder.exitDate ? ` ${formatDate(a.holder.exitDate)}` : ""}</Badge>
                                  </span>
                                )}
                              </p>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </DataState>
          </Card>
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add asset" size="lg">
        {adding && (
          <AssetForm
            onClose={() => setAdding(false)}
            onDone={(d) => {
              setAdding(false);
              router.push(`/assets/${d.asset.id}`);
            }}
          />
        )}
      </Modal>
    </HrOnly>
  );
}

function DueBackList({ data, error }: { data?: AssetsDueBack[]; error?: ApiError }) {
  return (
    <Card bodyClassName="pb-0">
      <DataState
        data={data}
        error={error}
        empty={<EmptyState title="Nothing to collect">Nobody who is leaving has company items.</EmptyState>}
      >
        {(rows) => (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Employee</Th>
                <Th>Last working day</Th>
                <Th>Items to return</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.employeeId}>
                  <Td>
                    <Link href={`/employees/${d.employeeId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {d.employeeName}
                    </Link>
                    <p className="text-xs text-slate-500">{d.employeeCode}</p>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {d.exitDate ? formatDate(d.exitDate) : <Badge>{d.status === "TERMINATED" ? "Terminated" : "Inactive"}</Badge>}
                  </Td>
                  <Td>
                    <ul className="space-y-0.5">
                      {d.items.map((i) => (
                        <li key={i.id}>
                          <Link href={`/assets/${i.assetId}`} className="hover:text-indigo-600">
                            <span className="font-mono text-xs text-slate-500">{i.assetTag}</span> {i.assetName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataState>
    </Card>
  );
}
