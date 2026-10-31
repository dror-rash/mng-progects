import type { PoolConfig } from "pg";

type Env = Record<string, string | undefined>;

/**
 * The role the app's queries run as (ADR-0006): it owns nothing and can't bypass row-level security.
 * The login user (the owner, which runs migrations) is a member of it, so it can switch on connect.
 */
export const RUNTIME_ROLE = "app_user";

/** The part of a pg client `assertRole` needs. */
type Queryable = { query(text: string): Promise<{ rows: Array<Record<string, unknown>> }> };

/**
 * Throws unless the connection runs as `role`. Row-level security isn't forced (ADR-0006): the login user
 * owns the tables and bypasses it, so a connection where the startup option didn't switch the role must
 * never serve a query. The pool calls it on every new connection (`onConnect`); when it throws, the
 * connection is closed and the checkout fails (fail closed).
 */
export async function assertRole(client: Queryable, role: string): Promise<void> {
  const { rows } = await client.query("select current_user as role");
  const actual = rows[0]?.role;
  if (actual !== role) {
    throw new Error(`Refusing a database connection running as ${JSON.stringify(actual)}, not ${role} (ADR-0006).`);
  }
}

/**
 * Cloud Run: Cloud SQL is mounted as a unix socket at /cloudsql/<connection-name>.
 * Local/CI: a plain DATABASE_URL.
 * Every connection switches to `role` on connect and is checked before its first query (`assertRole`);
 * `null` keeps the login user (the maintenance connection), unchecked.
 */
export function buildPoolConfig(env: Env, role: string | null = RUNTIME_ROLE): PoolConfig {
  const asRole: PoolConfig = role ? { options: `-c role=${role}`, onConnect: (client) => assertRole(client, role) } : {};
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
