import { NextResponse, type NextRequest } from "next/server";

// Middleware runs on the Edge before the page renders. It can't reach the
// database, so it only does the cheap check: "is there a session cookie at
// all?" The real check (is that session valid, does this user own this
// project?) happens on the server in lib/auth.ts. This is just a fast
// redirect for logged-out visitors, not the security boundary.

const SESSION_COOKIE = "shiplog_session";

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
