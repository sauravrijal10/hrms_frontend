"use client";

import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatDays } from "@/lib/format";
import type { LeaveType } from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { useToast } from "@/components/session";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DataState,
  EmptyState,
  Field,
  FormError,
  Input,
  Modal,
  PageHeader,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";

type Editing = { type?: LeaveType } | null;

export default function LeaveTypesPage() {
  return (
    <HrOnly>
      <LeaveTypes />
    </HrOnly>
  );
}

function LeaveTypes() {
  const toast = useToast();
  const [includeInactive, setIncludeInactive] = useState(false);
  const types = useApi<LeaveType[]>("/leave-types", { includeInactive });
  const [editing, setEditing] = useState<Editing>(null);
  const [deactivating, setDeactivating] = useState<LeaveType | null>(null);
  const [deactivateError, setDeactivateError] = useState<ApiError | null>(null);

  async function deactivate() {
    if (!deactivating) return;
    try {
      await api(`/leave-types/${deactivating.id}`, { method: "DELETE" });
      toast(`${deactivating.name} deactivated`);
      setDeactivating(null);
      types.reload();
    } catch (e) {
      setDeactivateError(toApiError(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Leave types"
        description="New leave types get a balance for every active employee straight away."
        actions={<Button onClick={() => setEditing({})}>Add leave type</Button>}
      />
      <Card bodyClassName="pb-0">
        <Checkbox
          className="mb-4"
          label="Show inactive leave types"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
        />
        <DataState
          data={types.data}
          error={types.error}
          empty={<EmptyState title="No leave types yet">Add types such as Annual, Sick or Casual leave.</EmptyState>}
        >
          {(data) => (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Code</Th>
                  <Th>Days / year</Th>
                  <Th>Max carry forward</Th>
                  <Th>Paid</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((t) => (
                  <tr key={t.id} className={t.active ? undefined : "text-slate-400"}>
                    <Td>
                      <p className="font-medium text-slate-900">{t.name}</p>
                      {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                    </Td>
                    <Td className="font-mono text-xs">{t.code}</Td>
                    <Td>{formatDays(t.defaultDays)}</Td>
                    <Td>{formatDays(t.maxCarryForward)}</Td>
                    <Td>{t.paid ? "Paid" : "Unpaid"}</Td>
                    <Td>{t.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                    <Td className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ type: t })}>
                        Edit
                      </Button>
                      {t.active && (
                        <Button size="sm" variant="ghost" onClick={() => setDeactivating(t)}>
                          Deactivate
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DataState>
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.type ? "Edit leave type" : "Add leave type"}
      >
        {editing && (
          <LeaveTypeForm
            key={editing.type?.id ?? "new"}
            type={editing.type}
            onClose={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              types.reload();
            }}
          />
        )}
      </Modal>

      <Modal
        open={!!deactivating}
        onClose={() => {
          setDeactivating(null);
          setDeactivateError(null);
        }}
        title="Deactivate leave type?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivating(null)}>
              Keep active
            </Button>
            <Button variant="danger" onClick={deactivate}>
              Deactivate
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <FormError error={deactivateError} />
          <p>
            Employees will no longer be able to apply for {deactivating?.name}. Existing requests and balances are
            kept, and you can reactivate it by editing it.
          </p>
        </div>
      </Modal>
    </>
  );
}

function LeaveTypeForm({ type, onClose, onDone }: { type?: LeaveType; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    code: type?.code ?? "",
    name: type?.name ?? "",
    description: type?.description ?? "",
    defaultDays: type ? String(type.defaultDays) : "",
    maxCarryForward: type ? String(type.maxCarryForward) : "0",
    paid: type?.paid ?? true,
    active: type?.active ?? true,
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      defaultDays: Number(form.defaultDays),
      maxCarryForward: Number(form.maxCarryForward),
      paid: form.paid,
      active: form.active,
    };
    try {
      if (type) await api(`/leave-types/${type.id}`, { method: "PUT", body });
      else await api("/leave-types", { body });
      toast(type ? "Leave type updated" : "Leave type added");
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
      <div className="grid grid-cols-3 gap-4">
        <Field label="Code" error={fe.code} required>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            pattern="[A-Za-z0-9_]+"
            title="Letters, digits and underscores"
            maxLength={20}
            placeholder="ANNUAL"
            required
          />
        </Field>
        <Field label="Name" error={fe.name} className="col-span-2" required>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={80}
            placeholder="Annual Leave"
            required
          />
        </Field>
      </div>
      <Field label="Description" error={fe.description}>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={500}
          rows={2}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Days per year" error={fe.defaultDays} required>
          <Input
            type="number"
            min={0}
            max={999.5}
            step={0.5}
            value={form.defaultDays}
            onChange={(e) => setForm({ ...form, defaultDays: e.target.value })}
            required
          />
        </Field>
        <Field label="Max carry forward" error={fe.maxCarryForward} hint="Unused days moved to next year" required>
          <Input
            type="number"
            min={0}
            max={999.5}
            step={0.5}
            value={form.maxCarryForward}
            onChange={(e) => setForm({ ...form, maxCarryForward: e.target.value })}
            required
          />
        </Field>
      </div>
      <div className="flex gap-6">
        <Checkbox label="Paid leave" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
        <Checkbox label="Active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
      </div>
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
