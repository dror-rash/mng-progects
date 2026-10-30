import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

// `import.meta.dirname` is undefined when Storybook loads this file on Node 22 (CI); derive it from the URL.
const dashboard = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../apps/dashboard");

const config: StorybookConfig = {
  // Zone components that are too app-specific for this package still get stories here, beside the primitives.
  stories: ["../src/**/*.stories.@(ts|tsx)", "../../../apps/dashboard/features/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    config.resolve = { ...config.resolve, alias: { ...config.resolve?.alias, "@": dashboard } };
    // The dashboard's tsconfig keeps JSX for Next ("preserve"); compile it with the automatic runtime here.
    config.esbuild = { ...config.esbuild, jsx: "automatic" };
    return config;
  },
};

export default config;
