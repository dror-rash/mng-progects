import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { loginUrl, resolvePublicOrigin } from "./redirect";

export function redirectToLoginIfNoSession(request: NextRequest, loginPath = "/login") {
  if (getSessionCookie(request)) return NextResponse.next();

  const { basePath, pathname, search } = request.nextUrl;
  const origin = resolvePublicOrigin({
    configured: process.env.BETTER_AUTH_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    fallbackOrigin: request.nextUrl.origin,
  });

  return NextResponse.redirect(new URL(loginUrl(`${basePath}${pathname}${search}`, loginPath), origin));
}