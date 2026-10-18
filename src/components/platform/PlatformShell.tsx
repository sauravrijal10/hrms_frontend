"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { PlatformAdmin } from "@/lib/types";
import { initials } from "@/lib/format";
import { cx } from "../ui";

const PlatformAdminContext = createContext<PlatformAdmin | null>(null);

export function usePlatformAdmin(): PlatformAdmin {
  const admin = useContext(PlatformAdminContext);
  if (!admin) throw new Error("usePlatformAdmin must be used inside the platform console");
  return admin;
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const NAV = [
  {
    href: "/platform",
    label: "Companies",
    exact: false,
    icon: icon("M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h6"),
  },
  {
    href: "/platform/account",
    label: "My account",
    exact: true,
    icon: icon("M15.75 7a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"),
  },
];

/** The super user console: a dark sidebar so it's never mistaken for a company's HR app. */
export function PlatformShell({ admin, children }: { admin: PlatformAdmin; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : href === "/platform" ? !pathname.startsWith("/platform/account") : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-900">
          {icon("M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Z")}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">HRMS Platform</p>
          <p className="text-xs text-slate-400">Super user console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
              )}
            >
              <span className={active ? "text-emerald-400" : "text-slate-500"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300">
            {initials(admin.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{admin.fullName}</p>
            <p className="truncate text-xs text-slate-400">{admin.email}</p>
          </div>
        </div>
        <form action="/api/platform-auth/logout" method="post">
          <button
            type="submit"
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-white/5 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <PlatformAdminContext.Provider value={admin}>
      <div className="min-h-screen bg-slate-100">
        <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{sidebar}</aside>
          </div>
        )}
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-slate-900 px-4 text-white lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="-ml-1 rounded-md p-1.5 hover:bg-white/10"
              aria-label="Open menu"
            >
              {icon("M4 6h16M4 12h16M4 18h16")}
            </button>
            <span className="text-sm font-semibold">HRMS Platform</span>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </PlatformAdminContext.Provider>
  );
}
