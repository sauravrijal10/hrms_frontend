"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { AuthUser, Employee, Tenant } from "@/lib/types";

export interface Session {
  user: AuthUser;
  employee: Employee | null;
  tenant: Tenant;
  isHr: boolean;
  /** HR admins approve anything; anyone with direct reports approves their team's leave. */
  isApprover: boolean;
  displayName: string;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the signed-in app");
  return session;
}

// ---------------------------------------------------------------- toasts

type Toast = { id: number; message: string; kind: "success" | "error" };
const ToastContext = createContext<(message: string, kind?: Toast["kind"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              "pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg " +
              (t.kind === "success" ? "bg-slate-900" : "bg-red-600")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
