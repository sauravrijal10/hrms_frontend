import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_TOKEN_COOKIE, TOKEN_COOKIE } from "@/lib/config";

const PUBLIC_PATHS = ["/login", "/register", "/platform/login"];

/**
 * Optimistic check only: visitors without the right session cookie go to the matching login page.
 * /platform/* is the super user console; everything else is the company (tenant) app.
 * The layouts verify the tokens with the API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const platform = pathname === "/platform" || pathname.startsWith("/platform/");
  if (request.cookies.has(platform ? PLATFORM_TOKEN_COOKIE : TOKEN_COOKIE)) return NextResponse.next();

  const url = new URL(platform ? "/platform/login" : "/login", request.url);
  if (pathname !== "/" && pathname !== "/platform") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
