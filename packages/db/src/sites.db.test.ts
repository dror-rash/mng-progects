import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Sites and on-site contacts (task 054, ADR-0008) against the migrated database: admins change them,
// auditors read them, partners see none without a project there (project-sites.db.test.ts covers those).

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  otherWorkspace: `${run}-ws2`,
  admin: `${run}-admin`,
  auditor: `${run}-auditor`,
  pa: `${run}-pa`,
  partnerA: `${run}-partner-a`,
  acme: `${run}-acme`,
  foreign: `${run}-foreign`,
  site: `${run}-site`,
  contact: `${run}-contact`,
};
const users = [ids.admin, ids.auditor, ids.pa];

async function as<T extends Record<string, unknown>>(userId: string, query: ReturnType<typeof sql>) {
  const result = await withAccess(userId, () => getDb().execute<T>(query));
  return result.rows;
}

async function writeAs(userId: string, query: ReturnType<typeof sql>): Promise<number | "refused"> {
  try {
    const result = await withAccess(userId, () => getDb().execute(query));
    return result.rowCount ?? 0;
  } catch {
    return "refused";
  }
}

const insertSite = (id: string, organizationId = ids.acme, workspaceId = ids.workspace, coords: [number | null, number | null] = [null, null]) =>
  sql`insert into site (id, workspace_id, organization_id, name, latitude, longitude)
      values (${id}, ${workspaceId}, ${organizationId}, 'Site', ${coords[0]}, ${coords[1]})`;

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values([
    { id: ids.workspace, name: `Sites ${run}` },
    { id: ids.otherWorkspace, name: `Sites other ${run}` },
  ]);
  await db.insert(schema.partner).values({ id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" });
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.auditor, role: "auditor" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
  ]);
  await db.insert(schema.organization).values([
    { id: ids.acme, workspaceId: ids.workspace, name: "Acme Ltd" },
    { id: ids.foreign, workspaceId: ids.otherWorkspace, name: "Foreign Co" },
  ]);
  await db.insert(schema.customerPartner).values({ organizationId: ids.acme, partnerId: ids.partnerA, workspaceId: ids.workspace });
  await db.execute(insertSite(ids.site));
  await db.execute(sql`insert into site_contact (id, site_id, name) values (${ids.contact}, ${ids.site}, 'Yossi')`);
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id in (${ids.workspace}, ${ids.otherWorkspace})`);
  await db.execute(sql`delete from "user" where id in (${ids.admin}, ${ids.auditor}, ${ids.pa})`);
});

describe("who sees and changes sites", () => {
  it("lets admins see, add and change sites and their contacts", async () => {
    expect(await as(ids.admin, sql`select id from site where id = ${ids.site}`)).toHaveLength(1);
    expect(await as(ids.admin, sql`select id from site_contact where id = ${ids.contact}`)).toHaveLength(1);
    expect(await writeAs(ids.admin, insertSite(`${run}-admin-site`))).toBe(1);
    expect(await writeAs(ids.admin, sql`update site set access_notes = 'Gate 4' where id = ${ids.site}`)).toBe(1);
    expect(await writeAs(ids.admin, sql`update site_contact set role = 'Security' where id = ${ids.contact}`)).toBe(1);
  });

  it("lets auditors see sites and their contacts but change nothing", async () => {
    expect(await as(ids.auditor, sql`select id from site where id = ${ids.site}`)).toHaveLength(1);
    expect(await as(ids.auditor, sql`select id from site_contact where id = ${ids.contact}`)).toHaveLength(1);
    expect(await writeAs(ids.auditor, insertSite(`${run}-auditor-site`))).toBe("refused");
    expect(await writeAs(ids.auditor, sql`update site set name = 'Mine' where id = ${ids.site}`)).toBe(0);
    expect(await writeAs(ids.auditor, sql`update site_contact set name = 'Mine' where id = ${ids.contact}`)).toBe(0);
  });

  it("shows partners no sites or on-site contacts, even of their assigned customer", async () => {
    expect(await as(ids.pa, sql`select id from site where workspace_id = ${ids.workspace}`)).toHaveLength(0);
    expect(await as(ids.pa, sql`select id from site_contact where site_id = ${ids.site}`)).toHaveLength(0);
    expect(await writeAs(ids.pa, insertSite(`${run}-pa-site`))).toBe("refused");
  });

  it("can't call the access functions as PUBLIC", async () => {
    const { rows } = await getMaintenanceDb().execute<{ ok: boolean }>(
      sql`select has_function_privilege('public', 'can_see_site(text, text)', 'EXECUTE')
             or has_function_privilege('public', 'can_change_site(text, text)', 'EXECUTE') as ok`,
    );
    expect(rows[0]?.ok).toBe(false);
  });
});

describe("what a site may hold", () => {
  it("refuses a customer of another workspace", async () => {
    await expect(getMaintenanceDb().execute(insertSite(`${run}-x1`, ids.foreign))).rejects.toThrow();
  });

  it("takes both coordinates or neither", async () => {
    await expect(getMaintenanceDb().execute(insertSite(`${run}-x2`, ids.acme, ids.workspace, [32.8, null]))).rejects.toThrow();
    await getMaintenanceDb().execute(insertSite(`${run}-ok`, ids.acme, ids.workspace, [32.8, 35]));
  });

  it("refuses coordinates out of range", async () => {
    await expect(getMaintenanceDb().execute(insertSite(`${run}-x3`, ids.acme, ids.workspace, [91, 35]))).rejects.toThrow();
    await expect(getMaintenanceDb().execute(insertSite(`${run}-x4`, ids.acme, ids.workspace, [32, 181]))).rejects.toThrow();
  });
});
