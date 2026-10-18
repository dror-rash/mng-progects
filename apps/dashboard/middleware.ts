import { redirectToLoginIfNoSession } from "@repo/auth/middleware";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return redirectToLoginIfNoSession(request);
}

// Paths are relative to this zone's basePath: "/" is served at /dashboard.
export const config = { matcher: ["/", "/:path*"] };
