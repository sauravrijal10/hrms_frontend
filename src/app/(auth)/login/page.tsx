import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  // Only allow same-site relative paths, never "//evil.com".
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return <LoginForm next={safeNext} expired={params.expired === "1"} />;
}
