import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { customerLabelOf } from "./customer-label";
import { insertSiteOf } from "./db-test-fixtures";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// `customerLabelOf` (task 071): a record's customer label from the `customer_name` view, read for that one
// customer. `customer_name` is a security-barrier view, so a join on it can't use the record's customer id:
// it checks `can_see_customer_name` on every customer in the database first (about a second for ~9k
// customers, which made a partner's project page slow enough to show blank after Cancel or Reopen).

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  admin: `${run}-admin`,
  parent: `${run}-parent`,
  sub: `${run}-sub`,
  project: `${run}-project`,
};
/** Other customers in the workspace, enough that reading all of them shows. */
const OTHERS = 500;

type PlanNode = {
  "Relation Name"?: string;
  Alias?: string;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Rows Removed by Filter"?: number;
  Plans?: PlanNode[];
};

/** How many `organization` rows the plan read as the view's customer (`o`), kept or filtered out. */
function customersRead(node: PlanNode): number {
  const own =
    node["Relation Name"] === "organization" && node.Alias === "o"
      ? ((node["Actual Rows"] ?? 0) + (node["Rows Removed by Filter"] ?? 0)) * (node["Actual Loops"] ?? 1)
      : 0;
  return own + (node.Plans ?? []).reduce((n, child) => n + customersRead(child), 0);
}

const labelQuery = () =>
  getDb()
    .select({ label: customerLabelOf(schema.project.organizationId, schema.project.workspaceId) })
    .from(schema.project)
    .where(eq(schema.project.id, ids.project));

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values({ id: ids.admin, name: "Admin", email: `${ids.admin}@example.test` });
  await db.insert(schema.workspace).values({ id: ids.workspace, name: `Customer label ${run}` });
  await db.insert(schema.workspaceMember).values({ workspaceId: ids.workspace, userId: ids.admin, role: "admin" });
  await db.insert(schema.organization).values({ id: ids.parent, workspaceId: ids.workspace, name: "Acme Ltd" });
  await db.insert(schema.organization).values({ id: ids.sub, workspaceId: ids.workspace, name: "Acme Retail", parentId: ids.parent });
  await db.execute(
    sql`insert into organization (id, workspace_id, name)
        select ${run} || '-other-' || n, ${ids.workspace}, 'Other ' || n from generate_series(1, ${OTHERS}) n`,
  );
  const siteId = await insertSiteOf(ids.workspace, ids.sub);
  await db.insert(schema.project).values({
    id: ids.project,
    name: "Store wiring",
    workspaceId: ids.workspace,
    organizationId: ids.sub,
    siteId,
  });
  await db.execute(sql`analyze organization`);
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id = ${ids.workspace}`);
  await db.execute(sql`delete from "user" where id = ${ids.admin}`);
});

describe("customerLabelOf", () => {
  it("gives the customer's label, with its parent for a sub-company", async () => {
    const rows = await withAccess(ids.admin, () => labelQuery());
    expect(rows).toEqual([{ label: "Acme Ltd › Acme Retail" }]);
  });

  it("reads only that customer, not every customer the view could show", async () => {
    const plan = await withAccess(ids.admin, () =>
      getDb().execute<{ "QUERY PLAN": [{ Plan: PlanNode }] }>(sql`explain (analyze, format json) ${labelQuery().getSQL()}`),
    );
    expect(customersRead(plan.rows[0]!["QUERY PLAN"][0].Plan)).toBe(1);
  });
});
