"use client";

import { useState, type FormEvent } from "react";
import { toApiError, useApi, type ApiError } from "@/lib/api";
import { blankToNull, humanize, roleLabel } from "@/lib/format";
import {
  EMPLOYEE_STATUSES,
  GENDERS,
  ROLES,
  type Department,
  type Employee,
  type EmployeeStatus,
  type Gender,
  type Page,
  type Role,
} from "@/lib/types";
import { Button, Card, Checkbox, Field, FormError, Input, Select, Textarea } from "./ui";

/** Body for POST /employees (create) or PUT /employees/{id} (edit). */
export type EmployeePayload = Record<string, unknown>;

function initialState(e?: Employee) {
  return {
    employeeCode: e?.employeeCode ?? "",
    firstName: e?.firstName ?? "",
    lastName: e?.lastName ?? "",
    email: e?.email ?? "",
    phone: e?.phone ?? "",
    dateOfBirth: e?.dateOfBirth ?? "",
    gender: (e?.gender ?? "") as Gender | "",
    address: e?.address ?? "",
    emergencyContactName: e?.emergencyContactName ?? "",
    emergencyContactPhone: e?.emergencyContactPhone ?? "",
    designation: e?.designation ?? "",
    departmentId: e?.departmentId ?? "",
    managerId: e?.managerId ?? "",
    joinDate: e?.joinDate ?? "",
    nationalId: e?.nationalId ?? "",
    bankName: e?.bankName ?? "",
    bankAccountNumber: e?.bankAccountNumber ?? "",
    status: (e?.status ?? "ACTIVE") as EmployeeStatus,
    exitDate: e?.exitDate ?? "",
    roles: (e?.roles ?? ["EMPLOYEE"]) as Role[],
    createLogin: true,
    password: "",
  };
}

export function EmployeeForm({
  employee,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  /** Present when editing. */
  employee?: Employee;
  submitLabel: string;
  onSubmit: (payload: EmployeePayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const editing = !!employee;
  const [form, setForm] = useState(() => initialState(employee));
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  const departments = useApi<Department[]>("/departments");
  const people = useApi<Page<Employee>>("/employees", { size: 500, sort: "firstName" });
  const managers = (people.data?.content ?? []).filter((p) => p.id !== employee?.id && p.status === "ACTIVE");

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleRole = (role: Role, on: boolean) =>
    setForm((f) => ({ ...f, roles: on ? [...f.roles, role] : f.roles.filter((r) => r !== role) }));

  const hasLogin = editing ? employee.hasLogin : form.createLogin;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const common = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: blankToNull(form.phone),
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      address: blankToNull(form.address),
      emergencyContactName: blankToNull(form.emergencyContactName),
      emergencyContactPhone: blankToNull(form.emergencyContactPhone),
      designation: blankToNull(form.designation),
      departmentId: form.departmentId || null,
      managerId: form.managerId || null,
      joinDate: form.joinDate,
      nationalId: blankToNull(form.nationalId),
      bankName: blankToNull(form.bankName),
      bankAccountNumber: blankToNull(form.bankAccountNumber),
    };
    const payload: EmployeePayload = editing
      ? { ...common, status: form.status, exitDate: form.exitDate || null, roles: employee.hasLogin ? form.roles : null }
      : {
          ...common,
          employeeCode: blankToNull(form.employeeCode),
          createLogin: form.createLogin,
          password: form.createLogin ? form.password : null,
          roles: form.createLogin ? form.roles : null,
        };
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(toApiError(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <FormError error={error} />

      <Card title="Basic information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={fe.firstName} required>
            <Input value={form.firstName} onChange={set("firstName")} maxLength={80} required />
          </Field>
          <Field label="Last name" error={fe.lastName} required>
            <Input value={form.lastName} onChange={set("lastName")} maxLength={80} required />
          </Field>
          <Field label="Work email" error={fe.email} required>
            <Input type="email" value={form.email} onChange={set("email")} maxLength={150} required />
          </Field>
          <Field label="Phone" error={fe.phone}>
            <Input value={form.phone} onChange={set("phone")} maxLength={30} />
          </Field>
          <Field label="Date of birth" error={fe.dateOfBirth}>
            <Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          </Field>
          <Field label="Gender" error={fe.gender}>
            <Select value={form.gender} onChange={set("gender")}>
              <option value="">Not specified</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {humanize(g)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Address" error={fe.address} className="sm:col-span-2">
            <Textarea value={form.address} onChange={set("address")} maxLength={500} />
          </Field>
          <Field label="Emergency contact name" error={fe.emergencyContactName}>
            <Input value={form.emergencyContactName} onChange={set("emergencyContactName")} maxLength={120} />
          </Field>
          <Field label="Emergency contact phone" error={fe.emergencyContactPhone}>
            <Input value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} maxLength={30} />
          </Field>
        </div>
      </Card>

      <Card title="Employment">
        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <Field label="Employee code">
              <Input value={form.employeeCode} disabled />
            </Field>
          ) : (
            <Field label="Employee code" error={fe.employeeCode} hint="Leave blank to generate one">
              <Input value={form.employeeCode} onChange={set("employeeCode")} maxLength={30} />
            </Field>
          )}
          <Field label="Join date" error={fe.joinDate} required>
            <Input type="date" value={form.joinDate} onChange={set("joinDate")} required />
          </Field>
          <Field label="Designation" error={fe.designation}>
            <Input value={form.designation} onChange={set("designation")} maxLength={100} placeholder="e.g. Software Engineer" />
          </Field>
          <Field label="Department" error={fe.departmentId}>
            <Select value={form.departmentId} onChange={set("departmentId")}>
              <option value="">No department</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Manager" error={fe.managerId} hint="The manager approves this person's leave">
            <Select value={form.managerId} onChange={set("managerId")}>
              <option value="">No manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                  {m.designation ? ` — ${m.designation}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          {editing && (
            <Field label="Status" error={fe.status}>
              <Select value={form.status} onChange={set("status")}>
                {EMPLOYEE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {editing && (
            <Field
              label="Last working day"
              error={fe.exitDate}
              hint="For leavers: their final month's pay covers days up to this date"
            >
              <Input type="date" value={form.exitDate} onChange={set("exitDate")} min={form.joinDate || undefined} />
            </Field>
          )}
        </div>
      </Card>

      <Card title="Sensitive details" description="Stored encrypted. Only HR and the employee can see them.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="National ID" error={fe.nationalId}>
            <Input value={form.nationalId} onChange={set("nationalId")} maxLength={50} autoComplete="off" />
          </Field>
          <div className="hidden sm:block" />
          <Field label="Bank name" error={fe.bankName}>
            <Input value={form.bankName} onChange={set("bankName")} maxLength={100} autoComplete="off" />
          </Field>
          <Field label="Bank account number" error={fe.bankAccountNumber}>
            <Input value={form.bankAccountNumber} onChange={set("bankAccountNumber")} maxLength={50} autoComplete="off" />
          </Field>
        </div>
      </Card>

      <Card
        title="Login access"
        description={
          editing && !employee.hasLogin
            ? "This employee has no login account, so they can't sign in."
            : "Roles control what this person can do in HRMS."
        }
      >
        <div className="space-y-4">
          {!editing && (
            <Checkbox
              label="Create a login so this employee can sign in"
              checked={form.createLogin}
              onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
            />
          )}
          {!editing && form.createLogin && (
            <Field
              label="Initial password"
              error={fe.password}
              hint="At least 8 characters. It's emailed to them, and they must choose their own when they first sign in."
              required
              className="max-w-sm"
            >
              <Input
                type="password"
                value={form.password}
                onChange={set("password")}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </Field>
          )}
          {hasLogin && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Roles</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {ROLES.map((r) => (
                  <Checkbox
                    key={r}
                    label={roleLabel(r)}
                    checked={form.roles.includes(r)}
                    onChange={(e) => toggleRole(r, e.target.checked)}
                  />
                ))}
              </div>
              {fe.roles && <p className="mt-1 text-xs text-red-600">{fe.roles}</p>}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
