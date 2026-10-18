type OriginInput = {
  configured?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  fallbackOrigin: string;
};

const first = (value?: string | null) => value?.split(",")[0]?.trim() || undefined;

export function resolvePublicOrigin({ configured, forwardedHost, forwardedProto, fallbackOrigin }: OriginInput): string {
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // ignore a malformed value and fall through
    }
  }
  const host = first(forwardedHost);
  if (host) {
    const proto = first(forwardedProto);
    const scheme = proto === "http" || proto === "https" ? proto : new URL(fallbackOrigin).protocol.replace(":", "");
    return `${scheme}://${host}`;
  }
  return fallbackOrigin;
}
/** Only allow same-origin relative paths as post-login targets (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function loginUrl(next: string, loginPath = "/login"): string {
  return `${loginPath}?next=${encodeURIComponent(next)}`;
}
