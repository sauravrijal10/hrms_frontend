"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatDate, humanize, todayIso } from "@/lib/format";
import type { Asset, AssetAssignment, AssetCondition, AssetDetail, AssetStatus, Employee, EmployeeAssets, Page } from "@/lib/types";
import { useToast } from "./session";
import { Alert, Badge, Button, Card, Field, FormError, Input, Loading, Modal, Select, Textarea } from "./ui";

export const CONDITIONS: AssetCondition[] = ["NEW", "GOOD", "FAIR", "DAMAGED"];

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const tone = { AVAILABLE: "green", ASSIGNED: "indigo", IN_REPAIR: "yellow", RETIRED: "gray", LOST: "red" } as const;
  return <Badge tone={tone[status]}>{status === "IN_REPAIR" ? "In repair" : humanize(status)}</Badge>;
}

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  return <Badge tone={condition === "DAMAGED" ? "red" : condition === "FAIR" ? "yellow" : "gray"}>{humanize(condition)}</Badge>;
}

// ---------------------------------------------------------------- add / edit

export function AssetForm({ asset, onClose, onDone }: { asset?: Asset; onClose: () => void; onDone: (d: AssetDetail) => void }) {
  const toast = useToast();
  const categories = useApi<string[]>("/assets/categories");
  const [form, setForm] = useState({
    assetTag: asset?.assetTag ?? "",
    name: asset?.name ?? "",
    category: asset?.category ?? "",
    serialNumber: asset?.serialNumber ?? "",
    description: asset?.description ?? "",
    purchaseDate: asset?.purchaseDate ?? "",
    purchaseCost: asset?.purchaseCost != null ? String(asset.purchaseCost) : "",
    condition: asset?.condition ?? ("GOOD" as AssetCondition),
    status: asset?.status ?? ("AVAILABLE" as AssetStatus),
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      ...form,
      assetTag: form.assetTag.trim().toUpperCase(),
      purchaseDate: form.purchaseDate || null,
      purchaseCost: form.purchaseCost === "" ? null : Number(form.purchaseCost),
      status: form.status === "ASSIGNED" ? null : form.status,
    };
    try {
      const d = asset
        ? await api<AssetDetail>(`/assets/${asset.id}`, { method: "PUT", body })
        : await api<AssetDetail>("/assets", { body });
      toast(asset ? "Asset updated" : `${d.asset.assetTag} added`);
      onDone(d);
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <FormError error={error} />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Asset tag" error={fe.assetTag} hint="Your label on the item" required>
          <Input value={form.assetTag} onChange={set("assetTag")} maxLength={40} placeholder="LAP-0012" required />
        </Field>
        <Field label="Name" error={fe.name} required>
          <Input value={form.name} onChange={set("name")} maxLength={120} placeholder="MacBook Air 13 (M3)" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" error={fe.category} hint="Pick one or type a new one" required>
          <Input value={form.category} onChange={set("category")} list="asset-categories" maxLength={60} placeholder="Laptop" required />
          <datalist id="asset-categories">
            {Array.from(new Set([...(categories.data ?? []), "Laptop", "Phone", "Monitor", "ID card", "SIM card", "Vehicle"])).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Serial number" error={fe.serialNumber}>
          <Input value={form.serialNumber} onChange={set("serialNumber")} maxLength={100} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Purchase date" error={fe.purchaseDate}>
          <Input type="date" value={form.purchaseDate} onChange={set("purchaseDate")} />
        </Field>
        <Field label="Purchase cost" error={fe.purchaseCost}>
          <Input type="number" min="0" step="0.01" value={form.purchaseCost} onChange={set("purchaseCost")} />
        </Field>
        <Field label="Condition" error={fe.condition}>
          <Select value={form.condition} onChange={set("condition")}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {asset && asset.status !== "ASSIGNED" && (
        <Field label="Status" hint="Take it out of circulation while it's being repaired, or after it's retired or lost">
          <Select value={form.status} onChange={set("status")}>
            <option value="AVAILABLE">Available</option>
            <option value="IN_REPAIR">In repair</option>
            <option value="RETIRED">Retired</option>
            <option value="LOST">Lost</option>
          </Select>
        </Field>
      )}
      <Field label="Notes" error={fe.description}>
        <Textarea value={form.description} onChange={set("description")} maxLength={1000} rows={2} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {asset ? "Save" : "Add asset"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- assign

/**
 * Hand an asset to an employee. Pass `asset` to choose the employee, or `employee` to choose
 * from the available assets.
 */
export function AssignForm({
  asset,
  employee,
  onClose,
  onDone,
}: {
  asset?: Asset;
  employee?: { id: string; fullName: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const people = useApi<Page<Employee>>(employee ? null : "/employees", { size: 500, sort: "firstName" });
  const assets = useApi<Asset[]>(asset ? null : "/assets");
  const [employeeId, setEmployeeId] = useState(employee?.id ?? "");
  const [assetId, setAssetId] = useState(asset?.id ?? "");
  const [assignedOn, setAssignedOn] = useState(todayIso());
  const [condition, setCondition] = useState<AssetCondition>(asset?.condition ?? "GOOD");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const active = (people.data?.content ?? []).filter((p) => p.status === "ACTIVE" && !(p.exitDate && p.exitDate < todayIso()));
  const available = (assets.data ?? []).filter((a) => a.status === "AVAILABLE");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const d = await api<AssetDetail>(`/assets/${assetId}/assign`, {
        body: { employeeId, assignedOn, condition, expectedReturn: expectedReturn || null, notes: notes.trim() || null },
      });
      toast(`${d.asset.assetTag} given to ${d.asset.holder?.employeeName}`);
      onDone();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <FormError error={error} />
      {employee ? (
        <Field label="Asset" required>
          {!assets.data ? (
            <Loading />
          ) : available.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing is available.{" "}
              <Link href="/assets" className="font-medium text-indigo-600">
                Add assets
              </Link>{" "}
              first.
            </p>
          ) : (
            <Select
              value={assetId}
              onChange={(e) => {
                setAssetId(e.target.value);
                const a = available.find((x) => x.id === e.target.value);
                if (a) setCondition(a.condition);
              }}
              required
            >
              <option value="">Choose an item…</option>
              {available.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} · {a.name} ({a.category})
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : (
        <Field label="Give to" required>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">Choose an employee…</option>
            {active.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.employeeCode})
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Handed over on" required>
          <Input type="date" value={assignedOn} max={todayIso()} onChange={(e) => setAssignedOn(e.target.value)} required />
        </Field>
        <Field label="Condition">
          <Select value={condition} onChange={(e) => setCondition(e.target.value as AssetCondition)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Return by" hint="Optional, e.g. a loaner">
          <Input type="date" value={expectedReturn} min={assignedOn} onChange={(e) => setExpectedReturn(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes" hint="Accessories handed over, scratches already there…">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={!assetId || !employeeId}>
          Assign
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- return

export function ReturnForm({
  assignment,
  onClose,
  onDone,
}: {
  assignment: Pick<AssetAssignment, "assetId" | "assetTag" | "assetName" | "employeeName" | "assignedOn">;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [returnedOn, setReturnedOn] = useState(todayIso());
  const [condition, setCondition] = useState<AssetCondition>("GOOD");
  const [outcome, setOutcome] = useState<AssetStatus>("AVAILABLE");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/assets/${assignment.assetId}/return`, {
        body: { returnedOn, condition, outcome, notes: notes.trim() || null },
      });
      toast(outcome === "LOST" ? `${assignment.assetTag} marked as lost` : `${assignment.assetTag} returned`);
      onDone();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <FormError error={error} />
      <p className="text-sm text-slate-600">
        {assignment.assetTag} · {assignment.assetName}, with {assignment.employeeName} since {formatDate(assignment.assignedOn)}.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Returned on" required>
          <Input type="date" value={returnedOn} min={assignment.assignedOn} max={todayIso()} onChange={(e) => setReturnedOn(e.target.value)} required />
        </Field>
        <Field label="Condition">
          <Select
            value={condition}
            onChange={(e) => {
              const c = e.target.value as AssetCondition;
              setCondition(c);
              if (c === "DAMAGED" && outcome === "AVAILABLE") setOutcome("IN_REPAIR");
            }}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Then">
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value as AssetStatus)}>
            <option value="AVAILABLE">Back in stock</option>
            <option value="IN_REPAIR">Send for repair</option>
            <option value="RETIRED">Retire it</option>
            <option value="LOST">Not returned: lost</option>
          </Select>
        </Field>
      </div>
      <Field label="Notes" hint="Damage, missing accessories…">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {outcome === "LOST" ? "Mark as lost" : "Record return"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- per employee

/**
 * The company items an employee has (and had). HR can assign and record returns; the employee
 * and their manager can look.
 */
export function EmployeeAssetsCard({
  employee,
  canManage,
  self = false,
}: {
  employee: { id: string; fullName: string };
  canManage: boolean;
  self?: boolean;
}) {
  const path = self ? "/employees/me/assets" : `/employees/${employee.id}/assets`;
  const data = useApi<EmployeeAssets>(path);
  const [assigning, setAssigning] = useState(false);
  const [returning, setReturning] = useState<AssetAssignment | null>(null);
  const [showPast, setShowPast] = useState(false);
  const d = data.data;
  const leaving = !!d?.exitDate && (d.current.length ?? 0) > 0;

  return (
    <Card
      title={self ? "Company items with you" : "Company items"}
      description={self ? "Things the company has given you. Hand them back to HR when you leave." : undefined}
      actions={canManage && <Button size="sm" onClick={() => setAssigning(true)}>Assign item</Button>}
    >
      {!d ? (
        data.error ? <Alert>{data.error.message}</Alert> : <Loading />
      ) : (
        <div className="space-y-4">
          {leaving && (
            <Alert>
              {self ? "Your" : `${employee.fullName.split(" ")[0]}'s`} last working day is {formatDate(d.exitDate)}.{" "}
              {d.current.length === 1 ? "This item needs" : `These ${d.current.length} items need`} to be returned before then.
            </Alert>
          )}
          {d.current.length === 0 ? (
            <p className="text-sm text-slate-500">{self ? "You don't have any company items." : "No company items."}</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
              {d.current.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {canManage ? (
                        <Link href={`/assets/${x.assetId}`} className="hover:text-indigo-600">
                          {x.assetName}
                        </Link>
                      ) : (
                        x.assetName
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {x.category} · {x.assetTag}
                      {x.serialNumber && ` · serial ${x.serialNumber}`} · since {formatDate(x.assignedOn)}
                      {x.expectedReturn && ` · return by ${formatDate(x.expectedReturn)}`}
                    </p>
                    {x.issueNotes && <p className="text-xs text-slate-500">“{x.issueNotes}”</p>}
                  </div>
                  {canManage && (
                    <Button size="sm" variant="secondary" onClick={() => setReturning(x)}>
                      Record return
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {d.past.length > 0 && (
            <div>
              <button type="button" className="text-xs font-medium text-slate-500 hover:text-slate-800" onClick={() => setShowPast((v) => !v)}>
                {showPast ? "Hide" : "Show"} {d.past.length} returned item{d.past.length === 1 ? "" : "s"}
              </button>
              {showPast && (
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  {d.past.map((x) => (
                    <li key={x.id}>
                      {x.assetTag} · {x.assetName}: {formatDate(x.assignedOn)} – {formatDate(x.returnedOn)}
                      {x.returnCondition && ` (${humanize(x.returnCondition).toLowerCase()})`}
                      {x.returnNotes && `, “${x.returnNotes}”`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      <Modal open={assigning} onClose={() => setAssigning(false)} title={`Assign an item to ${employee.fullName}`} size="lg">
        {assigning && (
          <AssignForm
            employee={employee}
            onClose={() => setAssigning(false)}
            onDone={() => {
              setAssigning(false);
              data.reload();
            }}
          />
        )}
      </Modal>
      <Modal open={returning !== null} onClose={() => setReturning(null)} title="Record a return" size="lg">
        {returning && (
          <ReturnForm
            assignment={returning}
            onClose={() => setReturning(null)}
            onDone={() => {
              setReturning(null);
              data.reload();
            }}
          />
        )}
      </Modal>
    </Card>
  );
}
