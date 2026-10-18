import type { Metadata } from "next";
import { PlatformLoginForm } from "./PlatformLoginForm";

export const metadata: Metadata = { title: "Platform sign in" };

export default async function PlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  // Only allow paths inside the platform console.
  const safeNext = next.startsWith("/platform") && !next.startsWith("//") ? next : "/platform";
  return <PlatformLoginForm next={safeNext} expired={params.expired === "1"} />;
}
