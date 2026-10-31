import { defineConfig } from "vitest/config";

// Database tests (`*.db.test.ts`): run against the migrated database in DATABASE_URL (`pnpm test:db`).
export default defineConfig({
  test: { include: ["src/**/*.db.test.ts"], fileParallelism: false },
});
