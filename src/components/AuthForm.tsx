"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";

/**
 * Posts JSON to one of our /api/auth/* route handlers, which keep the token in an httpOnly cookie.
 * Throws an ApiError (with field messages) when the API refuses.
 */
export async function postAuth(endpoint: string, body: unknown): Promise<void> {
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the server", 0);
  }
  if (!res.ok) {
    const p = await res.json().catch(() => ({}));
    throw new ApiError(p.detail || p.title || `Request failed (${res.status})`, res.status, p.errors ?? {});
  }
}

/** Posts to one of our /api/auth/* route handlers and does a full navigation on success. */
export function useAuthSubmit(endpoint: string, redirectTo: string) {
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent, body: unknown) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postAuth(endpoint, body);
      // Full navigation so the server layout picks up the new cookie.
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Could not reach the server", 0));
      setSubmitting(false);
    }
  }

  return { error, submitting, submit };
}
