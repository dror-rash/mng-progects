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
  leaver: `${run}-leaver`,
  removed: `${run}-removed`,
  mover: `${run}-mover`,
  partnerA: `${run}-partner-a`,
  partnerB: `${run}-partner-b`,
  shared: `${run}-shared`,
  onlyB: `${run}-only-b`,
  gone: `${run}-gone`,
  pa1: `${run}-pa1`,
  pb1: `${run}-pb1`,
  int: `${run}-int`,
};
const users = [ids.admin, ids.auditor, ids.pa, ids.pb, ids.leaver, ids.removed, ids.mover];

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

/** The tasks still assigned to `userId`, read past row-level security. */
async function assignedTo(userId: string) {
  const { rows } = await getMaintenanceDb().execute<{ id: string }>(sql`select id from task where assignee_id = ${userId}`);
  return rows.map((r) => r.id);
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
    { workspaceId: ids.workspace, userId: ids.leaver, role: "auditor" },
    { workspaceId: ids.workspace, userId: ids.removed, role: "partner", partnerId: ids.partnerB },
    { workspaceId: ids.workspace, userId: ids.mover, role: "auditor" },
  ]);
  await db.insert(schema.organization).values([
    { id: ids.shared, workspaceId: ids.workspace, name: "Shared" },
    { id: ids.onlyB, workspaceId: ids.workspace, name: "OnlyB" },
    { id: ids.gone, workspaceId: ids.workspace, name: "Gone", deletedAt: new Date() },
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
    { id: `${run}-task-leaver`, projectId: ids.int, title: "Assigned to the leaver", assigneeId: ids.leaver },
    { id: `${run}-task-removed-int`, projectId: ids.int, title: "Assigned to the removed", assigneeId: ids.removed },
    { id: `${run}-task-removed-pb1`, projectId: ids.pb1, title: "Also assigned to the removed", assigneeId: ids.removed },
    { id: `${run}-task-mover-pa1`, projectId: ids.pa1, title: "The mover's on A", assigneeId: ids.mover },
    { id: `${run}-task-mover-pb1`, projectId: ids.pb1, title: "The mover's on B", assigneeId: ids.mover },
    { id: `${run}-task-mover-int`, projectId: ids.int, title: "The mover's internal", assigneeId: ids.mover },
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

  it("leaves deleted customers out of customer_name, for admins too", async () => {
    const rows = await as<{ name: string }>(ids.admin, sql`select name from customer_name where workspace_id = ${ids.workspace} order by name`);

    expect(rows.map((r) => r.name)).toEqual(["OnlyB", "Shared"]);
  });

  it("refuses writes through customer_name", async () => {
    expect(await writeAs(ids.pa, sql`update customer_name set name = 'x' where id = ${ids.shared}`)).toBe("refused");
  });

  it("refuses a partner's update of another partner's project", async () => {
    expect(await writeAs(ids.pa, sql`update project set name = 'x' where id = ${ids.pb1}`)).toBe(0);

    const [project] = await getMaintenanceDb()
      .select({ name: schema.project.name })
      .from(schema.project)
      .where(inArray(schema.project.id, [ids.pb1]));
    expect(project?.name).toBe("PB1");
  });

  it("refuses a partner's move of its own project to another partner", async () => {
    // Both partners serve the project's customer: only the owner rule stops it (rule 4a).
    const move = withAccess(ids.pa, () => getDb().execute(sql`update project set partner_id = ${ids.partnerB} where id = ${ids.pa1}`));

    await expect(move.catch((error: unknown) => Promise.reject(new Error(cause(error))))).rejects.toThrow(/row-level security/);

    const [project] = await getMaintenanceDb()
      .select({ partnerId: schema.project.partnerId })
      .from(schema.project)
      .where(inArray(schema.project.id, [ids.pa1]));
    expect(project?.partnerId).toBe(ids.partnerA);
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

  it("an auditor who leaves has their assignments cleared", async () => {
    // As changeMembership does it: clear while still a member, then delete your own membership.
    await withAccess(ids.leaver, async () => {
      await getDb().execute(sql`select clear_assignments(${ids.workspace}, ${ids.leaver})`);
      await getDb().execute(sql`delete from workspace_member where workspace_id = ${ids.workspace} and user_id = ${ids.leaver}`);
    });

    expect(await assignedTo(ids.leaver)).toEqual([]);
  });

  it("an admin removing a member clears all their assignments", async () => {
    // The removed partner user's tasks include one on an internal project they could never change.
    await withAccess(ids.admin, async () => {
      await getDb().execute(sql`select clear_assignments(${ids.workspace}, ${ids.removed})`);
      await getDb().execute(sql`delete from workspace_member where workspace_id = ${ids.workspace} and user_id = ${ids.removed}`);
    });

    expect(await assignedTo(ids.removed)).toEqual([]);
  });

  it("refuses to clear someone else's assignments unless you are an admin", async () => {
    const clear = withAccess(ids.pa, () => getDb().execute(sql`select clear_assignments(${ids.workspace}, ${ids.pb})`));

    await expect(clear.catch((error: unknown) => Promise.reject(new Error(cause(error))))).rejects.toThrow(/only yourself or an admin/);
  });

  it("a role change clears only the assignments the user can no longer see", async () => {
    // An admin makes the mover (an auditor) a user of partner B: B's project stays visible to them.
    await withAccess(ids.admin, async () => {
      await getDb().execute(
        sql`update workspace_member set role = 'partner', partner_id = ${ids.partnerB} where workspace_id = ${ids.workspace} and user_id = ${ids.mover}`,
      );
      await getDb().execute(sql`select clear_unseen_assignments(${ids.workspace}, ${ids.mover})`);
    });

    expect(await assignedTo(ids.mover)).toEqual([`${run}-task-mover-pb1`]);
  });

  it("refuses to clear unseen assignments unless you are an admin", async () => {
    const clear = withAccess(ids.auditor, () => getDb().execute(sql`select clear_unseen_assignments(${ids.workspace}, ${ids.auditor})`));

    await expect(clear.catch((error: unknown) => Promise.reject(new Error(cause(error))))).rejects.toThrow(/only an admin/);
  });

  it("handles 8 parallel scoped queries with a pool of 5", async () => {
    const queries = Array.from({ length: 8 }, (_, i) =>
      as<{ id: string }>(i % 2 === 0 ? ids.pa : ids.admin, sql`select id from project where workspace_id = ${ids.workspace}`),
    );

    const results = await Promise.all(queries);

    expect(results.map((rows) => rows.length)).toEqual([1, 3, 1, 3, 1, 3, 1, 3]);
  }, 5_000);
});
