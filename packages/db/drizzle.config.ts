import { defineConfig } from "drizzle-kit";

// Used by `pnpm db:generate | db:migrate | db:push`. Migrations are SQL files in ./migrations.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
