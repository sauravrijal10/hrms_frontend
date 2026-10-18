import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, COOKIE_SECURE, PLATFORM_TOKEN_COOKIE, TOKEN_COOKIE } from "./config";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

export async function getPlatformToken(): Promise<string | undefined> {
  return (await cookies()).get(PLATFORM_TOKEN_COOKIE)?.value;
}

/** Server-side call to the Spring API. status 0 means the API could not be reached. */
export async function serverFetch<T>(path: string, token?: string): Promise<{ status: number; data?: T }> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return { status: res.status };
    return { status: res.status, data: (await res.json()) as T };
  } catch {
    return { status: 0 };
  }
}

export function problem(status: number, detail: string) {
  return NextResponse.json({ status, detail }, { status, headers: { "Content-Type": "application/problem+json" } });
}

/**
 * Forwards a login/register call to the API. On success the token goes into an httpOnly cookie
 * and everything except the token is returned to the browser.
 */
export async function authenticate(
  path: string,
  body: string,
  cookieName: string = TOKEN_COOKIE,
): Promise<NextResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return problem(502, "The HRMS API is not reachable. Is the backend running?");
  }

  if (!res.ok) {
    return new NextResponse(await res.text(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/problem+json" },
    });
  }

  const auth = (await res.json()) as Record<string, unknown> & { accessToken: string; expiresInSeconds: number };
  const { accessToken, expiresInSeconds } = auth;
  const publicFields = Object.fromEntries(
    Object.entries(auth).filter(([k]) => !["accessToken", "expiresInSeconds", "tokenType"].includes(k)),
  );
  const response = NextResponse.json(publicFields);
  response.cookies.set(cookieName, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: expiresInSeconds,
  });
  return response;
}
