"use client";

import type { ReactNode } from "react";
import { useSession } from "./session";
import { Alert } from "./ui";

/** Hides HR pages from other roles. The API enforces the same rule on every request. */
export function HrOnly({ children }: { children: ReactNode }) {
  const { isHr } = useSession();
  if (!isHr) return <Alert>This page is only available to HR admins.</Alert>;
  return <>{children}</>;
}
