import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["features/**/*.test.{ts,tsx}"],
    // Logic tests run in Node; component tests opt into jsdom with `// @vitest-environment jsdom`.
    setupFiles: ["./vitest.setup.ts"],
  },
});
