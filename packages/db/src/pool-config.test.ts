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

  it("connects as the runtime role app_user, so row-level security applies, locally", () => {
    const config = buildPoolConfig({ DATABASE_URL: "postgres://u:p@localhost:5432/app" });

    expect(config.options).toBe("-c role=app_user");
  });

  it("connects as the runtime role app_user on Cloud SQL too", () => {
    const config = buildPoolConfig({
      CLOUD_SQL_CONNECTION_NAME: "proj:region:db",
      DB_USER: "app",
      DB_PASSWORD: "secret",
      DB_NAME: "app",
    });

    expect(config.options).toBe("-c role=app_user");
  });

  it("connects as the login user itself for maintenance (no role)", () => {
    const local = buildPoolConfig({ DATABASE_URL: "postgres://u:p@localhost:5432/app" }, null);
    const cloud = buildPoolConfig(
      { CLOUD_SQL_CONNECTION_NAME: "proj:region:db", DB_USER: "app", DB_PASSWORD: "secret", DB_NAME: "app" },
      null,
    );

    expect(local.options).toBeUndefined();
    expect(cloud.options).toBeUndefined();
  });

  it("explains what is missing for Cloud SQL", () => {
    expect(() => buildPoolConfig({ CLOUD_SQL_CONNECTION_NAME: "proj:region:db" })).toThrow(/DB_USER, DB_PASSWORD and DB_NAME/);
  });

  it("fails clearly when nothing is configured", () => {
    expect(() => buildPoolConfig({})).toThrow(/DATABASE_URL/);
  });
});
