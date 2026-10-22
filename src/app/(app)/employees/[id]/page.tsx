"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatDate, formatDays, humanize, roleLabel } from "@/lib/format";
import type { Employee, LeaveBalance } from "@/lib/types";
import { useSession, useToast } from "@/components/session";
import { EmployeeForm } from "@/components/EmployeeForm";
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataState,
  DescriptionList,
  EmptyState,
  Field,
  FormError,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { isHr, user } = useSession();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const employee = useApi<Employee>(`/employees/${id}`);

  return (
    <>
      <Link
        href={isHr ? "/employees" : "/team"}
        className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← {isHr ? "Employees" : "My team"}
      </Link>
      <DataState data={employee.data} error={employee.error}>
        {(e) =>
          editing ? (
            <>
              <PageHeader title={`Edit ${e.fullName}`} />
              <EmployeeForm
                employee={e}
                submitLabel="Save changes"
                onCancel={() => setEditing(false)}
                onSubmit={async (payload) => {
                  await api(`/employees/${e.id}`, { method: "PUT", body: payload });
                  toast("Employee updated");
                  setEditing(false);
                  employee.reload();
                }}
              />
            </>
          ) : (
            <>
              <PageHeader
                title={e.fullName}
                description={[e.designation, e.departmentName].filter(Boolean).join(" · ") || e.email}
                actions={isHr && <Button onClick={() => setEditing(true)}>Edit employee</Button>}
              />
              <div className="space-y-6">
                <EmployeeDetails employee={e} fullAccess={isHr || e.id === user.employeeId} />
                <Balances employeeId={e.id} canAdjust={isHr} />
              </div>
            </>
          )
        }
      </DataState>
    </>
  );
}

function EmployeeDetails({ employee: e, fullAccess }: { employee: Employee; fullAccess: boolean }) {
  // Managers get a reduced view: the API leaves personal fields out entirely.
  const personal: [string, ReactNode][] =
    fullAccess
      ? [
          ["Date of birth", e.dateOfBirth && formatDate(e.dateOfBirth)],
          ["Address", e.address],
          ["Emergency contact", [e.emergencyContactName, e.emergencyContactPhone].filter(Boolean).join(" · ")],
          ["National ID", e.nationalId],
          ["Bank", [e.bankName, e.bankAccountNumber].filter(Boolean).join(" · ")],
        ]
      : [];

  return (
    <Card>
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={e.fullName} className="size-14 text-lg" />
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={e.status} />
          {e.hasLogin ? (
            e.roles?.map((r) => (
              <Badge key={r} tone={r === "HR_ADMIN" ? "indigo" : "gray"}>
                {roleLabel(r)}
              </Badge>
            ))
          ) : (
            <Badge>No login</Badge>
          )}
        </div>
      </div>
      <DescriptionList
        items={[
          ["Employee code", <span key="c" className="font-mono">{e.employeeCode}</span>],
          ["Email", e.email],
          ["Phone", e.phone],
          ["Gender", e.gender && humanize(e.gender)],
          ["Department", e.departmentName],
          ["Manager", e.managerName],
          ["Joined", formatDate(e.joinDate)],
          ...personal,
        ]}
      />
    </Card>
  );
}

function Balances({ employeeId, canAdjust }: { employeeId: string; canAdjust: boolean }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [adjusting, setAdjusting] = useState<LeaveBalance | null>(null);
  const balances = useApi<LeaveBalance[]>(`/employees/${employeeId}/leave-balances`, { year });

  return (
    <Card
      title="Leave balances"
      bodyClassName="pb-0"
      actions={
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" aria-label="Year">
          {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </Select>
      }
    >
      <DataState
        data={balances.data}
        error={balances.error}
        empty={
          <EmptyState title={`No balances for ${year}`}>
            {canAdjust && "Use “Allocate balances” in Company settings to create them."}
          </EmptyState>
        }
      >
        {(data) => (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Leave type</Th>
                <Th>Allocated</Th>
                <Th>Carried forward</Th>
                <Th>Used</Th>
                <Th>Pending</Th>
                <Th>Available</Th>
                {canAdjust && <Th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((b) => (
                <tr key={b.id}>
                  <Td className="font-medium text-slate-900">{b.leaveTypeName}</Td>
                  <Td>
                    {formatDays(b.allocated)}
                    {b.proRated && (
                      <span className="ml-1 text-xs text-slate-500" title="Joined during this year">
                        (pro-rated from {formatDays(b.fullYearDays)})
                      </span>
                    )}
                  </Td>
                  <Td>{formatDays(b.carriedForward)}</Td>
                  <Td>{formatDays(b.used)}</Td>
                  <Td>{formatDays(b.pending)}</Td>
                  <Td className="font-semibold text-slate-900">{formatDays(b.available)}</Td>
                  {canAdjust && (
                    <Td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setAdjusting(b)}>
                        Adjust
                      </Button>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataState>
      <AdjustBalanceDialog
        balance={adjusting}
        onClose={() => setAdjusting(null)}
        onDone={() => {
          setAdjusting(null);
          balances.reload();
        }}
      />
    </Card>
  );
}

function AdjustBalanceDialog({
  balance,
  onClose,
  onDone,
}: {
  balance: LeaveBalance | null;
  onClose: () => void;
  onDone: () => void;
}) {
  // Remounting via `key` resets the inputs whenever a different balance is opened.
  return (
    <Modal open={!!balance} onClose={onClose} title="Adjust balance" description={balance ? `${balance.leaveTypeName} · ${balance.year}` : undefined}>
      {balance && <AdjustBalanceForm key={balance.id} balance={balance} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function AdjustBalanceForm({
  balance,
  onClose,
  onDone,
}: {
  balance: LeaveBalance;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [allocated, setAllocated] = useState(String(balance.allocated));
  const [carriedForward, setCarriedForward] = useState(String(balance.carriedForward));
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/leave-balances/${balance.id}`, {
        method: "PUT",
        body: { allocated: Number(allocated), carriedForward: Number(carriedForward) },
      });
      toast("Balance updated");
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
        <Field label="Allocated days" error={error?.fieldErrors.allocated}>
          <Input type="number" min={0} max={999.5} step={0.5} value={allocated} onChange={(e) => setAllocated(e.target.value)} required />
        </Field>
        <Field label="Carried forward" error={error?.fieldErrors.carriedForward}>
          <Input type="number" min={0} max={999.5} step={0.5} value={carriedForward} onChange={(e) => setCarriedForward(e.target.value)} required />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        Used ({formatDays(balance.used)}) and pending ({formatDays(balance.pending)}) days are not changed.
      </p>
      <div className="flex justify-end gap-2 pt-2">
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
