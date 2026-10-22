"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/lib/api";
import { formatDateRange, formatDays, todayIso } from "@/lib/format";
import type { CalendarLeave, CalendarPerson, DayOfWeek, Department, LeaveCalendar } from "@/lib/types";
import { useSession } from "@/components/session";
import {
  Badge,
  Button,
  Card,
  DataState,
  EmptyState,
  LinkButton,
  Modal,
  PageHeader,
  Select,
  cx,
} from "@/components/ui";

const WEEKDAYS: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
/** Highlight a day when at least this share of the people shown are off (and at least two people). */
const BUSY_SHARE = 0.3;
const PENDING_STRIPES = "repeating-linear-gradient(135deg, #c7d2fe 0 4px, #eef2ff 4px 8px)";

type Day = { iso: string; dayOfMonth: number; weekday: DayOfWeek; label: string };

/** All days of a "YYYY-MM" month, built from plain date strings so timezones can't shift them. */
function monthDays(month: string): { from: string; to: string; days: Day[]; title: string } {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  const days = Array.from({ length: count }, (_, i) => {
    const date = new Date(y, m - 1, i + 1);
    return {
      iso: `${month}-${String(i + 1).padStart(2, "0")}`,
      dayOfMonth: i + 1,
      weekday: WEEKDAYS[date.getDay()],
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
    };
  });
  const title = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return { from: days[0].iso, to: days[count - 1].iso, days, title };
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TeamCalendarPage() {
  const { isHr, tenant } = useSession();
  const today = todayIso();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [departmentId, setDepartmentId] = useState("");
  const { from, to, days, title } = useMemo(() => monthDays(month), [month]);
  const calendar = useApi<LeaveCalendar>("/leave-calendar", { from, to, departmentId: departmentId || undefined });
  const departments = useApi<Department[]>(isHr ? "/departments" : null);
  const [selected, setSelected] = useState<{ leave: CalendarLeave; person: CalendarPerson } | null>(null);

  return (
    <>
      <PageHeader
        title="Team calendar"
        description={
          isHr
            ? `Who is off across ${tenant.name}. Pending requests are shown striped.`
            : "Who is off in your team: you, your manager, colleagues who share your manager, and your direct reports."
        }
        actions={
          <>
            {isHr && (
              <div className="w-48">
                <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Department">
                  <option value="">All departments</option>
                  {departments.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
                ‹
              </Button>
              <span className="w-36 text-center text-sm font-medium text-slate-900">{title}</span>
              <Button variant="secondary" size="sm" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
                ›
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMonth(today.slice(0, 7))} disabled={month === today.slice(0, 7)}>
              Today
            </Button>
          </>
        }
      />

      <Legend />

      <Card bodyClassName="p-0">
        <DataState
          data={calendar.data}
          error={calendar.error}
          isEmpty={(c) => c.people.length === 0}
          empty={<EmptyState title="No one to show">There are no active employees in this view.</EmptyState>}
        >
          {(data) => <CalendarGrid data={data} days={days} today={today} onSelect={setSelected} />}
        </DataState>
      </Card>

      <LeaveDetails selected={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-indigo-500" /> Approved
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm ring-1 ring-indigo-300 ring-inset" style={{ backgroundImage: PENDING_STRIPES }} />
        Pending
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-1.5 rounded-sm bg-indigo-500" /> Half day
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-amber-100 ring-1 ring-amber-300 ring-inset" /> Holiday
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-slate-100 ring-1 ring-slate-200 ring-inset" /> Weekend
      </span>
    </div>
  );
}

function CalendarGrid({
  data,
  days,
  today,
  onSelect,
}: {
  data: LeaveCalendar;
  days: Day[];
  today: string;
  onSelect: (s: { leave: CalendarLeave; person: CalendarPerson }) => void;
}) {
  const weekend = new Set(data.weekendDays);
  const holidays = new Map(data.holidays.map((h) => [h.date, h.name]));
  const isWorkingDay = (d: Day) => !weekend.has(d.weekday) && !holidays.has(d.iso);

  // employeeId -> day -> leave. Weekends and holidays aren't leave days, so they stay empty.
  const byPerson = new Map<string, Map<string, CalendarLeave>>();
  for (const leave of data.leaves) {
    const map = byPerson.get(leave.employeeId) ?? new Map<string, CalendarLeave>();
    for (const d of days) if (d.iso >= leave.startDate && d.iso <= leave.endDate && isWorkingDay(d)) map.set(d.iso, leave);
    byPerson.set(leave.employeeId, map);
  }
  const offCount = (d: Day) => data.people.filter((p) => byPerson.get(p.employeeId)?.has(d.iso)).length;
  const isBusy = (n: number) => n >= 2 && n / data.people.length >= BUSY_SHARE;

  const columnClass = (d: Day) =>
    cx(
      holidays.has(d.iso) ? "bg-amber-50" : weekend.has(d.weekday) ? "bg-slate-50" : "",
      d.iso === today && "bg-indigo-50/60",
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-40 min-w-40 border-b border-slate-200 bg-white px-4 py-2 text-left text-xs font-medium text-slate-500">
              {data.people.length} {data.people.length === 1 ? "person" : "people"}
            </th>
            {days.map((d) => (
              <th
                key={d.iso}
                title={holidays.get(d.iso)}
                className={cx("min-w-7 border-b border-slate-200 px-0.5 py-1.5 text-center font-normal", columnClass(d))}
              >
                <div className="text-[10px] text-slate-400 uppercase">{d.label}</div>
                <div
                  className={cx(
                    "mx-auto flex size-6 items-center justify-center rounded-full text-xs",
                    d.iso === today ? "bg-indigo-600 font-semibold text-white" : "text-slate-700",
                  )}
                >
                  {d.dayOfMonth}
                </div>
                {holidays.has(d.iso) && <div className="mx-auto mt-0.5 size-1.5 rounded-full bg-amber-400" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.people.map((p) => (
            <tr key={p.employeeId}>
              <th
                scope="row"
                className="sticky left-0 z-10 max-w-40 border-b border-slate-100 bg-white px-4 py-1.5 text-left font-normal"
              >
                <div className="truncate font-medium text-slate-900">
                  {p.fullName}
                  {p.self && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
                </div>
                {(p.designation || p.departmentName) && (
                  <div className="truncate text-xs text-slate-500">
                    {[p.designation, data.scope === "COMPANY" ? p.departmentName : null].filter(Boolean).join(" · ")}
                  </div>
                )}
              </th>
              {days.map((d) => {
                const leave = byPerson.get(p.employeeId)?.get(d.iso);
                return (
                  <td key={d.iso} className={cx("border-b border-slate-100 px-px py-1.5", columnClass(d))}>
                    {leave && (
                      <button
                        type="button"
                        onClick={() => onSelect({ leave, person: p })}
                        title={`${p.fullName}: ${leave.leaveType ?? "On leave"}${leave.status === "PENDING" ? " (pending)" : ""}`}
                        className={cx(
                          "block h-7 rounded-sm transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-indigo-600",
                          leave.halfDay ? "w-1/2" : "w-full",
                          leave.status === "APPROVED" ? "bg-indigo-500" : "ring-1 ring-indigo-300 ring-inset",
                        )}
                        style={leave.status === "PENDING" ? { backgroundImage: PENDING_STRIPES } : undefined}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-xs font-medium text-slate-500">
              Off that day
            </th>
            {days.map((d) => {
              const n = isWorkingDay(d) ? offCount(d) : 0;
              return (
                <td key={d.iso} className={cx("px-0.5 py-2 text-center", columnClass(d))}>
                  {n > 0 && (
                    <span
                      title={isBusy(n) ? `${n} of ${data.people.length} people are off` : undefined}
                      className={cx(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs",
                        isBusy(n) ? "bg-amber-100 font-semibold text-amber-800 ring-1 ring-amber-300" : "text-slate-500",
                      )}
                    >
                      {n}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function LeaveDetails({
  selected,
  onClose,
}: {
  selected: { leave: CalendarLeave; person: CalendarPerson } | null;
  onClose: () => void;
}) {
  const leave = selected?.leave;
  return (
    <Modal
      open={selected !== null}
      onClose={onClose}
      title={selected ? `${selected.person.fullName}${selected.person.self ? " (you)" : ""}` : ""}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {leave?.canDecide && <LinkButton href="/approvals">Review in Approvals</LinkButton>}
        </>
      }
    >
      {leave && (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <Badge tone={leave.status === "APPROVED" ? "green" : "yellow"}>
                {leave.status === "APPROVED" ? "Approved" : "Pending"}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Dates</dt>
            <dd className="text-right text-slate-900">{formatDateRange(leave.startDate, leave.endDate)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Duration</dt>
            <dd className="text-slate-900">
              {leave.halfDay ? "Half day" : `${formatDays(leave.days)} working day${Number(leave.days) === 1 ? "" : "s"}`}
            </dd>
          </div>
          {leave.leaveType ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Type</dt>
                <dd className="text-slate-900">{leave.leaveType}</dd>
              </div>
              {leave.reason && (
                <div>
                  <dt className="text-slate-500">Reason</dt>
                  <dd className="mt-1 text-slate-900">{leave.reason}</dd>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
              The type and reason are only visible to {selected?.person.fullName.split(" ")[0]}, their approver and HR.
            </p>
          )}
        </dl>
      )}
    </Modal>
  );
}
