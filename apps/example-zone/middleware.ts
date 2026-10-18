import { redirectToLoginIfNoSession } from "@repo/auth/middleware";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return redirectToLoginIfNoSession(request);
}

// Paths are relative to this zone's basePath: "/account" is served at /example/account.
export const config = { matcher: ["/account/:path*"] };
