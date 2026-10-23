/**
 * Better Auth rate-limits sign-up/sign-in in production. Acceptance tests run production builds and
 * sign up many accounts from one IP, so the test servers (only) set AUTH_DISABLE_RATE_LIMIT=true.
 * Never set it in a deployed environment.
 */
export function rateLimitOptions(env: Record<string, string | undefined>): { rateLimit?: { enabled: false } } {
  return env.AUTH_DISABLE_RATE_LIMIT === "true" ? { rateLimit: { enabled: false } } : {};
}
