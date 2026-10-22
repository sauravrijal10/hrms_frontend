import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getToken, serverFetch } from "@/lib/server";
import type { AuthUser } from "@/lib/types";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

/** Where users land after signing in with a password someone else chose (see the app layout). */
export default async function ChangePasswordPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const me = await serverFetch<AuthUser>("/auth/me", token);
  if (me.status === 401) redirect("/api/auth/logout?reason=expired");
  if (!me.data) throw new Error("The HRMS API is not reachable. Is the backend running?");
  if (!me.data.passwordChangeRequired) redirect("/dashboard");

  return <ChangePasswordForm email={me.data.email} />;
}
