"use client";

import Link from "next/link";
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { ApiError } from "@/lib/api";
import type { LeaveStatus, EmployeeStatus } from "@/lib/types";
import { humanize, initials } from "@/lib/format";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------- buttons

type Variant = "primary" | "dark" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-300",
  dark: "bg-slate-900 text-white shadow-sm hover:bg-slate-700 disabled:bg-slate-400",
  secondary:
    "bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500 disabled:bg-red-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300",
};
const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
};

function buttonClass(variant: Variant, size: Size, className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------- form controls

export const inputClass =
  "block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 " +
  "placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 focus:outline-none " +
  "disabled:bg-slate-50 disabled:text-slate-500";

export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, className)} rows={3} {...props} />;
}

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx("inline-flex items-center gap-2 text-sm text-slate-700", className)}>
      <input
        type="checkbox"
        className="size-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-600"
        {...props}
      />
      {label}
    </label>
  );
}

/** Shows the API's error detail at the top of a form. Field messages are shown next to each field. */
export function FormError({ error }: { error?: ApiError | null }) {
  if (!error) return null;
  const hasFields = Object.keys(error.fieldErrors).length > 0;
  return <Alert>{hasFields ? "Please fix the highlighted fields." : error.message}</Alert>;
}

// ---------------------------------------------------------------- layout & feedback

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cx("rounded-xl bg-white shadow-sm ring-1 ring-slate-200", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "info" | "success"; children: ReactNode }) {
  const styles = {
    error: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  }[kind];
  return <div className={cx("rounded-md px-4 py-3 text-sm ring-1 ring-inset", styles)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className ?? "size-5")} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

/** Renders loading / error / empty states, or the children once data is available. */
export function DataState<T>({
  data,
  error,
  empty,
  isEmpty,
  children,
}: {
  data: T | undefined;
  error?: ApiError;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (error) return <Alert>{error.message}</Alert>;
  if (data === undefined) return <Loading />;
  if (empty && (isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0)) return <>{empty}</>;
  return <>{children(data)}</>;
}

// ---------------------------------------------------------------- badges

type Tone = "gray" | "green" | "yellow" | "red" | "blue" | "indigo";
const TONES: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-500/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  yellow: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<LeaveStatus | EmployeeStatus, Tone> = {
  PENDING: "yellow",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "gray",
  ACTIVE: "green",
  INACTIVE: "gray",
  TERMINATED: "red",
};

export function StatusBadge({ status }: { status: LeaveStatus | EmployeeStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{humanize(status)}</Badge>;
}

// ---------------------------------------------------------------- tables

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cx(
        "px-5 py-2.5 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-5 py-3 align-top text-slate-700", className)}>{children}</td>;
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return <p className="pt-4 text-xs text-slate-500">{totalElements} total</p>;
  return (
    <div className="flex items-center justify-between pt-4 text-sm">
      <p className="text-xs text-slate-500">
        Page {page + 1} of {totalPages} · {totalElements} total
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- modal

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal>
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={cx(
          "relative flex max-h-[90vh] w-full flex-col rounded-xl bg-white shadow-xl",
          size === "lg" ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-100 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- misc

export function DescriptionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
          <dd className="mt-1 text-sm break-words text-slate-900">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
