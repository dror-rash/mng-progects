import type { PoolConfig } from "pg";

type Env = Record<string, string | undefined>;

/**
 * The role the app's queries run as (ADR-0006): it owns nothing and can't bypass row-level security.
 * The login user (the owner, which runs migrations) is a member of it, so it can switch on connect.
 */
export const RUNTIME_ROLE = "app_user";

/**
 * Cloud Run: Cloud SQL is mounted as a unix socket at /cloudsql/<connection-name>.
 * Local/CI: a plain DATABASE_URL.
 * Every connection switches to `role` on connect; `null` keeps the login user (the maintenance connection).
 */
export function buildPoolConfig(env: Env, role: string | null = RUNTIME_ROLE): PoolConfig {
  const asRole = role ? { options: `-c role=${role}` } : {};
  const connectionName = env.CLOUD_SQL_CONNECTION_NAME;

  if (connectionName) {
    const { DB_USER, DB_PASSWORD, DB_NAME } = env;
    if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
      throw new Error("CLOUD_SQL_CONNECTION_NAME is set, so DB_USER, DB_PASSWORD and DB_NAME are required.");
    }
    return { host: `/cloudsql/${connectionName}`, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, max: 5, ...asRole };
  }

  if (env.DATABASE_URL) {
    return { connectionString: env.DATABASE_URL, max: 5, ...asRole };
  }

  throw new Error("Set DATABASE_URL (local/CI) or CLOUD_SQL_CONNECTION_NAME + DB_USER/DB_PASSWORD/DB_NAME (Cloud Run).");
}
