import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb, withAccess } from "./client";
import { CHECK, errorCode } from "./db-test-fixtures";

/** Row-level security's "new row violates row-level security policy". */
const RLS = "42501";
import { getMaintenanceDb } from "./maintenance";
import * as schema from "./schema";

// Reading forms (task 060, ADR-0008) against the migrated database: admins build and publish them, auditors
// read every form, workers and partner users only published and archived ones, other workspaces nothing.
// A published version and its fields never change, whoever asks (the owner bypasses RLS, not the trigger).

const run = crypto.randomUUID().slice(0, 8);
const ids = {
  workspace: `${run}-ws`,
  otherWorkspace: `${run}-ws2`,
  admin: `${run}-admin`,
  auditor: `${run}-auditor`,
  worker: `${run}-worker`,
  pa: `${run}-pa`,
  outsider: `${run}-outsider`,
  partnerA: `${run}-partner-a`,
  draft: `${run}-draft`,
  draftV1: `${run}-draft-v1`,
  draftField: `${run}-draft-f1`,
  published: `${run}-published`,
  publishedV1: `${run}-published-v1`,
  publishedField: `${run}-published-f1`,
  archived: `${run}-archived`,
  archivedV1: `${run}-archived-v1`,
  archivedField: `${run}-archived-f1`,
};
const users = [ids.admin, ids.auditor, ids.worker, ids.pa, ids.outsider];

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

const insertTemplate = (id: string, workspaceId = ids.workspace, status = "draft") =>
  sql`insert into form_template (id, workspace_id, name, status) values (${id}, ${workspaceId}, 'Panel check', ${status})`;
/** Publishing is a status change on the form; the database publishes (freezes) its latest version with it. */
const setStatus = (templateId: string, status: string) => sql`update form_template set status = ${status} where id = ${templateId}`;
const insertVersion = (id: string, templateId: string) =>
  sql`insert into form_template_version (id, template_id, version) values (${id}, ${templateId}, 1)`;
const publish = (versionId: string) => sql`update form_template_version set published_at = now() where id = ${versionId}`;
const insertField = (id: string, versionId: string, type = "number", options: string[] | null = null) =>
  sql`insert into form_field (id, version_id, label, type, options, position)
      values (${id}, ${versionId}, 'Voltage', ${type}, ${options === null ? null : sql.param(options)}::text[], 1)`;

const formIds = (userId: string) =>
  as<{ id: string }>(userId, sql`select id from form_template where workspace_id = ${ids.workspace} order by id`).then((rows) =>
    rows.map((r) => r.id),
  );

beforeAll(async () => {
  const db = getMaintenanceDb();
  await db.insert(schema.user).values(users.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspace).values([
    { id: ids.workspace, name: `Forms ${run}` },
    { id: ids.otherWorkspace, name: `Forms other ${run}` },
  ]);
  await db.insert(schema.partner).values({ id: ids.partnerA, workspaceId: ids.workspace, name: "Partner A" });
  await db.insert(schema.workspaceMember).values([
    { workspaceId: ids.workspace, userId: ids.admin, role: "admin" },
    { workspaceId: ids.workspace, userId: ids.auditor, role: "auditor" },
    { workspaceId: ids.workspace, userId: ids.worker, role: "worker" },
    { workspaceId: ids.workspace, userId: ids.pa, role: "partner", partnerId: ids.partnerA },
    { workspaceId: ids.otherWorkspace, userId: ids.outsider, role: "admin" },
  ]);
  for (const [template, version, field] of [
    [ids.draft, ids.draftV1, ids.draftField],
    [ids.published, ids.publishedV1, ids.publishedField],
    [ids.archived, ids.archivedV1, ids.archivedField],
  ] as const) {
    await db.execute(insertTemplate(template));
    await db.execute(insertVersion(version, template));
    await db.execute(insertField(field, version));
  }
  await db.execute(setStatus(ids.published, "published"));
  await db.execute(setStatus(ids.archived, "published"));
  await db.execute(setStatus(ids.archived, "archived"));
});

afterAll(async () => {
  const db = getMaintenanceDb();
  await db.execute(sql`delete from workspace where id in (${ids.workspace}, ${ids.otherWorkspace})`);
  await db.execute(sql`delete from "user" where id in (${sql.join(users.map((u) => sql`${u}`), sql`, `)})`);
});

describe("who sees reading forms", () => {
  it("shows admins and auditors every form, drafts too, with their versions and fields", async () => {
    for (const user of [ids.admin, ids.auditor]) {
      expect(await formIds(user)).toEqual([ids.archived, ids.draft, ids.published].sort());
      expect(await as(user, sql`select id from form_template_version where id = ${ids.draftV1}`)).toHaveLength(1);
      expect(await as(user, sql`select id from form_field where id = ${ids.draftField}`)).toHaveLength(1);
    }
  });

  it("shows workers and partner users published and archived forms only", async () => {
    for (const user of [ids.worker, ids.pa]) {
      expect(await formIds(user)).toEqual([ids.archived, ids.published].sort());
      expect(await as(user, sql`select id from form_template_version where id = ${ids.draftV1}`)).toHaveLength(0);
      expect(await as(user, sql`select id from form_field where id = ${ids.draftField}`)).toHaveLength(0);
      expect(await as(user, sql`select id from form_field where id = ${ids.publishedField}`)).toHaveLength(1);
    }
  });

  it("shows another workspace's members nothing", async () => {
    expect(await formIds(ids.outsider)).toEqual([]);
    expect(await as(ids.outsider, sql`select id from form_field where id = ${ids.publishedField}`)).toHaveLength(0);
  });

  it("tells another workspace nothing about a version: published, draft or made up, its fields are refused alike", async () => {
    const insertAs = (versionId: string) =>
      errorCode(withAccess(ids.outsider, () => getDb().execute(insertField(`${run}-probe-${versionId}`, versionId))));
    expect(await insertAs(ids.publishedV1)).toBe(RLS);
    expect(await insertAs(ids.draftV1)).toBe(RLS);
    expect(await insertAs(`${run}-made-up`)).toBe(RLS);
  });

  it("can't call the access functions as PUBLIC", async () => {
    const { rows } = await getMaintenanceDb().execute<{ ok: boolean }>(
      sql`select has_function_privilege('public', 'can_see_form_template(text, text)', 'EXECUTE')
             or has_function_privilege('public', 'can_change_form_template(text, text)', 'EXECUTE')
             or has_function_privilege('public', 'can_see_form_version(text, text)', 'EXECUTE')
             or has_function_privilege('public', 'can_change_form_version(text, text)', 'EXECUTE') as ok`,
    );
    expect(rows[0]?.ok).toBe(false);
  });
});

describe("who changes reading forms", () => {
  it("lets admins create a form with a version and fields, and remove a field of a draft", async () => {
    const form = `${run}-admin-form`;
    expect(await writeAs(ids.admin, insertTemplate(form))).toBe(1);
    expect(await writeAs(ids.admin, insertVersion(`${form}-v1`, form))).toBe(1);
    expect(await writeAs(ids.admin, insertField(`${form}-f1`, `${form}-v1`))).toBe(1);
    expect(await writeAs(ids.admin, sql`delete from form_field where id = ${`${form}-f1`}`)).toBe(1);
    expect(await writeAs(ids.admin, sql`update form_template set name = 'Renamed' where id = ${form}`)).toBe(1);
  });

  it("refuses new forms from everyone else", async () => {
    for (const user of [ids.auditor, ids.worker, ids.pa, ids.outsider]) {
      expect(await writeAs(user, insertTemplate(`${run}-${user}-form`))).toBe("refused");
    }
  });

  it("refuses changes to a draft's form, version and fields from everyone else", async () => {
    for (const user of [ids.auditor, ids.worker, ids.pa, ids.outsider]) {
      expect(await writeAs(user, sql`update form_template set name = 'Mine' where id = ${ids.draft}`)).toBe(0);
      expect(await writeAs(user, insertField(`${run}-${user}-field`, ids.draftV1))).toBe("refused");
      expect(await writeAs(user, sql`update form_field set label = 'Mine' where id = ${ids.draftField}`)).toBe(0);
      expect(await writeAs(user, sql`delete from form_field where id = ${ids.draftField}`)).toBe(0);
      expect(await writeAs(user, sql`update form_template_version set published_at = now() where id = ${ids.draftV1}`)).toBe(0);
    }
  });

  it("keeps a form in its workspace", async () => {
    expect(await errorCode(getMaintenanceDb().execute(sql`update form_template set workspace_id = ${ids.otherWorkspace} where id = ${ids.draft}`))).toBe(CHECK);
  });

  it("moves a form's status forward only", async () => {
    expect(await errorCode(getMaintenanceDb().execute(sql`update form_template set status = 'draft' where id = ${ids.published}`))).toBe(CHECK);
    expect(await errorCode(getMaintenanceDb().execute(sql`update form_template set status = 'published' where id = ${ids.archived}`))).toBe(CHECK);
    expect(await errorCode(getMaintenanceDb().execute(sql`update form_template set status = 'archived' where id = ${ids.draft}`))).toBe(CHECK);
  });
});

describe("a published version", () => {
  it("is published with its form by an admin, and then can't change", async () => {
    const form = `${run}-publish`;
    await getMaintenanceDb().execute(insertTemplate(form));
    await getMaintenanceDb().execute(insertVersion(`${form}-v1`, form));
    await getMaintenanceDb().execute(insertField(`${form}-f1`, `${form}-v1`));
    expect(await writeAs(ids.admin, setStatus(form, "published"))).toBe(1);
    const { rows } = await getMaintenanceDb().execute<{ published: boolean }>(
      sql`select published_at is not null as published from form_template_version where id = ${`${form}-v1`}`,
    );
    expect(rows[0]?.published).toBe(true);
    expect(await writeAs(ids.admin, insertField(`${form}-f2`, `${form}-v1`))).toBe("refused");
    expect(await writeAs(ids.admin, sql`delete from form_field where id = ${`${form}-f1`}`)).toBe(0);
  });

  it("can't be published while its form is a draft", async () => {
    expect(await errorCode(getMaintenanceDb().execute(publish(ids.draftV1)))).toBe(CHECK);
    expect(await writeAs(ids.admin, publish(ids.draftV1))).toBe("refused");
  });

  it("is never inserted published, nor is a form inserted past draft", async () => {
    const db = getMaintenanceDb();
    expect(await errorCode(db.execute(insertTemplate(`${run}-born-published`, ids.workspace, "published")))).toBe(CHECK);
    expect(await errorCode(db.execute(sql`insert into form_template_version (id, template_id, version, published_at)
      values (${`${run}-v2`}, ${ids.draft}, 2, now())`))).toBe(CHECK);
  });

  it("needs a field before its form can be published", async () => {
    const form = `${run}-empty`;
    await getMaintenanceDb().execute(insertTemplate(form));
    await getMaintenanceDb().execute(insertVersion(`${form}-v1`, form));
    expect(await errorCode(getMaintenanceDb().execute(setStatus(form, "published")))).toBe(CHECK);
  });

  it("refuses any change to it or its fields, even from the owner", async () => {
    const db = getMaintenanceDb();
    expect(await errorCode(db.execute(insertField(`${run}-late`, ids.publishedV1)))).toBe(CHECK);
    expect(await errorCode(db.execute(sql`update form_field set label = 'Changed' where id = ${ids.publishedField}`))).toBe(CHECK);
    expect(await errorCode(db.execute(sql`delete from form_field where id = ${ids.publishedField}`))).toBe(CHECK);
    expect(await errorCode(db.execute(sql`update form_template_version set published_at = null where id = ${ids.publishedV1}`))).toBe(CHECK);
    expect(await errorCode(db.execute(sql`delete from form_template_version where id = ${ids.publishedV1}`))).toBe(CHECK);
  });

  it("keeps a draft's field on its version", async () => {
    expect(await errorCode(getMaintenanceDb().execute(sql`update form_field set version_id = ${ids.publishedV1} where id = ${ids.draftField}`))).toBe(CHECK);
  });

  it("goes with its workspace when the workspace is deleted", async () => {
    const db = getMaintenanceDb();
    const workspace = `${run}-gone`;
    await db.insert(schema.workspace).values({ id: workspace, name: `Gone ${run}` });
    await db.execute(insertTemplate(`${workspace}-form`, workspace));
    await db.execute(insertVersion(`${workspace}-v1`, `${workspace}-form`));
    await db.execute(insertField(`${workspace}-f1`, `${workspace}-v1`));
    await db.execute(setStatus(`${workspace}-form`, "published"));
    expect(await errorCode(db.execute(sql`delete from workspace where id = ${workspace}`))).toBe("succeeded");
    const { rows } = await db.execute(sql`select id from form_field where id = ${`${workspace}-f1`}`);
    expect(rows).toHaveLength(0);
  });
});

describe("what a field may hold", () => {
  it("takes a unit only on a number field, and two or more options exactly on a choice field", async () => {
    const db = getMaintenanceDb();
    expect(await errorCode(db.execute(sql`insert into form_field (id, version_id, label, type, unit, position)
      values (${`${run}-u`}, ${ids.draftV1}, 'Notes', 'text', 'V', 2)`))).toBe(CHECK);
    expect(await errorCode(db.execute(insertField(`${run}-c1`, ids.draftV1, "choice", ["Good"])))).toBe(CHECK);
    expect(await errorCode(db.execute(insertField(`${run}-c0`, ids.draftV1, "choice")))).toBe(CHECK);
    expect(await errorCode(db.execute(insertField(`${run}-t`, ids.draftV1, "text", ["Good", "Bad"])))).toBe(CHECK);
    expect(await errorCode(db.execute(insertField(`${run}-c2`, ids.draftV1, "choice", ["Good", "Worn"])))).toBe("succeeded");
    expect(await errorCode(db.execute(insertField(`${run}-x`, ids.draftV1, "photo")))).toBe(CHECK);
  });
});
