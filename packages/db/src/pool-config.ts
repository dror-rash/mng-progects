import type { PoolConfig } from "pg";

type Env = Record<string, string | undefined>;

/**
 * Cloud Run: Cloud SQL is mounted as a unix socket at /cloudsql/<connection-name>.
 * Local/CI: a plain DATABASE_URL.
 */
export function buildPoolConfig(env: Env): PoolConfig {
  const connectionName = env.CLOUD_SQL_CONNECTION_NAME;

  if (connectionName) {
    const { DB_USER, DB_PASSWORD, DB_NAME } = env;
    if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
      throw new Error("CLOUD_SQL_CONNECTION_NAME is set, so DB_USER, DB_PASSWORD and DB_NAME are required.");
    }
    return { host: `/cloudsql/${connectionName}`, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, max: 5 };
  }

  if (env.DATABASE_URL) {
    return { connectionString: env.DATABASE_URL, max: 5 };
  }

  throw new Error("Set DATABASE_URL (local/CI) or CLOUD_SQL_CONNECTION_NAME + DB_USER/DB_PASSWORD/DB_NAME (Cloud Run).");
}
