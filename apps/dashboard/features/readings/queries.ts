import { and, asc, desc, eq, getDb, isNotNull, isNull, schema, type SQL, withAccess } from "@repo/db";

import { canSeeFormTemplate, canSeeProject } from "@/features/access/predicates";

import type { ReadingField, ReadingValues } from "./reading-values";

// Readings (task 061, ADR-0008). Row-level security shows a reading to whoever sees its visit; these also
// check the project with `canSeeProject` and filter deleted visits and readings, so a deleted visit's readings
// are "not found" like made-up ones. Forms aren't private per customer: any published form of the project's
// workspace is offered to whoever can work on the project (callers check that).

const author = schema.user;
const version = schema.formTemplateVersion;
const form = schema.formTemplate;
const reading = schema.formSubmission;
const visit = schema.siteVisit;

async function fieldsOf(versionId: string): Promise<ReadingField[]> {
  return getDb()
    .select({
      id: schema.formField.id,
      label: schema.formField.label,
      type: schema.formField.type,
      required: schema.formField.required,
      unit: schema.formField.unit,
      options: schema.formField.options,
    })
    .from(schema.formField)
    .where(eq(schema.formField.versionId, versionId))
    .orderBy(asc(schema.formField.position), asc(schema.formField.id));
}

/** A form that can be filled now: Published, in `workspaceId`, through its published version. */
function openForm(userId: string, workspaceId: string) {
  return and(
    eq(form.workspaceId, workspaceId),
    eq(form.status, "published"),
    isNotNull(version.publishedAt),
    canSeeFormTemplate(userId, form.id),
  );
}

/** The workspace's forms that can be filled now, by name: the "Add a reading" list. */
export async function listOpenForms(userId: string, workspaceId: string) {
  return withAccess(userId, () =>
    getDb()
      .selectDistinct({ id: form.id, name: form.name, description: form.description })
      .from(form)
      .innerJoin(version, eq(version.templateId, form.id))
      .where(openForm(userId, workspaceId))
      .orderBy(asc(form.name), asc(form.id)),
  );
}

async function findOpenForm(userId: string, workspaceId: string, which: SQL | undefined) {
  return withAccess(userId, async () => {
    const [row] = await getDb()
      .select({ formId: form.id, name: form.name, description: form.description, versionId: version.id })
      .from(form)
      .innerJoin(version, eq(version.templateId, form.id))
      .where(and(which, openForm(userId, workspaceId)))
      .orderBy(desc(version.version))
      .limit(1);
    return row ? { ...row, fields: await fieldsOf(row.versionId) } : null;
  });
}

/** The form `formId` with its published version's fields, if it can be filled now in `workspaceId`; otherwise null. */
export async function getOpenForm(userId: string, workspaceId: string, formId: string) {
  return findOpenForm(userId, workspaceId, eq(form.id, formId));
}

/**
 * The version `versionId` with its fields, if it is the published version of a form that is Published now in
 * `workspaceId`; otherwise null (a draft's, an archived form's, another workspace's, made up).
 */
export async function getOpenFormVersion(userId: string, workspaceId: string, versionId: string) {
  return findOpenForm(userId, workspaceId, eq(version.id, versionId));
}

/** Readings `userId` sees, of visits that aren't deleted, newest first. */
function listReadings(userId: string, where: SQL | undefined) {
  return withAccess(userId, () =>
    getDb()
      .select({
        id: reading.id,
        visitId: reading.visitId,
        formName: form.name,
        visitedOn: visit.visitedOn,
        authorName: author.name,
      })
      .from(reading)
      .innerJoin(visit, eq(visit.id, reading.visitId))
      .innerJoin(version, eq(version.id, reading.versionId))
      .innerJoin(form, eq(form.id, version.templateId))
      .leftJoin(author, eq(author.id, reading.submittedBy))
      .where(and(where, canSeeProject(userId, visit.projectId), isNull(visit.deletedAt), isNull(reading.deletedAt)))
      .orderBy(desc(reading.submittedAt), desc(reading.id)),
  );
}

/** The visit's readings (callers check the visit). */
export async function listVisitReadings(userId: string, visitId: string) {
  return listReadings(userId, eq(reading.visitId, visitId));
}

/** The readings of the project's visits, newest first. */
export async function listProjectReadings(userId: string, projectId: string) {
  return listReadings(userId, eq(visit.projectId, projectId));
}

/**
 * The reading, only if it is one of the visit's, the visit one of the project's (neither deleted) and `userId`
 * sees it: the form's name, the visit's day, who filled it in, and its version's fields with their values.
 */
export async function getReading(userId: string, projectId: string, visitId: string, readingId: string) {
  return withAccess(userId, async () => {
    const [row] = await getDb()
      .select({
        id: reading.id,
        versionId: reading.versionId,
        values: reading.values,
        formName: form.name,
        visitedOn: visit.visitedOn,
        authorName: author.name,
        submittedAt: reading.submittedAt,
      })
      .from(reading)
      .innerJoin(visit, eq(visit.id, reading.visitId))
      .innerJoin(version, eq(version.id, reading.versionId))
      .innerJoin(form, eq(form.id, version.templateId))
      .leftJoin(author, eq(author.id, reading.submittedBy))
      .where(
        and(
          eq(reading.id, readingId),
          eq(reading.visitId, visitId),
          eq(visit.projectId, projectId),
          canSeeProject(userId, visit.projectId),
          isNull(visit.deletedAt),
          isNull(reading.deletedAt),
        ),
      );
    if (!row) return null;
    return { ...row, values: row.values as ReadingValues, fields: await fieldsOf(row.versionId) };
  });
}

/** Whether `readingId` is a reading `userId` filled in on the visit: a form they sent before. */
export async function isMyReading(userId: string, visitId: string, readingId: string) {
  return withAccess(userId, async () => {
    const [row] = await getDb()
      .select({ id: reading.id })
      .from(reading)
      .where(and(eq(reading.id, readingId), eq(reading.visitId, visitId), eq(reading.submittedBy, userId)));
    return row !== undefined;
  });
}
