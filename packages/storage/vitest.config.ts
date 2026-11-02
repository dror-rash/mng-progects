import { defineConfig } from "vitest/config";

// Unit tests; the storage tests (`*.storage.test.ts`) need the local server and run with `pnpm test:storage`.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], exclude: ["src/**/*.storage.test.ts"] },
});
