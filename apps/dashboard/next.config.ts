import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(path.join(__dirname, "../../"), process.env.NODE_ENV !== "production", undefined, true);

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@repo/ui", "@repo/auth", "@repo/db"],
  // basePath puts pages AND assets (/dashboard/_next/...) under one prefix, so the shell
  // only needs a single rewrite pair and assets never collide with other zones.
  basePath: "/dashboard",
};

export default config;
