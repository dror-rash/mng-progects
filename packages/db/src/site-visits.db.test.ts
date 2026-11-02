import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Site visits (task 058, ADR-0008) against the migrated database: visits follow their project; whoever can
// work on it records them as themselves; only the author and admins change them.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  admin: `${run}-admin`,
  auditor: `${run}-auditor`,
  worker: `${run}-worker`,
  otherWorker: `${run}-worker2`,
  pa: `${run}-pa`,
  pb: `${run}-pb`,
  partnerA: `${run}-partner-a`,
  partnerB: `${run}-partner-b`,
  acme: `${run}-acme`,
  projectA: `${run}-project-a`,
  projectB: `${run}-project-b`,
  internal: `${run}-internal`,
  adminVisit: `${run}-admin-visit`,
  workerVisit: `${run}-worker-visit`,
  visitB: `${run}-visit-b`,
};
const users = [ids.admin, ids.auditor, ids.worker, ids.otherWorker, ids.pa, ids.pb];

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

const insertVisit = (id: string, projectId: string, createdBy: string) =>
  sql`insert into site_visit (id, project_id, visited_on, notes, created_by)
      values (${id}, ${projectId}, current_date, 'Notes', ${createdBy})`;

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values({ id: ids.workspace, name: `Visits ${run}` });
  await db.insert(schema.partner).values([
    { id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" },
    { id: ids.partnerB, workspaceId: ids.workspace, name: "Partner B" },
  ]);
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.auditor, role: "auditor" },
    { workspaceId: ids.workspace, userId: ids.worker, role: "worker" },
    { workspaceId: ids.workspace, userId: ids.otherWorker, role: "worker" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
    { workspaceId: ids.workspace, userId: ids.pb, role: "partner", partnerId: ids.partnerB },
  ]);
  await db.insert(schema.organization).values({ id: ids.acme, workspaceId: ids.workspace, name: "Acme Ltd" });
  await db.insert(schema.customerPartner).values([
    { organizationId: ids.acme, partnerId: ids.partnerA, workspaceId: ids.workspace },
    { organizationId: ids.acme, partnerId: ids.partnerB, workspaceId: ids.workspace },
  ]);
  await db.insert(schema.project).values([
    { id: ids.projectA, name: "A", workspaceId: ids.workspace, organizationId: ids.acme, visibility: "partner", partnerId: ids.partnerA },
    { id: ids.projectB, name: "B", workspaceId: ids.workspace, organizationId: ids.acme, visibility: "partner", partnerId: ids.partnerB },
    { id: ids.internal, name: "Internal", workspaceId: ids.workspace, organizationId: ids.acme },
  ]);
  await db.execute(sql`insert into project_worker (project_id, user_id, workspace_id) values
    (${ids.projectA}, ${ids.worker}, ${ids.workspace}), (${ids.projectA}, ${ids.otherWorker}, ${ids.workspace})`);
  await db.execute(insertVisit(ids.adminVisit, ids.projectA, ids.admin));
  await db.execute(insertVisit(ids.workerVisit, ids.projectA, ids.worker));
  await db.execute(insertVisit(ids.visitB, ids.projectB, ids.pb));
  await db.execute(sql`insert into site_visit_member (visit_id, user_id) values (${ids.visitB}, ${ids.pb})`);
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id = ${ids.workspace}`);
  await db.execute(sql`delete from "user" where id in (${sql.join(users.map((u) => sql`${u}`), sql`, `)})`);
});

describe("who sees visits", () => {
  it("shows a project's visits to whoever sees the project", async () => {
    for (const user of [ids.admin, ids.auditor, ids.worker, ids.pa]) {
      expect(await as(user, sql`select id from site_visit where project_id = ${ids.projectA}`)).toHaveLength(2);
    }
  });

  it("hides another partner's visits and their people, and a non-crew project's", async () => {
    expect(await as(ids.pa, sql`select id from site_visit where id = ${ids.visitB}`)).toHaveLength(0);
    expect(await as(ids.pa, sql`select user_id from site_visit_member where visit_id = ${ids.visitB}`)).toHaveLength(0);
    expect(await as(ids.worker, sql`select id from site_visit where id = ${ids.visitB}`)).toHaveLength(0);
  });
});

describe("who records and changes visits", () => {
  it("lets whoever works on the project record a visit as themselves, not auditors or outsiders", async () => {
    expect(await writeAs(ids.worker, insertVisit(`${run}-w2`, ids.projectA, ids.worker))).toBe(1);
    expect(await writeAs(ids.pa, insertVisit(`${run}-pa`, ids.projectA, ids.pa))).toBe(1);
    expect(await writeAs(ids.worker, insertVisit(`${run}-as-admin`, ids.projectA, ids.admin))).toBe("refused");
    expect(await writeAs(ids.auditor, insertVisit(`${run}-aud`, ids.projectA, ids.auditor))).toBe("refused");
    expect(await writeAs(ids.pa, insertVisit(`${run}-pb`, ids.projectB, ids.pa))).toBe("refused");
    expect(await writeAs(ids.worker, insertVisit(`${run}-int`, ids.internal, ids.worker))).toBe("refused");
  });

  it("records a visit sent twice once", async () => {
    const id = `${run}-twice`;
    const insert = sql`insert into site_visit (id, project_id, visited_on, created_by)
      values (${id}, ${ids.projectA}, current_date, ${ids.worker}) on conflict (id) do nothing`;
    expect(await writeAs(ids.worker, insert)).toBe(1);
    expect(await writeAs(ids.worker, insert)).toBe(0);
  });

  it("lets the author and admins edit a visit, nobody else", async () => {
    const edit = (id: string) => sql`update site_visit set notes = 'Edited' where id = ${id}`;
    expect(await writeAs(ids.worker, edit(ids.workerVisit))).toBe(1);
    expect(await writeAs(ids.admin, edit(ids.workerVisit))).toBe(1);
    expect(await writeAs(ids.otherWorker, edit(ids.workerVisit))).toBe(0);
    expect(await writeAs(ids.worker, edit(ids.adminVisit))).toBe(0);
    expect(await writeAs(ids.auditor, edit(ids.adminVisit))).toBe(0);
    expect(await writeAs(ids.admin, sql`update site_visit set project_id = ${ids.internal} where id = ${ids.adminVisit}`)).toBe("refused");
  });

  it("lets the author and admins delete a visit, and admins restore it", async () => {
    const del = (user: string, id: string) => as<{ ok: boolean }>(user, sql`select delete_visit(${id}) as ok`);
    expect((await del(ids.otherWorker, ids.workerVisit))[0]?.ok).toBe(false);
    expect((await del(ids.worker, ids.workerVisit))[0]?.ok).toBe(true);
    expect(await as(ids.worker, sql`select id from site_visit where id = ${ids.workerVisit}`)).toHaveLength(0);
    expect(await as(ids.auditor, sql`select id from site_visit where id = ${ids.workerVisit}`)).toHaveLength(1);
    expect(await writeAs(ids.admin, sql`update site_visit set deleted_at = null where id = ${ids.workerVisit}`)).toBe(1);
    expect(await as(ids.worker, sql`select id from site_visit where id = ${ids.workerVisit}`)).toHaveLength(1);
  });

  it("lets only those who change the visit say who was there", async () => {
    const add = (user: string, visit: string, member: string) =>
      writeAs(user, sql`insert into site_visit_member (visit_id, user_id) values (${visit}, ${member})`);
    expect(await add(ids.worker, ids.workerVisit, ids.worker)).toBe(1);
    expect(await add(ids.otherWorker, ids.workerVisit, ids.otherWorker)).toBe("refused");
    expect(await as(ids.pa, sql`select user_id from site_visit_member where visit_id = ${ids.workerVisit}`)).toHaveLength(1);
  });

  it("lists as there only people who could work on the project", async () => {
    const add = (member: string) =>
      writeAs(ids.admin, sql`insert into site_visit_member (visit_id, user_id) values (${ids.adminVisit}, ${member})`);
    expect(await add(ids.auditor)).toBe("refused");
    expect(await add(ids.pb)).toBe("refused");
    expect(await add(ids.pa)).toBe(1);
    expect(await add(ids.otherWorker)).toBe(1);
  });

  it("changes nobody on a deleted visit", async () => {
    const id = `${run}-deleted`;
    await getMaintenanceDb().execute(insertVisit(id, ids.projectA, ids.admin));
    await getMaintenanceDb().execute(sql`update site_visit set deleted_at = now() where id = ${id}`);
    expect(await writeAs(ids.admin, sql`insert into site_visit_member (visit_id, user_id) values (${id}, ${ids.admin})`)).toBe("refused");
  });

  it("can't call the visit functions as PUBLIC", async () => {
    const { rows } = await getMaintenanceDb().execute<{ ok: boolean }>(
      sql`select has_function_privilege('public', 'can_change_visit(text, text)', 'EXECUTE')
             or has_function_privilege('public', 'delete_visit(text)', 'EXECUTE') as ok`,
    );
    expect(rows[0]?.ok).toBe(false);
  });
});
