"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar, Badge, cx } from "./ui";
import { useSession } from "./session";
import { roleLabel } from "@/lib/format";

type NavItem = { href: string; label: string; icon: ReactNode };

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  home: icon("M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z"),
  leave: icon("M8 3v3M16 3v3M3.5 9h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 5Zm4 8 2 2 4-4"),
  inbox: icon("M3 13h5l1.5 2.5h5L16 13h5M5 5h14l2 8v5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-5l2-8Z"),
  team: icon("M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm11.5 9v-1a4 4 0 0 0-3-3.87M15.5 4.13a3 3 0 0 1 0 5.74"),
  calendar: icon("M8 3v3M16 3v3M3.5 9h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 5Zm2.5 7.5h3v3h-3v-3Z"),
  holiday: icon("M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.42-1.42M7.05 7.05 5.64 5.64m12.72 0-1.42 1.41M7.05 16.95l-1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"),
  user: icon("M15.75 7a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"),
  employees: icon("M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h6"),
  department: icon("M4 6h16M4 12h16M4 18h10"),
  types: icon("M7 7h.01M3 12.5V5a2 2 0 0 1 2-2h7.5l8.5 8.5-9.5 9.5L3 12.5Z"),
  requests: icon("M9 5h10M9 12h10M9 19h10M4.5 5h.01M4.5 12h.01M4.5 19h.01"),
  settings: icon("M10.3 4.3a1.7 1.7 0 0 1 3.4 0 1.7 1.7 0 0 0 2.6 1.1 1.7 1.7 0 0 1 2.4 2.4 1.7 1.7 0 0 0 1 2.6 1.7 1.7 0 0 1 0 3.3 1.7 1.7 0 0 0-1 2.6 1.7 1.7 0 0 1-2.4 2.4 1.7 1.7 0 0 0-2.6 1 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 0-2.6-1 1.7 1.7 0 0 1-2.4-2.4 1.7 1.7 0 0 0-1-2.6 1.7 1.7 0 0 1 0-3.3 1.7 1.7 0 0 0 1-2.6 1.7 1.7 0 0 1 2.4-2.4 1.7 1.7 0 0 0 2.6-1.1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"),
};

export function Shell({ children }: { children: ReactNode }) {
  const { tenant, isHr, isApprover, user, displayName } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: ICONS.home },
        ...(user.employeeId ? [{ href: "/leave", label: "My leave", icon: ICONS.leave }] : []),
        ...(isApprover ? [{ href: "/approvals", label: "Approvals", icon: ICONS.inbox }] : []),
        ...(isApprover && !isHr ? [{ href: "/team", label: "My team", icon: ICONS.team }] : []),
        ...(user.employeeId || isHr ? [{ href: "/calendar", label: "Team calendar", icon: ICONS.calendar }] : []),
        { href: "/holidays", label: "Holidays", icon: ICONS.holiday },
        { href: "/profile", label: "Profile", icon: ICONS.user },
      ],
    },
    ...(isHr
      ? [
          {
            title: "HR admin",
            items: [
              { href: "/employees", label: "Employees", icon: ICONS.employees },
              { href: "/departments", label: "Departments", icon: ICONS.department },
              { href: "/leave-types", label: "Leave types", icon: ICONS.types },
              { href: "/leave-requests", label: "All leave requests", icon: ICONS.requests },
              { href: "/settings", label: "Company settings", icon: ICONS.settings },
            ],
          },
        ]
      : []),
  ];

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && (
            <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">{g.title}</p>
          )}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cx(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <span className={active ? "text-indigo-600" : "text-slate-400"}>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          HR
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{tenant.name}</p>
          <p className="truncate text-xs text-slate-500">{tenant.slug}</p>
        </div>
      </div>
      {nav}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar name={displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {user.roles.map((r) => (
                <Badge key={r} tone={r === "HR_ADMIN" ? "indigo" : "gray"}>
                  {roleLabel(r)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 lg:block">{sidebar}</aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            {icon("M4 6h16M4 12h16M4 18h16")}
          </button>
          <span className="truncate text-sm font-semibold text-slate-900">{tenant.name}</span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
