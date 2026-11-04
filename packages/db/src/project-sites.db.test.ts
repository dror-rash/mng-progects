import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// A project's site (task 055, ADR-0008) against the migrated database: the site is one of the customer's
// or its sub-companies', partners see the sites of their own projects, and site_choice lists the sites of
// customers whose names the user may see.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  otherWorkspace: `${run}-ws2`,
  admin: `${run}-admin`,
  pa: `${run}-pa`,
  pb: `${run}-pb`,
  partnerA: `${run}-partner-a`,
  partnerB: `${run}-partner-b`,
  acme: `${run}-acme`,
  acmeRetail: `${run}-acme-retail`,
  globex: `${run}-globex`,
  foreign: `${run}-foreign`,
  acmeSite: `${run}-acme-site`,
  retailSite: `${run}-retail-site`,
  globexSite: `${run}-globex-site`,
  foreignSite: `${run}-foreign-site`,
  contact: `${run}-contact`,
  projectA: `${run}-project-a`,
  projectB: `${run}-project-b`,
};
const users = [ids.admin, ids.pa, ids.pb];

async function as<T extends Record<string, unknown>>(userId: string, query: ReturnType<typeof sql>) {
  const result = await withAccess(userId, () => getDb().execute<T>(query));
  return result.rows;
}

const insertProject = (id: string, organizationId: string | null, siteId: string | null, partnerId: string | null = null) =>
  sql`insert into project (id, name, workspace_id, organization_id, site_id, visibility, partner_id)
      values (${id}, 'Project', ${ids.workspace}, ${organizationId}, ${siteId},
              ${partnerId ? "partner" : "internal"}, ${partnerId})`;

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values([
    { id: ids.workspace, name: `Project sites ${run}` },
    { id: ids.otherWorkspace, name: `Project sites other ${run}` },
  ]);
  await db.insert(schema.partner).values([
    { id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" },
    { id: ids.partnerB, workspaceId: ids.workspace, name: "Partner B" },
  ]);
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
    { workspaceId: ids.workspace, userId: ids.pb, role: "partner", partnerId: ids.partnerB },
  ]);
  await db.insert(schema.organization).values([
    { id: ids.acme, workspaceId: ids.workspace, name: "Acme Ltd" },
    { id: ids.globex, workspaceId: ids.workspace, name: "Globex" },
    { id: ids.foreign, workspaceId: ids.otherWorkspace, name: "Foreign Co" },
  ]);
  await db.insert(schema.organization).values({ id: ids.acmeRetail, workspaceId: ids.workspace, name: "Acme Retail", parentId: ids.acme });
  await db.insert(schema.customerPartner).values([
    { organizationId: ids.acme, partnerId: ids.partnerA, workspaceId: ids.workspace },
    { organizationId: ids.acme, partnerId: ids.partnerB, workspaceId: ids.workspace },
  ]);
  await db.insert(schema.site).values([
    { id: ids.acmeSite, workspaceId: ids.workspace, organizationId: ids.acme, name: "Haifa warehouse" },
    { id: ids.retailSite, workspaceId: ids.workspace, organizationId: ids.acmeRetail, name: "Dizengoff store" },
    { id: ids.globexSite, workspaceId: ids.workspace, organizationId: ids.globex, name: "Globex plant" },
    { id: ids.foreignSite, workspaceId: ids.otherWorkspace, organizationId: ids.foreign, name: "Foreign site" },
  ]);
  await db.insert(schema.siteContact).values({ id: ids.contact, siteId: ids.acmeSite, name: "Yossi" });
  await db.execute(insertProject(ids.projectA, ids.acme, ids.acmeSite, ids.partnerA));
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id in (${ids.workspace}, ${ids.otherWorkspace})`);
  await db.execute(sql`delete from "user" where id in (${ids.admin}, ${ids.pa}, ${ids.pb})`);
});

describe("which site a project may be at", () => {
  it("takes a site of the customer or of one of its sub-companies", async () => {
    const db = getMaintenanceDb();
    await db.execute(insertProject(`${run}-ok1`, ids.acme, ids.acmeSite));
    await db.execute(insertProject(`${run}-ok2`, ids.acme, ids.retailSite));
    await db.execute(insertProject(`${run}-ok3`, ids.acmeRetail, ids.retailSite));
  });

  it("refuses no site at all: every project has one (task 071)", async () => {
    await expect(getMaintenanceDb().execute(insertProject(`${run}-old`, ids.acme, null))).rejects.toThrow();
  });

  it("refuses another customer's site, its parent's site, a site with no customer, or another workspace's", async () => {
    const db = getMaintenanceDb();
    await expect(db.execute(insertProject(`${run}-x1`, ids.acme, ids.globexSite))).rejects.toThrow();
    await expect(db.execute(insertProject(`${run}-x2`, ids.acmeRetail, ids.acmeSite))).rejects.toThrow();
    await expect(db.execute(insertProject(`${run}-x3`, null, ids.acmeSite))).rejects.toThrow();
    await expect(db.execute(insertProject(`${run}-x4`, ids.acme, ids.foreignSite))).rejects.toThrow();
  });

  it("refuses changing the customer away from the project's site", async () => {
    await expect(
      getMaintenanceDb().execute(sql`update project set organization_id = ${ids.globex} where id = ${ids.projectA}`),
    ).rejects.toThrow();
  });

  it("refuses moving a sub-company while its parent's projects are at its sites", async () => {
    const db = getMaintenanceDb();
    await db.execute(insertProject(`${run}-at-retail`, ids.acme, ids.retailSite));
    await expect(db.execute(sql`update organization set parent_id = null where id = ${ids.acmeRetail}`)).rejects.toThrow();
    await db.execute(sql`update project set deleted_at = now() where id = ${`${run}-at-retail`} or id = ${`${run}-ok2`}`);
    await db.execute(sql`update organization set parent_id = null where id = ${ids.acmeRetail}`);
    await db.execute(sql`update organization set parent_id = ${ids.acme} where id = ${ids.acmeRetail}`);
  });
});

describe("who sees a project's site", () => {
  it("lets a partner see the site and on-site contacts of their partner's project", async () => {
    expect(await as(ids.pa, sql`select id from site where id = ${ids.acmeSite}`)).toHaveLength(1);
    expect(await as(ids.pa, sql`select id from site_contact where id = ${ids.contact}`)).toHaveLength(1);
  });

  it("hides another partner's project site and the sites with no project of theirs", async () => {
    expect(await as(ids.pb, sql`select id from site where id = ${ids.acmeSite}`)).toHaveLength(0);
    expect(await as(ids.pb, sql`select id from site_contact where id = ${ids.contact}`)).toHaveLength(0);
    expect(await as(ids.pa, sql`select id from site where id = ${ids.globexSite}`)).toHaveLength(0);
  });

  it("stops showing the site once the project is deleted", async () => {
    const db = getMaintenanceDb();
    await db.execute(insertProject(ids.projectB, ids.acme, ids.retailSite, ids.partnerB));
    expect(await as(ids.pb, sql`select id from site where id = ${ids.retailSite}`)).toHaveLength(1);
    await db.execute(sql`update project set deleted_at = now() where id = ${ids.projectB}`);
    expect(await as(ids.pb, sql`select id from site where id = ${ids.retailSite}`)).toHaveLength(0);
  });

  it("never lets a partner change a site", async () => {
    const result = await withAccess(ids.pa, () => getDb().execute(sql`update site set name = 'Mine' where id = ${ids.acmeSite}`));
    expect(result.rowCount).toBe(0);
  });
});

describe("the sites a user may choose", () => {
  const choices = (userId: string) =>
    as<{ id: string; customer_parent_id: string | null; customer_name: string }>(
      userId,
      sql`select id, customer_parent_id, customer_name from site_choice where workspace_id = ${ids.workspace} order by name`,
    );

  it("lists every site of the workspace for an admin, with the customer group", async () => {
    const rows = await choices(ids.admin);
    expect(rows.map((r) => r.id).sort()).toEqual([ids.acmeSite, ids.globexSite, ids.retailSite].sort());
    expect(rows.find((r) => r.id === ids.retailSite)).toMatchObject({ customer_parent_id: ids.acme, customer_name: "Acme Retail" });
  });

  it("lists only the sites of a partner's assigned customers", async () => {
    expect((await choices(ids.pa)).map((r) => r.id)).toEqual([ids.acmeSite]);
  });

  it("drops deleted sites", async () => {
    const db = getMaintenanceDb();
    await db.execute(sql`update site set deleted_at = now() where id = ${ids.globexSite}`);
    expect((await choices(ids.admin)).map((r) => r.id)).not.toContain(ids.globexSite);
    await db.execute(sql`update site set deleted_at = null where id = ${ids.globexSite}`);
  });

  it("is read-only for the app", async () => {
    const { rows } = await getMaintenanceDb().execute<{ ok: boolean }>(
      sql`select has_table_privilege('app_user', 'site_choice', 'INSERT')
             or has_table_privilege('app_user', 'site_choice', 'UPDATE') as ok`,
    );
    expect(rows[0]?.ok).toBe(false);
  });
});
