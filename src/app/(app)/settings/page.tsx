"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, toApiError, type ApiError } from "@/lib/api";
import { humanize } from "@/lib/format";
import { useTimezones, withZone } from "@/lib/timezones";
import { DAYS_OF_WEEK, type AllocationResult, type DayOfWeek, type Tenant } from "@/lib/types";
import { EmailSettingsCard } from "@/components/EmailSettingsForm";
import { HrOnly } from "@/components/HrOnly";
import { useSession, useToast } from "@/components/session";
import { Alert, Button, Card, Checkbox, Field, FormError, Input, PageHeader, Select } from "@/components/ui";

export default function SettingsPage() {
  return (
    <HrOnly>
      <PageHeader title="Company settings" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CompanyForm />
          <EmailSettingsCard />
        </div>
        <AllocateCard />
      </div>
    </HrOnly>
  );
}

function CompanyForm() {
  const { tenant } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { zones } = useTimezones();
  const [name, setName] = useState(tenant.name);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [weekendDays, setWeekendDays] = useState<DayOfWeek[]>(tenant.weekendDays);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api<Tenant>("/tenant", { method: "PUT", body: { name: name.trim(), timezone, weekendDays } });
      toast("Company settings saved");
      router.refresh(); // re-runs the server layout so the sidebar shows the new name
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Company" description={`Company ID: ${tenant.slug} (employees use this to sign in)`}>
      <form className="space-y-5" onSubmit={submit}>
        <FormError error={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" error={fe.name} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} required />
          </Field>
          <Field label="Timezone" error={fe.timezone} hint="Decides what “today” means for leave rules">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {withZone(zones, timezone).map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Weekend days</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {DAYS_OF_WEEK.map((d) => (
              <Checkbox
                key={d}
                label={humanize(d)}
                checked={weekendDays.includes(d)}
                onChange={(e) =>
                  setWeekendDays((w) => (e.target.checked ? [...w, d] : w.filter((x) => x !== d)))
                }
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {fe.weekendDays ?? "Weekend days are not counted when working out leave days."}
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save settings
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AllocateCard() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [running, setRunning] = useState(false);

  async function allocate() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api<AllocationResult>("/leave-balances/allocate", { method: "POST", query: { year } }));
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card
      title="Allocate yearly balances"
      description="Run this at the start of each year. It creates balances for every active employee and carries forward unused days, up to each type's limit. Running it again is safe."
      className="self-start"
    >
      <div className="space-y-4">
        <FormError error={error} />
        {result && (
          <Alert kind="success">
            {result.balancesCreated === 0
              ? `All balances for ${result.year} already exist.`
              : `Created ${result.balancesCreated} balance${result.balancesCreated === 1 ? "" : "s"} for ${result.year}.`}
          </Alert>
        )}
        <div className="flex items-end gap-2">
          <Field label="Year" className="flex-1">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </Select>
          </Field>
          <Button onClick={allocate} loading={running}>
            Allocate
          </Button>
        </div>
      </div>
    </Card>
  );
}
