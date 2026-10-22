import { NextResponse, type NextRequest } from "next/server";
import { API_URL, PLATFORM_TOKEN_COOKIE, TOKEN_COOKIE } from "@/lib/config";
import { problem } from "@/lib/server";

/**
 * Same-origin proxy: /api/backend/<path> -> {HRMS_API_URL}/api/v1/<path>, adding the JWT from the
 * httpOnly cookie as a Bearer token. /platform/* calls use the super user cookie, everything else
 * the tenant cookie. The cookies are SameSite=Lax, so other sites can't make state-changing
 * requests with them.
 */
async function forward(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = `${API_URL}/api/v1/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers({ Accept: "application/json" });
  const token = request.cookies.get(path[0] === "platform" ? PLATFORM_TOKEN_COOKIE : TOKEN_COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let res: Response;
  try {
    res = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? (await request.text()) || undefined : undefined,
      cache: "no-store",
    });
  } catch {
    return problem(502, "The HRMS API is not reachable. Is the backend running?");
  }

  const body = res.status === 204 || res.status === 304 ? null : await res.arrayBuffer();
  const out = new Headers();
  // Content-Disposition carries the file name of downloads (payslip PDFs, CSV exports).
  for (const name of ["Content-Type", "Content-Disposition"]) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  return new NextResponse(body, { status: res.status, headers: out });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
