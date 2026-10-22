"use client";

import { ApiError } from "./api";

/**
 * Downloads a file from the API (through our proxy, so the session cookie is used) and saves it
 * under the name the API suggests in Content-Disposition, or `fallbackName`.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`/api/backend${path}`, { cache: "no-store" });
  if (!res.ok) {
    const p = await res.json().catch(() => ({}));
    throw new ApiError(p.detail || `Download failed (${res.status})`, res.status);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
