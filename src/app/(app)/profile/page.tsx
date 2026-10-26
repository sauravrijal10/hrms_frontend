"use client";

import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { blankToNull, formatDate, humanize, roleLabel } from "@/lib/format";
import type { Employee } from "@/lib/types";
import { postAuth } from "@/components/AuthForm";
import { EmployeeAssetsCard } from "@/components/assets";
import { useSession, useToast } from "@/components/session";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  DataState,
  DescriptionList,
  Field,
  FormError,
  Input,
  PageHeader,
  StatusBadge,
  Textarea,
} from "@/components/ui";

export default function ProfilePage() {
  const { user } = useSession();
  const me = useApi<Employee>(user.employeeId ? "/employees/me" : null);

  return (
    <>
      <PageHeader title="Profile" description="Your employee record and account settings." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {user.employeeId ? (
            <DataState data={me.data} error={me.error}>
              {(e) => (
                <>
                  <ProfileDetails employee={e} email={user.email} />
                  <ContactForm employee={e} onSaved={me.reload} />
                  <EmployeeAssetsCard employee={e} canManage={false} self />
                </>
              )}
            </DataState>
          ) : (
            <Alert kind="info">No employee profile is linked to this account ({user.email}).</Alert>
          )}
        </div>
        <ChangePasswordForm />
      </div>
    </>
  );
}

function ProfileDetails({ employee: e, email }: { employee: Employee; email: string }) {
  return (
    <Card>
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={e.fullName} className="size-14 text-lg" />
        <div>
          <p className="text-lg font-semibold text-slate-900">{e.fullName}</p>
          <p className="text-sm text-slate-500">
            {[e.designation, e.departmentName].filter(Boolean).join(" · ") || email}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <StatusBadge status={e.status} />
            {e.roles?.map((r) => (
              <Badge key={r} tone={r === "HR_ADMIN" ? "indigo" : "gray"}>
                {roleLabel(r)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <DescriptionList
        items={[
          ["Employee code", e.employeeCode],
          ["Email", e.email],
          ["Manager", e.managerName],
          ["Joined", formatDate(e.joinDate)],
          ["Date of birth", e.dateOfBirth && formatDate(e.dateOfBirth)],
          ["Gender", e.gender && humanize(e.gender)],
          ["National ID", e.nationalId],
          ["Bank", [e.bankName, e.bankAccountNumber].filter(Boolean).join(" · ")],
        ]}
      />
      <p className="mt-6 text-xs text-slate-500">To change these details, contact your HR team.</p>
    </Card>
  );
}

function ContactForm({ employee, onSaved }: { employee: Employee; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    phone: employee.phone ?? "",
    address: employee.address ?? "",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
  });
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
      await api("/employees/me", {
        method: "PATCH",
        body: {
          phone: blankToNull(form.phone),
          address: blankToNull(form.address),
          emergencyContactName: blankToNull(form.emergencyContactName),
          emergencyContactPhone: blankToNull(form.emergencyContactPhone),
        },
      });
      toast("Contact details saved");
      onSaved();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Contact details" description="You can keep these up to date yourself.">
      <form className="space-y-4" onSubmit={submit}>
        <FormError error={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" error={fe.phone}>
            <Input value={form.phone} onChange={set("phone")} maxLength={30} autoComplete="tel" />
          </Field>
        </div>
        <Field label="Address" error={fe.address}>
          <Textarea value={form.address} onChange={set("address")} maxLength={500} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Emergency contact name" error={fe.emergencyContactName}>
            <Input value={form.emergencyContactName} onChange={set("emergencyContactName")} maxLength={120} />
          </Field>
          <Field label="Emergency contact phone" error={fe.emergencyContactPhone}>
            <Input value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} maxLength={30} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const mismatch = confirm !== "" && confirm !== newPassword;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setSaving(true);
    setError(null);
    try {
      // Through our route handler: the API returns a fresh token, which belongs in the httpOnly cookie.
      await postAuth("/api/auth/change-password", { currentPassword, newPassword });
      toast("Password changed");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Change password" className="self-start">
      <form className="space-y-4" onSubmit={submit}>
        <FormError error={error} />
        <Field label="Current password" error={error?.fieldErrors.currentPassword}>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="New password" hint="At least 8 characters" error={error?.fieldErrors.newPassword}>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Confirm new password" error={mismatch ? "Passwords don't match" : undefined}>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Button type="submit" className="w-full" loading={saving} disabled={mismatch}>
          Update password
        </Button>
      </form>
    </Card>
  );
}
