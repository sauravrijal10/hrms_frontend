"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { humanize } from "@/lib/format";
import type {
  Calculation,
  ComponentKind,
  Contribution,
  ContributionBase,
  PayComponent,
  PayrollSettings,
  TaxSlabInput,
} from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { useToast } from "@/components/session";
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
  Loading,
  Modal,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";

export default function PayrollSettingsPage() {
  return (
    <HrOnly>
      <Link href="/payroll" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Payroll
      </Link>
      <PageHeader
        title="Payroll settings"
        description="Your company's own pay rules. Changes apply to payroll you calculate or recalculate from now on; finalized payslips never change."
      />
      <div className="space-y-6">
        <TaxSettingsCard />
        <ComponentsCard />
        <ContributionsCard />
      </div>
    </HrOnly>
  );
}

// ---------------------------------------------------------------- currency & tax

type SlabRow = { upTo: string; rate: string };
const toRows = (slabs: TaxSlabInput[]): SlabRow[] =>
  slabs.length ? slabs.map((s) => ({ upTo: s.upTo === null ? "" : String(s.upTo), rate: String(s.rate) })) : [];
const toSlabs = (rows: SlabRow[]): TaxSlabInput[] =>
  rows.map((r) => ({ upTo: r.upTo.trim() === "" ? null : Number(r.upTo), rate: Number(r.rate) }));

/** The API needs every band but the last to have a limit, and the last to be open-ended. */
function slabProblem(label: string, rows: SlabRow[]): string | null {
  const last = rows[rows.length - 1];
  if (last && last.upTo.trim() !== "") {
    return `${label}: the last band covers all income above the previous band, so leave its "Up to" empty. To tax income above ${Number(last.upTo).toLocaleString()} at another rate, add one more band.`;
  }
  const missing = rows.slice(0, -1).findIndex((r) => r.upTo.trim() === "");
  if (missing >= 0) return `${label}: band ${missing + 1} needs an "Up to" amount. Only the last band can be left open.`;
  return null;
}

function TaxSettingsCard() {
  const settings = useApi<PayrollSettings>("/payroll/settings");
  return (
    <Card
      title="Currency and income tax"
      description="Tax is worked out on yearly income (monthly taxable pay × 12) using your bands, then divided by 12."
    >
      {settings.data ? <TaxSettingsForm key={JSON.stringify(settings.data)} settings={settings.data} onSaved={settings.reload} /> : <Loading />}
    </Card>
  );
}

function TaxSettingsForm({ settings, onSaved }: { settings: PayrollSettings; onSaved: () => void }) {
  const toast = useToast();
  const [currency, setCurrency] = useState(settings.currency);
  const [married, setMarried] = useState(settings.marriedSlabsEnabled);
  const [single, setSingle] = useState<SlabRow[]>(toRows(settings.singleSlabs));
  const [marriedRows, setMarriedRows] = useState<SlabRow[]>(toRows(settings.marriedSlabs));
  const [error, setError] = useState<ApiError | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const issue = slabProblem(married ? "Single bands" : "Tax bands", single) ?? (married ? slabProblem("Married bands", marriedRows) : null);
    setProblem(issue);
    if (issue) return;
    setSaving(true);
    setError(null);
    try {
      await api("/payroll/settings", {
        method: "PUT",
        body: {
          currency: currency.trim().toUpperCase(),
          marriedSlabsEnabled: married,
          singleSlabs: toSlabs(single),
          marriedSlabs: married ? toSlabs(marriedRows) : [],
        },
      });
      toast("Payroll settings saved");
      onSaved();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <FormError error={error} />
      {problem && <Alert>{problem}</Alert>}
      <Field label="Currency" hint="3-letter code shown on payslips, e.g. NPR, INR, USD" className="max-w-40" error={error?.fieldErrors.currency}>
        <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} required />
      </Field>
      <SlabEditor
        title={married ? "Tax bands: single" : "Tax bands"}
        rows={single}
        onChange={setSingle}
        currency={currency || "—"}
      />
      <div>
        <Checkbox
          label="Use separate tax bands for married employees"
          checked={married}
          onChange={(e) => {
            setMarried(e.target.checked);
            if (e.target.checked && marriedRows.length === 0) setMarriedRows(single.map((r) => ({ ...r })));
          }}
        />
        <p className="mt-1 ml-6 text-xs text-slate-500">Each employee&apos;s salary records whether they are taxed as single or married.</p>
      </div>
      {married && <SlabEditor title="Tax bands: married" rows={marriedRows} onChange={setMarriedRows} currency={currency || "—"} />}
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Save currency and tax
        </Button>
      </div>
    </form>
  );
}

/**
 * Rows of "up to X → rate %". Every row has an "Up to" field; the last one is left empty to mean
 * "and above". No rows = no income tax.
 */
function SlabEditor({
  title,
  rows,
  onChange,
  currency,
}: {
  title: string;
  rows: SlabRow[];
  onChange: (rows: SlabRow[]) => void;
  currency: string;
}) {
  const update = (i: number, patch: Partial<SlabRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const lower = (i: number) => (i === 0 ? "0" : rows[i - 1].upTo || "…");

  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mb-2 text-xs text-slate-500">
        Enter each band&apos;s upper limit of yearly income and its rate. Leave the last band&apos;s &ldquo;Up to&rdquo; empty:
        it covers all income above the band before it.
      </p>
      {rows.length === 0 ? (
        <p className="mb-2 text-sm text-slate-500">No bands: no income tax is deducted.</p>
      ) : (
        <div className="mb-2 overflow-x-auto rounded-lg ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Yearly income from ({currency})</th>
                <th className="px-3 py-2 text-left font-medium">Up to ({currency})</th>
                <th className="px-3 py-2 text-left font-medium">Rate %</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const last = i === rows.length - 1;
                return (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-500 tabular-nums">{Number(lower(i)) ? Number(lower(i)).toLocaleString() : lower(i)}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={r.upTo}
                        onChange={(e) => update(i, { upTo: e.target.value })}
                        required={!last}
                        placeholder={last ? "No limit (and above)" : "e.g. 500000"}
                        aria-label={`Band ${i + 1} up to`}
                        className="max-w-48"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" min="0" max="100" step="0.01" value={r.rate} onChange={(e) => update(i, { rate: e.target.value })} required className="max-w-24" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove band">
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Button
        size="sm"
        variant="secondary"
        // The new row becomes the open-ended top band; the previous top band now needs an "up to".
        onClick={() => onChange([...rows, { upTo: "", rate: "" }])}
        aria-label="Add tax band"
      >
        Add band
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- pay components

function ComponentsCard() {
  const components = useApi<PayComponent[]>("/payroll/components", { includeInactive: true });
  const [editing, setEditing] = useState<{ component?: PayComponent } | null>(null);
  return (
    <Card
      title="Allowances and deductions"
      description="Building blocks for salaries. Amounts are set per employee on their page."
      actions={<Button size="sm" onClick={() => setEditing({})}>Add</Button>}
      bodyClassName="pb-0"
    >
      <DataState
        data={components.data}
        error={components.error}
        empty={<EmptyState title="None yet">For example a housing or transport allowance, or a loan repayment.</EmptyState>}
      >
        {(data) => (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Type</Th>
                <Th>Amount</Th>
                <Th>Tax</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c) => (
                <tr key={c.id} className={c.active ? undefined : "text-slate-400"}>
                  <Td className="font-medium text-slate-900">{c.name}</Td>
                  <Td className="font-mono text-xs">{c.code}</Td>
                  <Td>{c.kind === "EARNING" ? <Badge tone="green">Earning</Badge> : <Badge tone="red">Deduction</Badge>}</Td>
                  <Td>{c.calculation === "FIXED" ? "Fixed monthly amount" : "% of basic"}</Td>
                  <Td>{c.kind === "EARNING" ? (c.taxable ? "Taxable" : "Non-taxable") : "After tax"}</Td>
                  <Td>{c.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ component: c })}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataState>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.component ? "Edit allowance or deduction" : "Add allowance or deduction"}
      >
        {editing && (
          <ComponentForm
            key={editing.component?.id ?? "new"}
            component={editing.component}
            onClose={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              components.reload();
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

function ComponentForm({ component, onClose, onDone }: { component?: PayComponent; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    code: component?.code ?? "",
    name: component?.name ?? "",
    kind: component?.kind ?? ("EARNING" as ComponentKind),
    calculation: component?.calculation ?? ("FIXED" as Calculation),
    taxable: component?.taxable ?? true,
    active: component?.active ?? true,
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() };
    try {
      if (component) await api(`/payroll/components/${component.id}`, { method: "PUT", body });
      else await api("/payroll/components", { body });
      toast(component ? "Saved" : "Added");
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
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="Code" error={fe.code} required>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!component} maxLength={20} placeholder="HOUSING" required />
        </Field>
        <Field label="Name" error={fe.name} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="Housing allowance" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" hint={component ? "Can't be changed" : undefined}>
          <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ComponentKind })} disabled={!!component}>
            <option value="EARNING">Earning (allowance)</option>
            <option value="DEDUCTION">Deduction</option>
          </Select>
        </Field>
        <Field label="Amount is">
          <Select value={form.calculation} onChange={(e) => setForm({ ...form, calculation: e.target.value as Calculation })}>
            <option value="FIXED">A fixed monthly amount</option>
            <option value="PERCENT_OF_BASIC">A percentage of basic pay</option>
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        {form.kind === "EARNING" && (
          <Checkbox label="Taxable" checked={form.taxable} onChange={(e) => setForm({ ...form, taxable: e.target.checked })} />
        )}
        <Checkbox label="Active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
      </div>
      <p className="text-xs text-slate-500">
        {form.kind === "EARNING"
          ? "Allowances are paid for the days paid in the month, like basic pay."
          : "Deductions are the same every month (not reduced for unpaid days) and are taken after tax."}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- contributions

function ContributionsCard() {
  const contributions = useApi<Contribution[]>("/payroll/contributions");
  const [editing, setEditing] = useState<{ contribution?: Contribution } | null>(null);
  return (
    <Card
      title="Contributions"
      description="Percentage schemes such as SSF or a provident fund. They apply to everyone on payroll."
      actions={<Button size="sm" onClick={() => setEditing({})}>Add</Button>}
      bodyClassName="pb-0"
    >
      <DataState
        data={contributions.data}
        error={contributions.error}
        empty={<EmptyState title="None yet">For example SSF: 11% from the employee and 20% from the employer, on basic pay.</EmptyState>}
      >
        {(data) => (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Employee</Th>
                <Th>Employer</Th>
                <Th>Of</Th>
                <Th>Tax</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c) => (
                <tr key={c.id} className={c.active ? undefined : "text-slate-400"}>
                  <Td>
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className="font-mono text-xs text-slate-500">{c.code}</p>
                  </Td>
                  <Td>{Number(c.employeeRate)}%</Td>
                  <Td>{Number(c.employerRate)}%</Td>
                  <Td>{c.base === "BASIC" ? "Basic pay" : "Gross pay"}</Td>
                  <Td>{c.reducesTaxableIncome ? "Reduces taxable income" : "—"}</Td>
                  <Td>{c.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ contribution: c })}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataState>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.contribution ? "Edit contribution" : "Add contribution"}>
        {editing && (
          <ContributionForm
            key={editing.contribution?.id ?? "new"}
            contribution={editing.contribution}
            onClose={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              contributions.reload();
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

function ContributionForm({
  contribution,
  onClose,
  onDone,
}: {
  contribution?: Contribution;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    code: contribution?.code ?? "",
    name: contribution?.name ?? "",
    employeeRate: contribution ? String(contribution.employeeRate) : "",
    employerRate: contribution ? String(contribution.employerRate) : "",
    base: contribution?.base ?? ("BASIC" as ContributionBase),
    reducesTaxableIncome: contribution?.reducesTaxableIncome ?? true,
    active: contribution?.active ?? true,
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      employeeRate: Number(form.employeeRate),
      employerRate: Number(form.employerRate),
    };
    try {
      if (contribution) await api(`/payroll/contributions/${contribution.id}`, { method: "PUT", body });
      else await api("/payroll/contributions", { body });
      toast(contribution ? "Saved" : "Added");
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
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="Code" error={fe.code} required>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!contribution} maxLength={20} placeholder="SSF" required />
        </Field>
        <Field label="Name" error={fe.name} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="Social Security Fund" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Employee %" error={fe.employeeRate} hint="Deducted from pay" required>
          <Input type="number" min="0" max="100" step="0.01" value={form.employeeRate} onChange={(e) => setForm({ ...form, employeeRate: e.target.value })} required />
        </Field>
        <Field label="Employer %" error={fe.employerRate} hint="Company pays on top" required>
          <Input type="number" min="0" max="100" step="0.01" value={form.employerRate} onChange={(e) => setForm({ ...form, employerRate: e.target.value })} required />
        </Field>
        <Field label="Percentage of">
          <Select value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value as ContributionBase })}>
            <option value="BASIC">{humanize("BASIC")} pay</option>
            <option value="GROSS">{humanize("GROSS")} pay</option>
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox
          label="Employee share reduces taxable income"
          checked={form.reducesTaxableIncome}
          onChange={(e) => setForm({ ...form, reducesTaxableIncome: e.target.checked })}
        />
        <Checkbox label="Active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
