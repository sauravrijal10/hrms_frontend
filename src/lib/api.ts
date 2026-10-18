"use client";

import { useCallback, useEffect, useState } from "react";

/** An RFC 7807 problem returned by the API, with per-field validation messages when present. */
export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError(e instanceof Error ? e.message : "Something went wrong", 0);
}

export type Query = Record<string, string | number | boolean | null | undefined>;

export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
}

async function readProblem(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  let fieldErrors: Record<string, string> = {};
  try {
    const problem = await res.json();
    message = problem.detail || problem.title || message;
    if (problem.errors && typeof problem.errors === "object") fieldErrors = problem.errors;
  } catch {
    // not JSON; keep the generic message
  }
  if (res.status === 403 && message === `Request failed (403)`) {
    message = "You do not have permission to perform this action";
  }
  return new ApiError(message, res.status, fieldErrors);
}

/** Calls the Spring API through our same-origin proxy (/api/backend/* -> /api/v1/*). */
export async function api<T = void>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const res = await fetch(`/api/backend${withQuery(path, opts.query)}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) {
    // A route handler that clears the httpOnly cookie, not a page, so a full navigation is needed.
    window.location.assign(
      path.startsWith("/platform/") ? "/api/platform-auth/logout?reason=expired" : "/api/auth/logout?reason=expired",
    );
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }
  if (!res.ok) throw await readProblem(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Loads `path` and reloads whenever it (or the query) changes. Previous data stays visible while
 * a new request is in flight, so tables don't flash empty when paging or filtering.
 */
export function useApi<T>(path: string | null, query?: Query) {
  const key = path ? withQuery(path, query) : null;
  const [state, setState] = useState<{ key: string | null; data?: T; error?: ApiError }>({ key: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    api<T>(key).then(
      (data) => !cancelled && setState({ key, data }),
      (error) => !cancelled && setState((s) => ({ key, data: s.data, error: toApiError(error) })),
    );
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = state.key === key;

  return {
    data: state.data,
    error: current ? state.error : undefined,
    loading: key !== null && !current,
    reload,
  };
}
