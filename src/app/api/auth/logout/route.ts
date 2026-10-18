import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE } from "@/lib/config";

function signOut(request: NextRequest) {
  const url = new URL("/login", request.url);
  if (request.nextUrl.searchParams.get("reason") === "expired") url.searchParams.set("expired", "1");
  const response = NextResponse.redirect(url, 303);
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}

// GET is used when the session expires (server components can't clear cookies themselves).
export const GET = signOut;
export const POST = signOut;
