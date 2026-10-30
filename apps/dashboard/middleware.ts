import { redirectToLoginIfNoSession } from "@repo/auth/middleware";
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // An invite link first moves its token into a cookie (app/invite/[token]/route.ts), so that a
  // signed-out visitor's login URL gets `next=/dashboard/invite`, never the token.
  if (request.nextUrl.pathname.startsWith("/invite/")) return NextResponse.next();
  return redirectToLoginIfNoSession(request);
}

// Paths are relative to this zone's basePath: "/" is served at /dashboard.
export const config = { matcher: ["/", "/:path*"] };
