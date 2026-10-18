import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getToken, serverFetch } from "@/lib/server";
import type { AuthUser, Employee, Tenant } from "@/lib/types";
import { SessionProvider, ToastProvider, type Session } from "@/components/session";
import { Shell } from "@/components/Shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const token = await getToken();
  if (!token) redirect("/login");

  const me = await serverFetch<AuthUser>("/auth/me", token);
  if (me.status === 401) redirect("/api/auth/logout?reason=expired");
  if (!me.data) throw new Error("The HRMS API is not reachable. Is the backend running?");
  const user = me.data;

  const [employee, tenant, team] = await Promise.all([
    user.employeeId ? serverFetch<Employee>("/employees/me", token) : Promise.resolve({ status: 404, data: undefined }),
    serverFetch<Tenant>("/tenant", token),
    user.employeeId ? serverFetch<Employee[]>("/employees/me/team", token) : Promise.resolve({ status: 404, data: [] }),
  ]);
  if (!tenant.data) throw new Error("Could not load your company details from the HRMS API.");

  const isHr = user.roles.includes("HR_ADMIN");
  const session: Session = {
    user,
    employee: employee.data ?? null,
    tenant: tenant.data,
    isHr,
    isApprover: isHr || user.roles.includes("MANAGER") || (team.data?.length ?? 0) > 0,
    displayName: employee.data?.fullName ?? user.email,
  };

  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </SessionProvider>
  );
}
