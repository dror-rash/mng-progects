// Shared by the deploy's database scripts (task 068). They read catalogs in databases that PR migrations can
// write to (app_preview, as preview_owner), and some run as main's owner login. A function or operator
// planted in `public` must never run in their place, so every connection:
//   - starts with search_path pinned to pg_catalog, pg_temp (startup option), and pins it again before its
//     first query (pinSearchPath), in case a caller passes another client;
//   - calls catalog functions schema-qualified (pg_catalog.…) in the scripts themselves.
// pg_temp is never searched for functions or operators, and listing it last keeps temp tables from
// shadowing anything.
import { createRequire } from "node:module";

/** `pg` is a dependency of @repo/db, not of the repo root: resolve it from there. */
export const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");

export const PINNED_SEARCH_PATH = "pg_catalog, pg_temp";

/** `config` with the pinned search_path added to its startup options (keeps `-c role=…`). */
export function withPinnedSearchPath(config) {
  const pin = "-c search_path=pg_catalog,pg_temp";
  return { ...config, options: config.options ? `${config.options} ${pin}` : pin };
}

/** Pins search_path on an open client (session level; inside a transaction, until it ends). */
export async function pinSearchPath(client) {
  await client.query("select pg_catalog.set_config('search_path', $1, false)", [PINNED_SEARCH_PATH]);
}
