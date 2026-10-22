/** "2026-10-12" -> "12 Oct 2026", parsed as a local date so it never shifts a day. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** 1 -> "1", 1.5 -> "1.5" */
export function formatDays(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function pluralDays(n: number): string {
  return `${formatDays(n)} day${Number(n) === 1 ? "" : "s"}`;
}

/** Today's date as YYYY-MM-DD in the browser's timezone. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "HR_ADMIN" -> "Hr admin" style labels for enums. */
export function humanize(value: string): string {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function roleLabel(role: string): string {
  return role === "HR_ADMIN" ? "HR admin" : humanize(role);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Turns "" into null so optional fields are sent as absent rather than blank. */
export function blankToNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

/** "NPR 52,645.00". The currency code is shown as-is, so any company currency works. */
export function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "November 2026" */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
