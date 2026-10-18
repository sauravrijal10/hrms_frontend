"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";

/** Posts JSON to one of our /api/auth/* route handlers and does a full navigation on success. */
export function useAuthSubmit(endpoint: string, redirectTo: string) {
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent, body: unknown) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new ApiError(p.detail || p.title || `Request failed (${res.status})`, res.status, p.errors ?? {});
      }
      // Full navigation so the server layout picks up the new cookie.
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Could not reach the server", 0));
      setSubmitting(false);
    }
  }

  return { error, submitting, submit };
}
