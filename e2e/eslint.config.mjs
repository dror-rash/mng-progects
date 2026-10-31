import config, { restrictedImports } from "@repo/config/eslint.mjs";

export default [
  ...config,
  // Fixtures write past row-level security through the maintenance connection.
  { files: ["**/*.{ts,tsx}"], rules: restrictedImports({ allowMaintenance: true }) },
];
