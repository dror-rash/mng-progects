import { createHash } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Soft delete (task 051, design rules 8–8c) against the migrated database: the app's writes as raw SQL
// through the runtime pool, as the user `withAccess` sets. Fixtures go through the maintenance connection,
// and each test starts with nothing deleted.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  admin: `${run}-admin`,
  auditor: `${run}-auditor`,
  pa: `${run}-pa`,
  partnerA: `${run}-partner-a`,
  customer: `${run}-customer`,
  project: `${run}-project`,
  task: `${run}-task`,
  invite: `${run}-invite`,
};
const users = [ids.admin, ids.auditor, ids.pa];
const token = `${run}-token`;
const tokenHash = createHash("sha256").update(token).digest("hex");

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

/** A row's `deleted_at`, read past row-level security. */
async function deletedAt(table: "project" | "task" | "partner", id: string) {
  const { rows } = await getMaintenanceDb().execute<{ deleted_at: string | null }>(
    sql`select deleted_at from ${sql.identifier(table)} where id = ${id}`,
  );
  return rows[0]?.deleted_at ?? null;
}

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values({ id: ids.workspace, name: `Soft delete ${run}` });
  await db.insert(schema.partner).values({ id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" });
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.auditor, role: "auditor" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
  ]);
  await db.insert(schema.organization).values({ id: ids.customer, workspaceId: ids.workspace, name: "Customer" });
  await db.insert(schema.customerPartner).values({ organizationId: ids.customer, partnerId: ids.partnerA, workspaceId: ids.workspace });
  await db.insert(schema.project).values({
    id: ids.project,
    name: "Project",
    workspaceId: ids.workspace,
    organizationId: ids.customer,
    visibility: "partner",
    partnerId: ids.partnerA,
  });
  await db.insert(schema.task).values({ id: ids.task, projectId: ids.project, title: "Task" });
  await db.insert(schema.workspaceInvite).values({
    id: ids.invite,
    workspaceId: ids.workspace,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    role: "partner",
    partnerId: ids.partnerA,
  });
});

beforeEach(async () => {
  const db = getMaintenanceDb();
  await db.update(schema.project).set({ deletedAt: null, deletedBy: null }).where(eq(schema.project.id, ids.project));
  await db.update(schema.task).set({ deletedAt: null, deletedBy: null }).where(eq(schema.task.id, ids.task));
  await db.update(schema.partner).set({ deletedAt: null, deletedBy: null }).where(eq(schema.partner.id, ids.partnerA));
});

afterAll(async () => {
  const db = getMaintenanceDb();
  // The workspace takes its partner, members, invite, customer, project and task with it.
  await db.delete(schema.workspace).where(inArray(schema.workspace.id, [ids.workspace]));
  await db.delete(schema.user).where(inArray(schema.user.id, users));
});

describe("soft delete", () => {
  it("hides deleted projects from partners but not admins", async () => {
    await getMaintenanceDb().update(schema.project).set({ deletedAt: new Date() }).where(eq(schema.project.id, ids.project));

    expect(await as(ids.pa, sql`select id from project where id = ${ids.project}`)).toEqual([]);
    expect(await as(ids.pa, sql`select id from task where id = ${ids.task}`)).toEqual([]);
    expect(await as(ids.admin, sql`select id from project where id = ${ids.project}`)).toEqual([{ id: ids.project }]);
    expect(await as(ids.auditor, sql`select id from project where id = ${ids.project}`)).toEqual([{ id: ids.project }]);
  });

  it("lets a partner soft-delete its own partner's task", async () => {
    const changed = await writeAs(ids.pa, sql`update task set deleted_at = now(), deleted_by = ${ids.pa} where id = ${ids.task}`);

    expect(changed).toBe(1);
    expect(await deletedAt("task", ids.task)).not.toBeNull();
  });

  it("lets a partner soft-delete its own partner's project", async () => {
    const changed = await writeAs(ids.pa, sql`update project set deleted_at = now(), deleted_by = ${ids.pa} where id = ${ids.project}`);

    expect(changed).toBe(1);
    expect(await deletedAt("project", ids.project)).not.toBeNull();
  });

  it("lets an admin restore a deleted project", async () => {
    await getMaintenanceDb().update(schema.project).set({ deletedAt: new Date() }).where(eq(schema.project.id, ids.project));

    const [restored] = await as<{ restored: boolean }>(ids.admin, sql`select restore_project(${ids.project}) as restored`);

    expect(restored?.restored).toBe(true);
    expect(await deletedAt("project", ids.project)).toBeNull();
  });

  it("refuses to restore a project for auditors and partners", async () => {
    await getMaintenanceDb().update(schema.project).set({ deletedAt: new Date() }).where(eq(schema.project.id, ids.project));

    for (const user of [ids.auditor, ids.pa]) {
      expect([0, "refused"]).toContain(await writeAs(user, sql`update project set deleted_at = null where id = ${ids.project}`));
      const [restored] = await as<{ restored: boolean }>(user, sql`select restore_project(${ids.project}) as restored`);
      expect(restored?.restored).toBe(false);
    }
    expect(await deletedAt("project", ids.project)).not.toBeNull();
  });

  it("refuses to change anything else on a deleted project, for admins too", async () => {
    await getMaintenanceDb().update(schema.project).set({ deletedAt: new Date() }).where(eq(schema.project.id, ids.project));

    expect([0, "refused"]).toContain(await writeAs(ids.admin, sql`update project set name = 'Renamed' where id = ${ids.project}`));
  });

  it("makes a deleted partner's invite link invalid, and valid again after a restore", async () => {
    const join = sql`select join_workspace(${`${run}-joiner`}, ${tokenHash}) as result`;
    await getMaintenanceDb().update(schema.partner).set({ deletedAt: new Date() }).where(eq(schema.partner.id, ids.partnerA));

    const [invite] = await as<{ partner_deleted: boolean }>(`${run}-joiner`, sql`select partner_deleted from find_invite(${tokenHash})`);
    expect(invite?.partner_deleted).toBe(true);
    expect(await as<{ result: string }>(`${run}-joiner`, join)).toEqual([{ result: "invalid" }]);

    await getMaintenanceDb().update(schema.partner).set({ deletedAt: null }).where(eq(schema.partner.id, ids.partnerA));
    const [restored] = await as<{ partner_deleted: boolean }>(`${run}-joiner`, sql`select partner_deleted from find_invite(${tokenHash})`);
    expect(restored?.partner_deleted).toBe(false);
  });
});
