import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { CHECK, errorCode, insertSiteOf } from "./db-test-fixtures";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Readings (task 061, ADR-0008) against the migrated database: a reading is one filled form on one visit. Whoever
// can work on the project fills them, as themselves, on a visit that isn't deleted, with the version of a form
// that is Published now in the project's workspace; whoever sees the visit reads them. Append-only.

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  otherWorkspace: `${run}-ws2`,
  admin: `${run}-admin`,
  auditor: `${run}-auditor`,
  worker: `${run}-worker`,
  otherWorker: `${run}-worker2`,
  pa: `${run}-pa`,
  pb: `${run}-pb`,
  outsider: `${run}-outsider`,
  partnerA: `${run}-partner-a`,
  partnerB: `${run}-partner-b`,
  acme: `${run}-acme`,
  projectA: `${run}-project-a`,
  projectB: `${run}-project-b`,
  visitA: `${run}-visit-a`,
  visitB: `${run}-visit-b`,
  deletedVisit: `${run}-visit-deleted`,
  published: `${run}-published`,
  publishedV1: `${run}-published-v1`,
  publishedField: `${run}-published-f1`,
  later: `${run}-later`,
  laterV1: `${run}-later-v1`,
  laterField: `${run}-later-f1`,
  draft: `${run}-draft`,
  draftV1: `${run}-draft-v1`,
  archived: `${run}-archived`,
  archivedV1: `${run}-archived-v1`,
  otherForm: `${run}-other`,
  otherV1: `${run}-other-v1`,
  readingA: `${run}-reading-a`,
  readingB: `${run}-reading-b`,
  readingDeletedVisit: `${run}-reading-dv`,
};
const users = [ids.admin, ids.auditor, ids.worker, ids.otherWorker, ids.pa, ids.pb, ids.outsider];

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

const insertReading = (id: string, visitId: string, versionId: string, by: string) =>
  sql`insert into form_submission (id, visit_id, version_id, "values", submitted_by)
      values (${id}, ${visitId}, ${versionId}, '{"f": 230}'::jsonb, ${by})`;

const sees = async (userId: string, readingId: string) =>
  (await as(userId, sql`select id from form_submission where id = ${readingId}`)).length === 1;

/** A form with one Number field in `workspaceId`, moved to `status` (through published, as the app does). */
async function insertForm(template: string, version: string, workspaceId: string, status: "draft" | "published" | "archived") {
  const db = getMaintenanceDb();
  await db.execute(sql`insert into form_template (id, workspace_id, name) values (${template}, ${workspaceId}, ${template})`);
  await db.execute(sql`insert into form_template_version (id, template_id, version) values (${version}, ${template}, 1)`);
  await db.execute(sql`insert into form_field (id, version_id, label, type, position) values (${`${version}-f1`}, ${version}, 'Voltage', 'number', 1)`);
  if (status !== "draft") await db.execute(sql`update form_template set status = 'published' where id = ${template}`);
  if (status === "archived") await db.execute(sql`update form_template set status = 'archived' where id = ${template}`);
}

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values([
    { id: ids.workspace, name: `Readings ${run}` },
    { id: ids.otherWorkspace, name: `Readings other ${run}` },
  ]);
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
    { workspaceId: ids.otherWorkspace, userId: ids.outsider, role: "admin" },
  ]);
  await db.insert(schema.organization).values({ id: ids.acme, workspaceId: ids.workspace, name: "Acme Ltd" });
  await db.insert(schema.customerPartner).values([
    { organizationId: ids.acme, partnerId: ids.partnerA, workspaceId: ids.workspace },
    { organizationId: ids.acme, partnerId: ids.partnerB, workspaceId: ids.workspace },
  ]);
  const at = { organizationId: ids.acme, siteId: await insertSiteOf(ids.workspace, ids.acme) };
  await db.insert(schema.project).values([
    { id: ids.projectA, name: "A", workspaceId: ids.workspace, ...at, visibility: "partner", partnerId: ids.partnerA },
    { id: ids.projectB, name: "B", workspaceId: ids.workspace, ...at, visibility: "partner", partnerId: ids.partnerB },
  ]);
  await db.execute(sql`insert into project_worker (project_id, user_id, workspace_id) values (${ids.projectA}, ${ids.worker}, ${ids.workspace})`);
  await db.execute(sql`insert into site_visit (id, project_id, visited_on, created_by) values
    (${ids.visitA}, ${ids.projectA}, current_date, ${ids.admin}),
    (${ids.visitB}, ${ids.projectB}, current_date, ${ids.pb}),
    (${ids.deletedVisit}, ${ids.projectA}, current_date, ${ids.admin})`);
  await insertForm(ids.published, ids.publishedV1, ids.workspace, "published");
  await insertForm(ids.later, ids.laterV1, ids.workspace, "published");
  await insertForm(ids.draft, ids.draftV1, ids.workspace, "draft");
  await insertForm(ids.archived, ids.archivedV1, ids.workspace, "archived");
  await insertForm(ids.otherForm, ids.otherV1, ids.otherWorkspace, "published");
  await db.execute(insertReading(ids.readingA, ids.visitA, ids.publishedV1, ids.pa));
  await db.execute(insertReading(ids.readingB, ids.visitB, ids.publishedV1, ids.pb));
  await db.execute(insertReading(ids.readingDeletedVisit, ids.deletedVisit, ids.publishedV1, ids.admin));
  await db.execute(sql`update site_visit set deleted_at = now(), deleted_by = ${ids.admin} where id = ${ids.deletedVisit}`);
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id in (${ids.workspace}, ${ids.otherWorkspace})`);
  await db.execute(sql`delete from "user" where id in (${sql.join(users.map((u) => sql`${u}`), sql`, `)})`);
});

describe("who sees readings", () => {
  it("shows a visit's readings to whoever sees the visit", async () => {
    for (const user of [ids.admin, ids.auditor, ids.worker, ids.pa]) {
      expect(await sees(user, ids.readingA)).toBe(true);
    }
  });

  it("hides them from another partner, a worker off the crew and another workspace", async () => {
    for (const user of [ids.pb, ids.otherWorker, ids.outsider]) {
      expect(await sees(user, ids.readingA)).toBe(false);
    }
    expect(await sees(ids.pa, ids.readingB)).toBe(false);
  });

  it("hides a deleted visit's readings like the visit, and restoring the visit brings them back", async () => {
    expect(await sees(ids.pa, ids.readingDeletedVisit)).toBe(false);
    expect(await sees(ids.worker, ids.readingDeletedVisit)).toBe(false);
    // Admins and auditors still see deleted visits (for the Deleted page), and so their readings.
    expect(await sees(ids.auditor, ids.readingDeletedVisit)).toBe(true);
    await getMaintenanceDb().execute(sql`update site_visit set deleted_at = null where id = ${ids.deletedVisit}`);
    expect(await sees(ids.pa, ids.readingDeletedVisit)).toBe(true);
    await getMaintenanceDb().execute(sql`update site_visit set deleted_at = now() where id = ${ids.deletedVisit}`);
  });

  it("keeps a reading's fields readable after its form is archived", async () => {
    const id = `${run}-before-archive`;
    expect(await writeAs(ids.pa, insertReading(id, ids.visitA, ids.laterV1, ids.pa))).toBe(1);
    await getMaintenanceDb().execute(sql`update form_template set status = 'archived' where id = ${ids.later}`);
    expect(await sees(ids.pa, id)).toBe(true);
    const fields = await as(ids.pa, sql`select f.id from form_submission s join form_field f on f.version_id = s.version_id where s.id = ${id}`);
    expect(fields).toHaveLength(1);
  });
});

describe("who fills readings", () => {
  it("lets whoever works on the project fill one as themselves", async () => {
    expect(await writeAs(ids.admin, insertReading(`${run}-by-admin`, ids.visitA, ids.publishedV1, ids.admin))).toBe(1);
    expect(await writeAs(ids.worker, insertReading(`${run}-by-worker`, ids.visitA, ids.publishedV1, ids.worker))).toBe(1);
    expect(await writeAs(ids.pa, insertReading(`${run}-by-pa`, ids.visitA, ids.publishedV1, ids.pa))).toBe(1);
  });

  it("refuses auditors, outsiders and filling in someone else's name", async () => {
    expect(await writeAs(ids.auditor, insertReading(`${run}-by-auditor`, ids.visitA, ids.publishedV1, ids.auditor))).toBe("refused");
    expect(await writeAs(ids.otherWorker, insertReading(`${run}-off-crew`, ids.visitA, ids.publishedV1, ids.otherWorker))).toBe("refused");
    expect(await writeAs(ids.pb, insertReading(`${run}-by-pb`, ids.visitA, ids.publishedV1, ids.pb))).toBe("refused");
    expect(await writeAs(ids.pa, insertReading(`${run}-on-b`, ids.visitB, ids.publishedV1, ids.pa))).toBe("refused");
    expect(await writeAs(ids.outsider, insertReading(`${run}-outsider`, ids.visitA, ids.publishedV1, ids.outsider))).toBe("refused");
    expect(await writeAs(ids.worker, insertReading(`${run}-as-pa`, ids.visitA, ids.publishedV1, ids.pa))).toBe("refused");
  });

  it("refuses a deleted visit and a made-up one", async () => {
    expect(await writeAs(ids.admin, insertReading(`${run}-dv`, ids.deletedVisit, ids.publishedV1, ids.admin))).toBe("refused");
    expect(await writeAs(ids.admin, insertReading(`${run}-mv`, `${run}-made-up`, ids.publishedV1, ids.admin))).toBe("refused");
  });

  it("takes only the version of a form that is Published now in the project's workspace, for admins too", async () => {
    for (const version of [ids.draftV1, ids.archivedV1, ids.otherV1, `${run}-made-up-version`]) {
      expect(await writeAs(ids.admin, insertReading(`${run}-v-${version}`, ids.visitA, version, ids.admin))).toBe("refused");
      expect(await writeAs(ids.pa, insertReading(`${run}-pv-${version}`, ids.visitA, version, ids.pa))).toBe("refused");
    }
  });

  it("records a reading sent twice once", async () => {
    const insert = sql`insert into form_submission (id, visit_id, version_id, "values", submitted_by)
      values (${`${run}-twice`}, ${ids.visitA}, ${ids.publishedV1}, '{}'::jsonb, ${ids.worker}) on conflict (id) do nothing`;
    expect(await writeAs(ids.worker, insert)).toBe(1);
    expect(await writeAs(ids.worker, insert)).toBe(0);
  });
});

describe("readings are append-only", () => {
  it("changes and deletes nothing for anyone at runtime", async () => {
    for (const user of [ids.admin, ids.pa]) {
      expect(await writeAs(user, sql`update form_submission set "values" = '{}'::jsonb where id = ${ids.readingA}`)).toBe(0);
      expect(await writeAs(user, sql`delete from form_submission where id = ${ids.readingA}`)).toBe(0);
    }
    expect(await sees(ids.admin, ids.readingA)).toBe(true);
  });

  it("keeps a reading's visit, version and author, even for the owner", async () => {
    const db = getMaintenanceDb();
    expect(await errorCode(db.execute(sql`update form_submission set visit_id = ${ids.visitB} where id = ${ids.readingA}`))).toBe(CHECK);
    expect(await errorCode(db.execute(sql`update form_submission set version_id = ${ids.laterV1} where id = ${ids.readingA}`))).toBe(CHECK);
    expect(await errorCode(db.execute(sql`update form_submission set submitted_by = ${ids.admin} where id = ${ids.readingA}`))).toBe(CHECK);
  });
});
