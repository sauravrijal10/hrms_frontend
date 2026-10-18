"use client";

import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import type { Department } from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import { useToast } from "@/components/session";
import {
  Button,
  Card,
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

type Editing = { department?: Department } | null;

export default function DepartmentsPage() {
  return (
    <HrOnly>
      <Departments />
    </HrOnly>
  );
}

function Departments() {
  const toast = useToast();
  const departments = useApi<Department[]>("/departments");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<ApiError | null>(null);

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/departments/${deleting.id}`, { method: "DELETE" });
      toast("Department deleted");
      setDeleting(null);
      departments.reload();
    } catch (e) {
      setDeleteError(toApiError(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Departments"
        description="Group employees by team or function."
        actions={<Button onClick={() => setEditing({})}>Add department</Button>}
      />
      <Card bodyClassName="pb-0">
        <DataState
          data={departments.data}
          error={departments.error}
          empty={<EmptyState title="No departments yet">Add departments like Engineering or Finance.</EmptyState>}
        >
          {(data) => (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((d) => (
                  <tr key={d.id}>
                    <Td className="font-medium whitespace-nowrap text-slate-900">{d.name}</Td>
                    <Td className="text-slate-500">{d.description || "—"}</Td>
                    <Td className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ department: d })}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(d)}>
                        Delete
                      </Button>
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
        title={editing?.department ? "Edit department" : "Add department"}
      >
        {editing && (
          <DepartmentForm
            key={editing.department?.id ?? "new"}
            department={editing.department}
            onClose={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              departments.reload();
            }}
          />
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        title="Delete department?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <FormError error={deleteError} />
          <p>{deleting?.name} will be deleted. This can&apos;t be undone.</p>
        </div>
      </Modal>
    </>
  );
}

function DepartmentForm({
  department,
  onClose,
  onDone,
}: {
  department?: Department;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { name: name.trim(), description: description.trim() || null };
    try {
      if (department) await api(`/departments/${department.id}`, { method: "PUT", body });
      else await api("/departments", { body });
      toast(department ? "Department updated" : "Department added");
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
      <Field label="Name" error={error?.fieldErrors.name} required>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoFocus />
      </Field>
      <Field label="Description" error={error?.fieldErrors.description}>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </Field>
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
