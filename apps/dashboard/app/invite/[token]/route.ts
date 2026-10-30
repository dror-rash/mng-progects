import { resolvePublicOrigin } from "@repo/auth/redirect";
import { NextResponse, type NextRequest } from "next/server";

import { stashInviteToken } from "@/features/workspaces/invite-token";

/**
 * Where an invite link lands. It moves the token into a short-lived cookie and continues at /invite,
 * so the token never ends up in a login URL's `next=`, the address bar or a `Referer` (task 028).
 * Signed-out visitors are let through by the middleware; the invite page sends them to log in.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = resolvePublicOrigin({
    configured: process.env.BETTER_AUTH_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    fallbackOrigin: request.nextUrl.origin,
  });
  // Absolute and with the zone's basePath: `request.nextUrl.basePath` is empty in a route handler.
  const response = NextResponse.redirect(new URL("/dashboard/invite", origin), 303);
  stashInviteToken(response.cookies, token);
  return response;
}
