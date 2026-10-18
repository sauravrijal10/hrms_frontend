import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getPlatformToken, serverFetch } from "@/lib/server";
import type { PlatformAdmin } from "@/lib/types";
import { ToastProvider } from "@/components/session";
import { PlatformShell } from "@/components/platform/PlatformShell";

export const metadata: Metadata = { title: { default: "Platform", template: "%s · HRMS Platform" } };

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const token = await getPlatformToken();
  if (!token) redirect("/platform/login");

  const me = await serverFetch<PlatformAdmin>("/platform/auth/me", token);
  if (me.status === 401 || me.status === 403 || me.status === 404) {
    redirect("/api/platform-auth/logout?reason=expired");
  }
  if (!me.data) throw new Error("The HRMS API is not reachable. Is the backend running?");

  return (
    <ToastProvider>
      <PlatformShell admin={me.data}>{children}</PlatformShell>
    </ToastProvider>
  );
}
