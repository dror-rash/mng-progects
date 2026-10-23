import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "../docs/features/*.feature",
  featuresRoot: "../docs/features",
  steps: "./steps/*.ts",
  // Specs written ahead of their task carry @wip; the tag comes off when the task starts (WORKFLOW.md).
  tags: process.env.E2E_TAGS ?? "not @wip",
});

// Locally: dev servers. In CI: the workflow builds first, then we run `start`.
const mode = process.env.CI ? "start" : "dev";

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // flaky tests are bugs; fix them
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Set BASE_URL to run against a preview deploy and skip local servers.
  webServer: process.env.BASE_URL
    ? undefined
    : [
        // The shell owns /api/auth. Every scenario signs up from one IP, which production rate limits would block.
        { command: `pnpm --filter @repo/shell ${mode}`, url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000, env: { AUTH_DISABLE_RATE_LIMIT: "true" } },
        { command: `pnpm --filter @repo/example-zone ${mode}`, url: "http://localhost:3001/example", reuseExistingServer: !process.env.CI, timeout: 120_000 },
        { command: `pnpm --filter @repo/dashboard ${mode}`, url: "http://localhost:3002/dashboard", reuseExistingServer: !process.env.CI, timeout: 120_000 },
      ],
});
