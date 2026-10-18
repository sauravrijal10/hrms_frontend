"use client";

import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/format";
import type { Holiday } from "@/lib/types";
import { useSession, useToast } from "@/components/session";
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
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";

export default function HolidaysPage() {
  const { isHr } = useSession();
  const toast = useToast();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Holiday | null>(null);
  const [deleteError, setDeleteError] = useState<ApiError | null>(null);
  const holidays = useApi<Holiday[]>("/holidays", { year });
  const today = todayIso();

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/holidays/${deleting.id}`, { method: "DELETE" });
      toast("Holiday removed");
      setDeleting(null);
      holidays.reload();
    } catch (e) {
      setDeleteError(toApiError(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Holidays"
        description="Company holidays are skipped when leave days are counted."
        actions={
          <>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
              {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </Select>
            {isHr && <Button onClick={() => setAdding(true)}>Add holiday</Button>}
          </>
        }
      />
      <Card bodyClassName="pb-0">
        <DataState
          data={holidays.data}
          error={holidays.error}
          empty={<EmptyState title={`No holidays in ${year}`}>{isHr && "Add your company's public holidays."}</EmptyState>}
        >
          {(data) => (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Day</Th>
                  <Th>Name</Th>
                  {isHr && <Th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((h) => {
                  const [y, m, d] = h.date.split("-").map(Number);
                  return (
                    <tr key={h.id} className={h.date < today ? "text-slate-400" : undefined}>
                      <Td className="whitespace-nowrap">{formatDate(h.date)}</Td>
                      <Td>{new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long" })}</Td>
                      <Td className="font-medium text-slate-900">{h.name}</Td>
                      {isHr && (
                        <Td className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(h)}>
                            Remove
                          </Button>
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </DataState>
      </Card>

      <AddHolidayDialog
        open={adding}
        onClose={() => setAdding(false)}
        onDone={(h) => {
          setAdding(false);
          setYear(Number(h.date.slice(0, 4)));
          holidays.reload();
        }}
      />

      <Modal
        open={!!deleting}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        title="Remove holiday?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={remove}>
              Remove
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <FormError error={deleteError} />
          {deleting && (
            <p>
              {deleting.name} on {formatDate(deleting.date)} will count as a working day for new leave requests.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}

function AddHolidayDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (h: Holiday) => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const h = await api<Holiday>("/holidays", { body: { date, name: name.trim() } });
      toast("Holiday added");
      setDate("");
      setName("");
      onDone(h);
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add holiday"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-holiday" loading={saving}>
            Add
          </Button>
        </>
      }
    >
      <form id="add-holiday" className="space-y-4" onSubmit={submit}>
        <FormError error={error} />
        <Field label="Date" error={error?.fieldErrors.date} required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Name" error={error?.fieldErrors.name} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
        </Field>
      </form>
    </Modal>
  );
}
