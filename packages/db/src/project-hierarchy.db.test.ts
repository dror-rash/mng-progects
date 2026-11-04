import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { errorCode, FOREIGN_KEY, insertCustomerWithSite, NOT_NULL } from "./db-test-fixtures";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Every project has a customer and one of its sites (task 071, ADR-0008), against the migrated database:
// the columns are required, a customer or site in use can't be hard-deleted, and deleting a workspace
// still takes everything with it.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  doomed: `${run}-doomed`,
  acme: `${run}-acme`,
  project: `${run}-project`,
};
let acmeSite = "";

const insertProject = (id: string, workspaceId: string, organizationId: string | null, siteId: string | null) =>
  sql`insert into project (id, name, workspace_id, organization_id, site_id)
      values (${id}, 'Project', ${workspaceId}, ${organizationId}, ${siteId})`;

/** Whether a row with the id `id` is still in `table`. */
async function exists(table: "project" | "site" | "organization" | "task", id: string) {
  const { rows } = await getMaintenanceDb().execute(sql`select 1 from ${sql.identifier(table)} where id = ${id}`);
  return rows.length > 0;
}

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.workspace).values([
    { id: ids.workspace, name: `Project hierarchy ${run}` },
    { id: ids.doomed, name: `Project hierarchy doomed ${run}` },
  ]);
  acmeSite = (await insertCustomerWithSite(ids.workspace, ids.acme, "Acme Ltd")).siteId;
  await db.execute(insertProject(ids.project, ids.workspace, ids.acme, acmeSite));
});

afterAll(async () => {
  await getMaintenanceDb().execute(sql`delete from workspace where id in (${ids.workspace}, ${ids.doomed})`);
});

describe("a project's customer and site", () => {
  // The columns' NOT NULL refuses them (23502): project_site_check leaves a missing customer or site to it.
  it("are both required", async () => {
    const db = getMaintenanceDb();
    expect(await errorCode(db.execute(insertProject(`${run}-no-site`, ids.workspace, ids.acme, null)))).toBe(NOT_NULL);
    expect(await errorCode(db.execute(insertProject(`${run}-no-customer`, ids.workspace, null, acmeSite)))).toBe(NOT_NULL);
    expect(await errorCode(db.execute(insertProject(`${run}-neither`, ids.workspace, null, null)))).toBe(NOT_NULL);
  });

  it("can't be cleared on an existing project", async () => {
    const db = getMaintenanceDb();
    expect(await errorCode(db.execute(sql`update project set site_id = null where id = ${ids.project}`))).toBe(NOT_NULL);
    expect(
      await errorCode(db.execute(sql`update project set organization_id = null, site_id = null where id = ${ids.project}`)),
    ).toBe(NOT_NULL);
  });

  it("are set on every project in the database, after the migration removed those without", async () => {
    const { rows } = await getMaintenanceDb().execute<{ n: number }>(
      sql`select count(*)::int as n from project where organization_id is null or site_id is null`,
    );
    expect(rows[0]!.n).toBe(0);
  });
});

describe("hard-deleting a customer or site in use", () => {
  it("is refused for a site with a project, even a deleted one", async () => {
    const db = getMaintenanceDb();
    await db.execute(sql`update project set deleted_at = now() where id = ${ids.project}`);
    expect(await errorCode(db.execute(sql`delete from site where id = ${acmeSite}`))).toBe(FOREIGN_KEY);
    await db.execute(sql`update project set deleted_at = null where id = ${ids.project}`);
  });

  it("is refused for a customer with a project", async () => {
    expect(await errorCode(getMaintenanceDb().execute(sql`delete from organization where id = ${ids.acme}`))).toBe(FOREIGN_KEY);
  });

  it("leaves the project as it was", async () => {
    const { rows } = await getMaintenanceDb().execute<{ organization_id: string; site_id: string }>(
      sql`select organization_id, site_id from project where id = ${ids.project}`,
    );
    expect(rows).toEqual([{ organization_id: ids.acme, site_id: acmeSite }]);
  });
});

describe("deleting a workspace", () => {
  it("still removes its projects, tasks, sites and customers", async () => {
    const db = getMaintenanceDb();
    const customer = `${run}-doomed-customer`;
    const { siteId } = await insertCustomerWithSite(ids.doomed, customer);
    await db.execute(insertProject(`${run}-doomed-project`, ids.doomed, customer, siteId));
    await db.insert(schema.task).values({ id: `${run}-doomed-task`, projectId: `${run}-doomed-project`, title: "Task" });
    await db.execute(sql`delete from workspace where id = ${ids.doomed}`);
    expect(await exists("project", `${run}-doomed-project`)).toBe(false);
    expect(await exists("task", `${run}-doomed-task`)).toBe(false);
    expect(await exists("site", siteId)).toBe(false);
    expect(await exists("organization", customer)).toBe(false);
  });
});
