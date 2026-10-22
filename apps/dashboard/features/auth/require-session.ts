import { loginUrl, resolvePublicOrigin } from "@repo/auth/redirect";
import { getSession } from "@repo/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const BASE_PATH = "/dashboard";

/**
 * Returns the session, or sends the visitor to the shell's login page and back to `path` afterwards.
 * Redirects to an absolute URL: `redirect("/login")` would get this zone's basePath (`/dashboard/login`).
 */
export async function requireSession(path: string) {
  const session = await getSession();
  if (session) return session;

  const h = await headers();
  const origin = resolvePublicOrigin({
    configured: process.env.BETTER_AUTH_URL,
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    fallbackOrigin: `http://${h.get("host") ?? "localhost"}`,
  });
  redirect(new URL(loginUrl(`${BASE_PATH}${path === "/" ? "" : path}`), origin).toString());
}
