import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_TOKEN_COOKIE } from "@/lib/config";

function signOut(request: NextRequest) {
  const url = new URL("/platform/login", request.url);
  if (request.nextUrl.searchParams.get("reason") === "expired") url.searchParams.set("expired", "1");
  const response = NextResponse.redirect(url, 303);
  response.cookies.delete(PLATFORM_TOKEN_COOKIE);
  return response;
}

export const GET = signOut;
export const POST = signOut;
