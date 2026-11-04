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
  partnerUser: `${run}-partner-user`,
  worker: `${run}-worker`,
  partner: `${run}-partner`,
  parent: `${run}-parent`,
  sub: `${run}-sub`,
  /** Assigned to the partner, with no crew project. */
  assigned: `${run}-assigned`,
  /** Deleted (soft). */
  deleted: `${run}-deleted`,
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

/** The label `userId` reads for the customer `organizationId` in the workspace. */
async function labelAs(userId: string, organizationId: string) {
  const { rows } = await withAccess(userId, () =>
    getDb().execute<{ label: string | null }>(sql`select ${customerLabelOf(sql`${organizationId}`, sql`${ids.workspace}`)} as label`),
  );
  return rows[0]!.label;
}

const labelQuery = () =>
  getDb()
    .select({ label: customerLabelOf(schema.project.organizationId, schema.project.workspaceId) })
    .from(schema.project)
    .where(eq(schema.project.id, ids.project));

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(
    [ids.admin, ids.partnerUser, ids.worker].map((id) => ({ id, name: id, email: `${id}@example.test` })),
  );
  await db.insert(schema.workspace).values({ id: ids.workspace, name: `Customer label ${run}` });
  await db.insert(schema.partner).values({ id: ids.partner, workspaceId: ids.workspace, name: "Northwind" });
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.partnerUser, role: "partner", partnerId: ids.partner },
    { workspaceId: ids.workspace, userId: ids.worker, role: "worker" },
  ]);
  await db.insert(schema.organization).values({ id: ids.parent, workspaceId: ids.workspace, name: "Acme Ltd" });
  await db.insert(schema.organization).values({ id: ids.sub, workspaceId: ids.workspace, name: "Acme Retail", parentId: ids.parent });
  await db.insert(schema.organization).values([
    { id: ids.assigned, workspaceId: ids.workspace, name: "Initech" },
    { id: ids.deleted, workspaceId: ids.workspace, name: "Gone Co", deletedAt: new Date() },
  ]);
  await db.insert(schema.customerPartner).values({ organizationId: ids.assigned, partnerId: ids.partner, workspaceId: ids.workspace });
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
  // The worker is on the crew of the project for Acme Retail, so they read that customer's name only.
  await db.insert(schema.projectWorker).values({ projectId: ids.project, userId: ids.worker, workspaceId: ids.workspace });
  await db.execute(sql`analyze organization`);
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id = ${ids.workspace}`);
  await db.execute(sql`delete from "user" where id in (${ids.admin}, ${ids.partnerUser}, ${ids.worker})`);
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
    // A join on the view reads all of them (and every other workspace's); the lookup reads about one.
    expect(customersRead(plan.rows[0]!["QUERY PLAN"][0].Plan)).toBeLessThan(OTHERS / 10);
  });

  it("is null for a partner, for a customer not assigned to their partner", async () => {
    expect(await labelAs(ids.partnerUser, ids.assigned)).toBe("Initech");
    expect(await labelAs(ids.partnerUser, ids.parent)).toBeNull();
  });

  it("is null for a worker, for a customer with no project of their crews", async () => {
    expect(await labelAs(ids.worker, ids.sub)).toBe("Acme Ltd › Acme Retail");
    expect(await labelAs(ids.worker, ids.assigned)).toBeNull();
  });

  it("is null for a deleted customer, even for an admin", async () => {
    expect(await labelAs(ids.admin, ids.assigned)).toBe("Initech");
    expect(await labelAs(ids.admin, ids.deleted)).toBeNull();
  });
});
