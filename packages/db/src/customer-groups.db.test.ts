import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Customer groups (task 053, ADR-0008) against the migrated database: one level of sub-companies, kept
// whole by a trigger, and parent names in the `customer_name` view.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  otherWorkspace: `${run}-ws2`,
  admin: `${run}-admin`,
  pa: `${run}-pa`,
  partnerA: `${run}-partner-a`,
  acme: `${run}-acme`,
  retail: `${run}-retail`,
  online: `${run}-online`,
  globex: `${run}-globex`,
  supplier: `${run}-supplier`,
  foreign: `${run}-foreign`,
};
const users = [ids.admin, ids.pa];

async function setParent(id: string, parentId: string | null) {
  await getMaintenanceDb().execute(sql`update organization set parent_id = ${parentId} where id = ${id}`);
}

async function insertOrganization(id: string, name: string, extra: { workspace?: string; kind?: string; parent?: string } = {}) {
  await getMaintenanceDb().execute(
    sql`insert into organization (id, workspace_id, kind, name, parent_id)
        values (${id}, ${extra.workspace ?? ids.workspace}, ${extra.kind ?? "customer"}, ${name}, ${extra.parent ?? null})`,
  );
}

async function namesAs(userId: string) {
  const result = await withAccess(userId, () =>
    getDb().execute<{ id: string; name: string; parent_name: string | null; label: string }>(
      sql`select id, name, parent_name, label from customer_name where workspace_id = ${ids.workspace} order by label`,
    ),
  );
  return result.rows;
}

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values([
    { id: ids.workspace, name: `Groups ${run}` },
    { id: ids.otherWorkspace, name: `Groups other ${run}` },
  ]);
  await db.insert(schema.partner).values({ id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" });
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
  ]);
  await insertOrganization(ids.acme, "Acme Ltd");
  await insertOrganization(ids.retail, "Acme Retail", { parent: ids.acme });
  await insertOrganization(ids.online, "Acme Online");
  await insertOrganization(ids.globex, "Globex");
  await insertOrganization(ids.supplier, "Parts Co", { kind: "supplier" });
  await insertOrganization(ids.foreign, "Foreign Co", { workspace: ids.otherWorkspace });
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id in (${ids.workspace}, ${ids.otherWorkspace})`);
  await db.execute(sql`delete from "user" where id in (${ids.admin}, ${ids.pa})`);
});

describe("one level of sub-companies", () => {
  it("accepts a top-level customer of the same workspace as the parent", async () => {
    await setParent(ids.online, ids.acme);
    await setParent(ids.online, null);
  });

  it("refuses a parent in another workspace", async () => {
    await expect(setParent(ids.online, ids.foreign)).rejects.toThrow();
  });

  it("refuses a parent of another kind", async () => {
    await expect(setParent(ids.online, ids.supplier)).rejects.toThrow();
  });

  it("refuses a sub-company as a parent", async () => {
    await expect(setParent(ids.online, ids.retail)).rejects.toThrow();
  });

  it("refuses a parent for a company that has sub-companies", async () => {
    await expect(setParent(ids.acme, ids.globex)).rejects.toThrow();
  });

  it("counts deleted sub-companies too", async () => {
    await insertOrganization(`${run}-old`, "Old Brand", { parent: ids.globex });
    await getMaintenanceDb().execute(sql`update organization set deleted_at = now() where id = ${`${run}-old`}`);
    await expect(setParent(ids.globex, ids.acme)).rejects.toThrow();
  });

  it("refuses a company as its own parent", async () => {
    await expect(setParent(ids.online, ids.online)).rejects.toThrow();
  });

  it("refuses a new row whose parent is a sub-company", async () => {
    await expect(insertOrganization(`${run}-deep`, "Too deep", { parent: ids.retail })).rejects.toThrow();
  });
});

describe("customer names with their parent", () => {
  it("labels sub-companies with their parent's name for admins", async () => {
    const names = await namesAs(ids.admin);
    expect(names.find((n) => n.id === ids.retail)).toMatchObject({ parent_name: "Acme Ltd", label: "Acme Ltd › Acme Retail" });
    expect(names.find((n) => n.id === ids.acme)).toMatchObject({ parent_name: null, label: "Acme Ltd" });
  });

  it("doesn't give a partner assigned to the parent its sub-companies", async () => {
    await getMaintenanceDb()
      .insert(schema.customerPartner)
      .values({ organizationId: ids.acme, partnerId: ids.partnerA, workspaceId: ids.workspace });
    expect((await namesAs(ids.pa)).map((n) => n.label)).toEqual(["Acme Ltd"]);
  });

  it("shows a partner assigned to a sub-company its parent's name", async () => {
    await getMaintenanceDb()
      .insert(schema.customerPartner)
      .values({ organizationId: ids.retail, partnerId: ids.partnerA, workspaceId: ids.workspace });
    expect((await namesAs(ids.pa)).map((n) => n.label)).toEqual(["Acme Ltd", "Acme Ltd › Acme Retail"]);
  });
});
