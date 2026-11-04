// The guard and the kept-account rule of `scripts/reset-local.ts` (task 071): pure, so they are unit tested.

/** The environment variables the guard reads. */
export type ResetEnv = { DATABASE_URL?: string; CLOUD_SQL_CONNECTION_NAME?: string; NODE_ENV?: string };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Whether `env` points at a local database the reset may wipe: `DATABASE_URL` is set and its host is
 * localhost, 127.0.0.1 or ::1 (lane databases included), Cloud SQL isn't configured and this isn't
 * production. Otherwise says why.
 */
export function isLocalDatabase(env: ResetEnv): { local: true } | { local: false; reason: string } {
  if (env.NODE_ENV === "production") return { local: false, reason: "NODE_ENV is production." };
  if (env.CLOUD_SQL_CONNECTION_NAME) {
    return { local: false, reason: "CLOUD_SQL_CONNECTION_NAME is set: this is a deployed database." };
  }
  if (!env.DATABASE_URL) return { local: false, reason: "DATABASE_URL is not set." };
  let host: string;
  try {
    // `[::1]` comes back with its brackets.
    host = new URL(env.DATABASE_URL).hostname.replace(/^\[(.*)\]$/, "$1");
  } catch {
    return { local: false, reason: "DATABASE_URL is not a valid URL." };
  }
  if (!LOCAL_HOSTS.has(host)) {
    return { local: false, reason: `DATABASE_URL points at "${host}", not at localhost.` };
  }
  return { local: true };
}

/** Whether `email` is an e2e test account (`@example.com`, any case), which the reset deletes. */
export function isTestAccount(email: string) {
  return email.trim().toLowerCase().endsWith("@example.com");
}
