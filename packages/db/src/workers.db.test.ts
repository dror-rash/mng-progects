import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Workers and crews (task 056, ADR-0008) against the migrated database: a worker sees and works on the
// projects whose crew they're on, never changes the project itself, and loses it with the crew.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  otherWorkspace: `${run}-ws2`,
  admin: `${run}-admin`,
  worker: `${run}-worker`,
  otherWorker: `${run}-worker2`,
  pa: `${run}-pa`,
  partnerA: `${run}-partner-a`,
  acme: `${run}-acme`,
  globex: `${run}-globex`,
  site: `${run}-site`,
  crewProject: `${run}-crew`,
  otherProject: `${run}-other`,
  partnerProject: `${run}-partner-project`,
  foreignProject: `${run}-foreign`,
  crewTask: `${run}-crew-task`,
  otherTask: `${run}-other-task`,
};
const users = [ids.admin, ids.worker, ids.otherWorker, ids.pa];

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

const addToCrew = (projectId: string, userId: string, workspaceId = ids.workspace) =>
  sql`insert into project_worker (project_id, user_id, workspace_id) values (${projectId}, ${userId}, ${workspaceId})`;

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values([
    { id: ids.workspace, name: `Workers ${run}` },
    { id: ids.otherWorkspace, name: `Workers other ${run}` },
  ]);
  await db.insert(schema.partner).values({ id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" });
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.worker, role: "worker" },
    { workspaceId: ids.workspace, userId: ids.otherWorker, role: "worker" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
    { workspaceId: ids.otherWorkspace, userId: ids.worker, role: "worker" },
  ]);
  await db.insert(schema.organization).values([
    { id: ids.acme, workspaceId: ids.workspace, name: "Acme Ltd" },
    { id: ids.globex, workspaceId: ids.workspace, name: "Globex" },
  ]);
  await db.insert(schema.customerPartner).values({ organizationId: ids.acme, partnerId: ids.partnerA, workspaceId: ids.workspace });
  await db.insert(schema.site).values({ id: ids.site, workspaceId: ids.workspace, organizationId: ids.acme, name: "Haifa warehouse" });
  await db.insert(schema.project).values([
    { id: ids.crewProject, name: "Crew", workspaceId: ids.workspace, organizationId: ids.acme, siteId: ids.site },
    { id: ids.otherProject, name: "Other", workspaceId: ids.workspace, organizationId: ids.globex },
    { id: ids.partnerProject, name: "Partner's", workspaceId: ids.workspace, organizationId: ids.acme, visibility: "partner", partnerId: ids.partnerA },
    { id: ids.foreignProject, name: "Foreign", workspaceId: ids.otherWorkspace },
  ]);
  await db.insert(schema.task).values([
    { id: ids.crewTask, projectId: ids.crewProject, title: "Crew task" },
    { id: ids.otherTask, projectId: ids.otherProject, title: "Other task" },
  ]);
  await db.execute(addToCrew(ids.crewProject, ids.worker));
  await db.execute(addToCrew(ids.partnerProject, ids.worker));
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id in (${ids.workspace}, ${ids.otherWorkspace})`);
  await db.execute(sql`delete from "user" where id in (${sql.join(users.map((u) => sql`${u}`), sql`, `)})`);
});

describe("who can be on a crew", () => {
  it("takes a worker of the project's workspace only", async () => {
    const db = getMaintenanceDb();
    await expect(db.execute(addToCrew(ids.otherProject, ids.admin))).rejects.toThrow();
    await expect(db.execute(addToCrew(ids.otherProject, ids.pa))).rejects.toThrow();
    await expect(db.execute(addToCrew(ids.foreignProject, ids.worker))).rejects.toThrow();
    await expect(db.execute(addToCrew(ids.foreignProject, ids.worker, ids.otherWorkspace))).resolves.toBeDefined();
  });

  it("lets admins change crews, and nobody else", async () => {
    expect(await writeAs(ids.worker, addToCrew(ids.otherProject, ids.worker))).toBe("refused");
    expect(await writeAs(ids.pa, addToCrew(ids.partnerProject, ids.otherWorker))).toBe("refused");
    expect(await writeAs(ids.admin, addToCrew(ids.otherProject, ids.otherWorker))).toBe(1);
    expect(await writeAs(ids.admin, sql`delete from project_worker where project_id = ${ids.otherProject} and user_id = ${ids.otherWorker}`)).toBe(1);
  });
});

describe("what a worker sees and does", () => {
  it("sees the projects of their crews only, with their tasks and sites", async () => {
    const projects = await as<{ id: string }>(ids.worker, sql`select id from project where workspace_id = ${ids.workspace} order by id`);
    expect(projects.map((p) => p.id).sort()).toEqual([ids.crewProject, ids.partnerProject].sort());
    expect(await as(ids.worker, sql`select id from task where id = ${ids.otherTask}`)).toHaveLength(0);
    expect(await as(ids.worker, sql`select id from site where id = ${ids.site}`)).toHaveLength(1);
  });

  it("sees the names of their projects' customers only", async () => {
    const names = await as<{ name: string }>(ids.worker, sql`select name from customer_name where workspace_id = ${ids.workspace}`);
    expect(names.map((n) => n.name)).toEqual(["Acme Ltd"]);
    expect(await as(ids.worker, sql`select id from organization where workspace_id = ${ids.workspace}`)).toHaveLength(0);
  });

  it("adds and edits their crew's tasks, but never deletes them", async () => {
    expect(
      await writeAs(ids.worker, sql`insert into task (id, project_id, title) values (${`${run}-new`}, ${ids.crewProject}, 'New')`),
    ).toBe(1);
    expect(await writeAs(ids.worker, sql`update task set status = 'in_progress' where id = ${ids.crewTask}`)).toBe(1);
    expect(await writeAs(ids.worker, sql`delete from task where id = ${ids.crewTask}`)).toBe(0);
    const [deleted] = await as<{ ok: boolean }>(ids.worker, sql`select delete_task(${ids.crewTask}) as ok`);
    expect(deleted?.ok).toBe(false);
  });

  it("changes nothing on projects outside their crews", async () => {
    expect(await writeAs(ids.worker, sql`insert into task (id, project_id, title) values (${`${run}-x`}, ${ids.otherProject}, 'X')`)).toBe("refused");
    expect(await writeAs(ids.worker, sql`update task set title = 'Mine' where id = ${ids.otherTask}`)).toBe(0);
  });

  it("never changes the project itself", async () => {
    expect(await writeAs(ids.worker, sql`update project set name = 'Mine' where id = ${ids.crewProject}`)).toBe(0);
    expect(
      await writeAs(ids.worker, sql`insert into project (id, name, workspace_id) values (${`${run}-p`}, 'P', ${ids.workspace})`),
    ).toBe("refused");
  });

  it("sees the admins, the workers and the partner's users of their crews' partner projects", async () => {
    const members = await as<{ user_id: string }>(ids.worker, sql`select user_id from workspace_member where workspace_id = ${ids.workspace}`);
    expect(members.map((m) => m.user_id).sort()).toEqual([ids.admin, ids.worker, ids.otherWorker, ids.pa].sort());
  });

  it("is seen by the partner's users of a crew project", async () => {
    const members = await as<{ user_id: string }>(ids.pa, sql`select user_id from workspace_member where workspace_id = ${ids.workspace}`);
    expect(members.map((m) => m.user_id)).toContain(ids.worker);
    expect(members.map((m) => m.user_id)).not.toContain(ids.otherWorker);
  });
});

describe("leaving a crew", () => {
  it("hides the project and clears the worker's tasks there", async () => {
    const db = getMaintenanceDb();
    await db.execute(sql`update task set assignee_id = ${ids.worker} where id = ${ids.crewTask}`);
    await withAccess(ids.admin, () =>
      getDb().execute(sql`delete from project_worker where project_id = ${ids.crewProject} and user_id = ${ids.worker}`),
    );
    expect(await as(ids.worker, sql`select id from project where id = ${ids.crewProject}`)).toHaveLength(0);
    const { rows } = await db.execute<{ assignee_id: string | null }>(sql`select assignee_id from task where id = ${ids.crewTask}`);
    expect(rows[0]?.assignee_id).toBeNull();
    await db.execute(addToCrew(ids.crewProject, ids.worker));
  });

  it("happens to a worker made another role, and to one who leaves the workspace", async () => {
    const db = getMaintenanceDb();
    await db.execute(addToCrew(ids.otherProject, ids.otherWorker));
    await db.execute(sql`update workspace_member set role = 'auditor' where workspace_id = ${ids.workspace} and user_id = ${ids.otherWorker}`);
    const { rows } = await db.execute(sql`select 1 from project_worker where user_id = ${ids.otherWorker}`);
    expect(rows).toHaveLength(0);
    await db.execute(sql`update workspace_member set role = 'worker' where workspace_id = ${ids.workspace} and user_id = ${ids.otherWorker}`);
    await db.execute(addToCrew(ids.otherProject, ids.otherWorker));
    await db.execute(sql`delete from workspace_member where workspace_id = ${ids.workspace} and user_id = ${ids.otherWorker}`);
    const after = await db.execute(sql`select 1 from project_worker where user_id = ${ids.otherWorker}`);
    expect(after.rows).toHaveLength(0);
  });

  it("can't call the access functions as PUBLIC", async () => {
    const { rows } = await getMaintenanceDb().execute<{ ok: boolean }>(
      sql`select has_function_privilege('public', 'can_work_on_project(text, text)', 'EXECUTE')
             or has_function_privilege('public', 'is_on_crew(text, text)', 'EXECUTE') as ok`,
    );
    expect(rows[0]?.ok).toBe(false);
  });
});
