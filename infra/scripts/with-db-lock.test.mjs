// Tests for with-db-lock.mjs (task 068) against the database in DATABASE_URL.
// Run: node --experimental-strip-types --test infra/scripts/with-db-lock.test.mjs
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const script = fileURLToPath(new URL("./with-db-lock.mjs", import.meta.url));
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL.");

const run = (args) =>
  promisify(execFile)(process.execPath, ["--experimental-strip-types", "--no-warnings", script, ...args], {
    env: { PATH: process.env.PATH, DATABASE_URL: process.env.DATABASE_URL },
  });

// A child that logs its start and end to `log`, with a pause between.
const child = (log, name) => [
  process.execPath,
  "-e",
  `const fs = require("fs"); fs.appendFileSync(${JSON.stringify(log)}, "${name} start\\n");
   setTimeout(() => fs.appendFileSync(${JSON.stringify(log)}, "${name} end\\n"), 400);`,
];

test("runs two commands under the same lock one after the other", async () => {
  const log = join(mkdtempSync(join(tmpdir(), "db-lock-")), "log");
  await Promise.all([run(["role-check-lock", "--", ...child(log, "a")]), run(["role-check-lock", "--", ...child(log, "b")])]);
  const lines = readFileSync(log, "utf8").trim().split("\n");
  assert.equal(lines.length, 4);
  assert.equal(lines[0].split(" ")[0], lines[1].split(" ")[0], `interleaved: ${lines.join(", ")}`);
  assert.deepEqual(lines.map((line) => line.split(" ")[1]), ["start", "end", "start", "end"]);
});

test("exits with the command's exit code", async () => {
  await assert.rejects(run(["role-check-lock", "--", process.execPath, "-e", "process.exit(3)"]), (error) => error.code === 3);
});
