import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">
          HR
        </span>
        <span className="text-xl font-semibold tracking-tight text-slate-900">HRMS</span>
      </div>
      {children}
    </div>
  );
}
