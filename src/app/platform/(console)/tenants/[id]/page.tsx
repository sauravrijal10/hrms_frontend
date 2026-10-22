"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import { useTimezones, withZone } from "@/lib/timezones";
import { DAYS_OF_WEEK, type DayOfWeek, type TenantAdmin, type TenantSummary } from "@/lib/types";
import { useToast } from "@/components/session";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  DataState,
  DescriptionList,
  EmptyState,
  Field,
  FormError,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const tenant = useApi<TenantSummary>(`/platform/tenants/${id}`);

  return (
    <>
      <Link href="/platform" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Companies
      </Link>
      <DataState data={tenant.data} error={tenant.error}>
        {(t) => (
          <>
            <PageHeader
              title={t.name}
              description={
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono">{t.slug}</span>
                  {t.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}
                </span>
              }
            />
            {!t.active && (
              <div className="mb-6">
                <Alert>This company is suspended. Its users can&apos;t sign in until you reactivate it.</Alert>
              </div>
            )}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Admins tenant={t} onChanged={tenant.reload} />
                {/* key: reset the form after a save reloads the tenant */}
                <SettingsForm key={JSON.stringify(t)} tenant={t} onSaved={tenant.reload} />
              </div>
              <div className="space-y-6">
                <Card title="At a glance">
                  <DescriptionList
                    items={[
                      ["Active employees", String(t.activeEmployees)],
                      ["User accounts", String(t.users)],
                      ["Created", formatDate(t.createdAt)],
                      ["Sign-in company ID", <span key="s" className="font-mono">{t.slug}</span>],
                    ]}
                  />
                </Card>
                <SuspendCard tenant={t} onChanged={tenant.reload} />
              </div>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}

// ---------------------------------------------------------------- HR admins

function Admins({ tenant, onChanged }: { tenant: TenantSummary; onChanged: () => void }) {
  const toast = useToast();
  const admins = useApi<TenantAdmin[]>(`/platform/tenants/${tenant.id}/admins`);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<TenantAdmin | null>(null);
  const [toggleError, setToggleError] = useState<ApiError | null>(null);

  async function toggle(admin: TenantAdmin) {
    setToggleError(null);
    try {
      await api(`/platform/tenants/${tenant.id}/admins/${admin.userId}`, {
        method: "PATCH",
        body: { active: !admin.active },
      });
      toast(admin.active ? `${admin.fullName} can no longer sign in` : `${admin.fullName} reactivated`);
      admins.reload();
      onChanged();
    } catch (e) {
      setToggleError(toApiError(e));
    }
  }

  return (
    <Card
      title="HR admins"
      description="They manage this company's employees, leave and settings in the HR app."
      bodyClassName="pb-0"
      actions={
        <Button size="sm" variant="dark" onClick={() => setAdding(true)}>
          Add HR admin
        </Button>
      }
    >
      {toggleError && (
        <div className="mb-4">
          <FormError error={toggleError} />
        </div>
      )}
      <DataState data={admins.data} error={admins.error} empty={<EmptyState title="No HR admins" />}>
        {(data) => (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Added</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((a) => (
                <tr key={a.userId}>
                  <Td>
                    <p className="font-medium text-slate-900">{a.fullName}</p>
                    <p className="text-xs text-slate-500">{a.email}</p>
                  </Td>
                  <Td>{a.active ? <Badge tone="green">Active</Badge> : <Badge>Deactivated</Badge>}</Td>
                  <Td className="whitespace-nowrap">{formatDate(a.createdAt)}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setResetting(a)}>
                      Reset password
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(a)}>
                      {a.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataState>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add HR admin" description={tenant.name}>
        {adding && (
          <AddAdminForm
            tenantId={tenant.id}
            onClose={() => setAdding(false)}
            onDone={() => {
              setAdding(false);
              admins.reload();
              onChanged(); // refresh the user counts
            }}
          />
        )}
      </Modal>
      <Modal
        open={!!resetting}
        onClose={() => setResetting(null)}
        title="Reset password"
        description={resetting ? `${resetting.fullName} · ${resetting.email}` : undefined}
      >
        {resetting && (
          <ResetPasswordForm
            key={resetting.userId}
            tenantId={tenant.id}
            admin={resetting}
            onClose={() => setResetting(null)}
          />
        )}
      </Modal>
    </Card>
  );
}

function AddAdminForm({ tenantId, onClose, onDone }: { tenantId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const admin = await api<TenantAdmin>(`/platform/tenants/${tenantId}/admins`, { body: form });
      toast(`${admin.fullName} added as HR admin`);
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" error={fe.firstName} required>
          <Input value={form.firstName} onChange={set("firstName")} maxLength={80} required autoFocus />
        </Field>
        <Field label="Last name" error={fe.lastName} required>
          <Input value={form.lastName} onChange={set("lastName")} maxLength={80} required />
        </Field>
      </div>
      <Field label="Email" error={fe.email} required>
        <Input type="email" value={form.email} onChange={set("email")} maxLength={150} required />
      </Field>
      <Field label="Initial password" error={fe.password} hint="At least 8 characters. It's emailed to them, and they must choose their own when they first sign in." required>
        <Input
          type="password"
          value={form.password}
          onChange={set("password")}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </Field>
      <p className="text-xs text-slate-500">
        They&apos;re also added as an employee, so they get leave balances like everyone else.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} variant="dark">
          Add admin
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ tenantId, admin, onClose }: { tenantId: string; admin: TenantAdmin; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/platform/tenants/${tenantId}/admins/${admin.userId}/reset-password`, {
        body: { newPassword: password },
      });
      toast(`Password reset for ${admin.fullName}`);
      onClose();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <FormError error={error} />
      <Field label="New password" error={error?.fieldErrors.newPassword} hint="At least 8 characters. Share it securely; they must choose their own when they next sign in." required>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
          autoFocus
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} variant="dark">
          Reset password
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- settings & suspension

function updateBody(t: TenantSummary, patch: Partial<{ name: string; timezone: string; weekendDays: DayOfWeek[]; active: boolean }>) {
  return { name: t.name, timezone: t.timezone, weekendDays: t.weekendDays, active: t.active, ...patch };
}

function SettingsForm({ tenant, onSaved }: { tenant: TenantSummary; onSaved: () => void }) {
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
      await api(`/platform/tenants/${tenant.id}`, {
        method: "PUT",
        body: updateBody(tenant, { name: name.trim(), timezone, weekendDays }),
      });
      toast("Company settings saved");
      onSaved();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Company settings">
      <form className="space-y-5" onSubmit={submit}>
        <FormError error={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" error={fe.name} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} required />
          </Field>
          <Field label="Timezone" error={fe.timezone}>
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
                onChange={(e) => setWeekendDays((w) => (e.target.checked ? [...w, d] : w.filter((x) => x !== d)))}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving} variant="dark">
            Save settings
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SuspendCard({ tenant, onChanged }: { tenant: TenantSummary; onChanged: () => void }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const suspending = tenant.active;

  async function apply() {
    setSaving(true);
    setError(null);
    try {
      await api(`/platform/tenants/${tenant.id}`, { method: "PUT", body: updateBody(tenant, { active: !tenant.active }) });
      toast(suspending ? `${tenant.name} suspended` : `${tenant.name} reactivated`);
      setConfirming(false);
      onChanged();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={suspending ? "Suspend company" : "Reactivate company"}>
      <p className="text-sm text-slate-600">
        {suspending
          ? "Suspended companies keep all their data, but nobody can sign in and active sessions stop working."
          : "Lets this company's users sign in again."}
      </p>
      <Button
        variant={suspending ? "danger" : "primary"}
        className="mt-4 w-full"
        onClick={() => (suspending ? setConfirming(true) : apply())}
        loading={saving && !suspending}
      >
        {suspending ? "Suspend company" : "Reactivate company"}
      </Button>
      {!suspending && error && (
        <div className="mt-3">
          <FormError error={error} />
        </div>
      )}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Suspend ${tenant.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={apply}>
              Suspend
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <FormError error={error} />
          <p>
            All {tenant.users} user{tenant.users === 1 ? "" : "s"} will be signed out and blocked from signing in. No
            data is deleted, and you can reactivate the company at any time.
          </p>
        </div>
      </Modal>
    </Card>
  );
}
