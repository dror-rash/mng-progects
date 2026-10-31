import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Row-level security (task 047, ADR-0006) against the migrated database: raw SQL as the runtime pool,
// with the user set by `withAccess`. Fixtures are written through the maintenance connection.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  admin: `${run}-admin`,
  auditor: `${run}-auditor`,
  pa: `${run}-pa`,
  pb: `${run}-pb`,
  partnerA: `${run}-partner-a`,
  partnerB: `${run}-partner-b`,
  shared: `${run}-shared`,
  onlyB: `${run}-only-b`,
  pa1: `${run}-pa1`,
  pb1: `${run}-pb1`,
  int: `${run}-int`,
};
const users = [ids.admin, ids.auditor, ids.pa, ids.pb];

/** Runs `query` as `userId` and returns its rows. */
async function as<T extends Record<string, unknown>>(userId: string, query: ReturnType<typeof sql>) {
  const result = await withAccess(userId, () => getDb().execute<T>(query));
  return result.rows;
}

/** The number of rows a write changed as `userId`, or "refused" when the database threw. */
async function writeAs(userId: string, query: ReturnType<typeof sql>): Promise<number | "refused"> {
  try {
    const result = await withAccess(userId, () => getDb().execute(query));
    return result.rowCount ?? 0;
  } catch {
    return "refused";
  }
}

/** The database's own message, under Drizzle's "Failed query" wrapper. */
function cause(error: unknown): string {
  const e = error as { message?: string; cause?: { message?: string } };
  return e.cause?.message ?? e.message ?? String(error);
}

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values({ id: ids.workspace, name: `RLS ${run}` });
  await db.insert(schema.partner).values([
    { id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" },
    { id: ids.partnerB, workspaceId: ids.workspace, name: "Partner B" },
  ]);
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.auditor, role: "auditor" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
    { workspaceId: ids.workspace, userId: ids.pb, role: "partner", partnerId: ids.partnerB },
  ]);
  await db.insert(schema.organization).values([
    { id: ids.shared, workspaceId: ids.workspace, name: "Shared" },
    { id: ids.onlyB, workspaceId: ids.workspace, name: "OnlyB" },
  ]);
  await db.insert(schema.customerPartner).values([
    { organizationId: ids.shared, partnerId: ids.partnerA, workspaceId: ids.workspace },
    { organizationId: ids.shared, partnerId: ids.partnerB, workspaceId: ids.workspace },
    { organizationId: ids.onlyB, partnerId: ids.partnerB, workspaceId: ids.workspace },
  ]);
  await db.insert(schema.project).values([
    { id: ids.pa1, name: "PA1", workspaceId: ids.workspace, organizationId: ids.shared, visibility: "partner", partnerId: ids.partnerA },
    { id: ids.pb1, name: "PB1", workspaceId: ids.workspace, organizationId: ids.shared, visibility: "partner", partnerId: ids.partnerB },
    { id: ids.int, name: "INT", workspaceId: ids.workspace },
  ]);
  await db.insert(schema.task).values([
    { id: `${run}-task-pa1`, projectId: ids.pa1, title: "A task" },
    { id: `${run}-task-int`, projectId: ids.int, title: "An internal task" },
  ]);
});

afterAll(async () => {
  const db = getMaintenanceDb();
  // The workspace takes its partners, members, customers, projects and tasks with it.
  await db.delete(schema.workspace).where(inArray(schema.workspace.id, [ids.workspace]));
  await db.delete(schema.user).where(inArray(schema.user.id, users));
});

describe("row-level security", () => {
  it("shows partner A only its own project", async () => {
    const rows = await as<{ id: string }>(ids.pa, sql`select id from project`);

    expect(rows.map((r) => r.id)).toEqual([ids.pa1]);
  });

  it("hides customers from partners entirely", async () => {
    expect(await as(ids.pa, sql`select * from organization`)).toEqual([]);
  });

  it("gives partners names of assigned customers only", async () => {
    const rows = await as<{ name: string }>(ids.pa, sql`select name from customer_name`);

    expect(rows.map((r) => r.name)).toEqual(["Shared"]);
  });

  it("refuses a partner's update of another partner's project", async () => {
    expect(await writeAs(ids.pa, sql`update project set name = 'x' where id = ${ids.pb1}`)).toBe(0);

    const [project] = await getMaintenanceDb()
      .select({ name: schema.project.name })
      .from(schema.project)
      .where(inArray(schema.project.id, [ids.pb1]));
    expect(project?.name).toBe("PB1");
  });

  it("refuses a partner's insert into another partner", async () => {
    const insert = withAccess(ids.pa, () =>
      getDb().execute(
        sql`insert into project (id, name, workspace_id, organization_id, visibility, partner_id)
            values (${`${run}-sneaky`}, 'Sneaky', ${ids.workspace}, ${ids.shared}, 'partner', ${ids.partnerB})`,
      ),
    );

    await expect(insert.catch((error: unknown) => Promise.reject(new Error(cause(error))))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("refuses every write by an auditor", async () => {
    const writes = {
      "insert project": sql`insert into project (id, name, workspace_id) values (${`${run}-audit`}, 'Audit', ${ids.workspace})`,
      "update project": sql`update project set name = 'x' where id = ${ids.int}`,
      "delete project": sql`delete from project where id = ${ids.int}`,
      "insert task": sql`insert into task (id, project_id, title) values (${`${run}-audit-task`}, ${ids.int}, 'Audit')`,
      "update task": sql`update task set title = 'x' where project_id = ${ids.int}`,
      "delete task": sql`delete from task where project_id = ${ids.int}`,
      "insert organization": sql`insert into organization (id, workspace_id, name) values (${`${run}-audit-org`}, ${ids.workspace}, 'Audit')`,
      "update organization": sql`update organization set name = 'x' where id = ${ids.shared}`,
      "delete organization": sql`delete from organization where id = ${ids.shared}`,
    };

    const allowed: string[] = [];
    for (const [write, query] of Object.entries(writes)) {
      const result = await writeAs(ids.auditor, query);
      if (result !== 0 && result !== "refused") allowed.push(`${write}: ${result} rows`);
    }

    expect(allowed).toEqual([]);
  });

  it("shows nothing without withAccess", async () => {
    const { rows } = await getDb().execute(sql`select id from project`);

    expect(rows).toEqual([]);
  });

  it("hides projects after the customer is unassigned", async () => {
    const db = getMaintenanceDb();
    await db.execute(sql`delete from customer_partner where organization_id = ${ids.shared} and partner_id = ${ids.partnerA}`);
    try {
      expect(await as(ids.pa, sql`select id from project`)).toEqual([]);
    } finally {
      await db
        .insert(schema.customerPartner)
        .values({ organizationId: ids.shared, partnerId: ids.partnerA, workspaceId: ids.workspace });
    }
  });

  it("hides other partners' members", async () => {
    const rows = await as<{ user_id: string }>(ids.pa, sql`select user_id from workspace_member`);

    expect(rows.map((r) => r.user_id).sort()).toEqual([ids.admin, ids.pa].sort());
  });

  it("reuses the outer transaction when withAccess is nested", async () => {
    const txid = sql`select txid_current()::text as txid`;
    const [outer, inner] = await withAccess(ids.pa, async () => {
      const outer = (await getDb().execute<{ txid: string }>(txid)).rows[0]?.txid;
      const inner = await withAccess(ids.pa, async () => (await getDb().execute<{ txid: string }>(txid)).rows[0]?.txid);
      return [outer, inner];
    });

    expect(inner).toBe(outer);
  });

  it("refuses a nested withAccess for another user", async () => {
    const nested = withAccess(ids.pa, () => withAccess(ids.admin, () => getDb().execute(sql`select 1`)));

    await expect(nested).rejects.toThrow(/another user/);
  });

  it("gives parallel withAccess calls their own transactions", async () => {
    const txid = sql`select txid_current()::text as txid`;
    const [a, b] = await Promise.all([as<{ txid: string }>(ids.pa, txid), as<{ txid: string }>(ids.pa, txid)]);

    expect(a[0]?.txid).not.toBe(b[0]?.txid);
  });

  it("handles 8 parallel scoped queries with a pool of 5", async () => {
    const queries = Array.from({ length: 8 }, (_, i) =>
      as<{ id: string }>(i % 2 === 0 ? ids.pa : ids.admin, sql`select id from project where workspace_id = ${ids.workspace}`),
    );

    const results = await Promise.all(queries);

    expect(results.map((rows) => rows.length)).toEqual([1, 3, 1, 3, 1, 3, 1, 3]);
  }, 5_000);
});
