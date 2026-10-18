import { describe, expect, it } from "vitest";

import { buildPoolConfig } from "./pool-config";

describe("buildPoolConfig", () => {
  it("uses DATABASE_URL for local development", () => {
    const config = buildPoolConfig({ DATABASE_URL: "postgres://u:p@localhost:5432/app" });

    expect(config.connectionString).toBe("postgres://u:p@localhost:5432/app");
  });

  it("uses the Cloud SQL unix socket when a connection name is set", () => {
    const config = buildPoolConfig({
      CLOUD_SQL_CONNECTION_NAME: "proj:region:db",
      DB_USER: "app",
      DB_PASSWORD: "secret",
      DB_NAME: "app",
    });

    expect(config).toMatchObject({ host: "/cloudsql/proj:region:db", user: "app", database: "app" });
  });

  it("prefers Cloud SQL over DATABASE_URL when both are present", () => {
    const config = buildPoolConfig({
      DATABASE_URL: "postgres://u:p@localhost:5432/app",
      CLOUD_SQL_CONNECTION_NAME: "proj:region:db",
      DB_USER: "app",
      DB_PASSWORD: "secret",
      DB_NAME: "app",
    });

    expect(config.connectionString).toBeUndefined();
    expect(config.host).toBe("/cloudsql/proj:region:db");
  });

  it("explains what is missing for Cloud SQL", () => {
    expect(() => buildPoolConfig({ CLOUD_SQL_CONNECTION_NAME: "proj:region:db" })).toThrow(/DB_USER, DB_PASSWORD and DB_NAME/);
  });

  it("fails clearly when nothing is configured", () => {
    expect(() => buildPoolConfig({})).toThrow(/DATABASE_URL/);
  });
});
