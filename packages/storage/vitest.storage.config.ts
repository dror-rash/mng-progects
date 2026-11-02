import { defineConfig } from "vitest/config";

// Storage tests (`*.storage.test.ts`): run against the local fake-gcs-server (`pnpm db:up`) in STORAGE_EMULATOR_HOST.
export default defineConfig({
  test: { include: ["src/**/*.storage.test.ts"], fileParallelism: false },
});
