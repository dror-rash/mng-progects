import { and, asc, desc, eq, getDb, schema, sql, withAccess } from "@repo/db";

import { canChangeFormTemplate, canSeeFormTemplate, hasWorkspaceRole } from "@/features/access/predicates";

import { formStatusOf } from "./form-status";

// Reading forms (task 060, ADR-0008). The pages are for admins and auditors of a form's workspace; workers and
// partners' users read published forms only through the database, to fill them in (task 061). Forms are never
// deleted (archived instead), so there is no `deleted_at` to filter.

/** A form `userId` sees on the Reading forms pages: `can_see_form_template`, as an admin or auditor. */
function onFormPages(userId: string) {
  return and(
    canSeeFormTemplate(userId, schema.formTemplate.id),
    hasWorkspaceRole(userId, schema.formTemplate.workspaceId, ["admin", "auditor"]),
  );
}

/** The form's latest version's id (one version per form until new versions come, see the task's parking lot). */
const latestVersionId = sql<string | null>`(select v.id from form_template_version v
  where v.template_id = form_template.id order by v.version desc limit 1)`;

/** The workspace's reading forms, newest first, with their status and field count. */
export async function listReadingForms(userId: string, workspaceId: string) {
  const rows = await withAccess(userId, () =>
    getDb()
      .select({
        id: schema.formTemplate.id,
        name: schema.formTemplate.name,
        status: schema.formTemplate.status,
        // Plain SQL: Drizzle leaves columns unqualified in select fields, which a correlated subquery can't use.
        fieldCount: sql<number>`(select count(*) from form_field f where f.version_id = ${latestVersionId})::int`,
      })
      .from(schema.formTemplate)
      .where(and(eq(schema.formTemplate.workspaceId, workspaceId), onFormPages(userId)))
      .orderBy(desc(schema.formTemplate.createdAt), desc(schema.formTemplate.id)),
  );
  return rows.map((row) => ({ ...row, status: formStatusOf(row.status) }));
}

/**
 * The form with its latest version's fields in order, and whether `userId` may change it (admins); null when
 * it doesn't exist or they can't open its page.
 */
export async function getReadingFormForUser(userId: string, formId: string) {
  return withAccess(userId, async () => {
    const db = getDb();
    const [form] = await db
      .select({
        id: schema.formTemplate.id,
        workspaceId: schema.formTemplate.workspaceId,
        name: schema.formTemplate.name,
        description: schema.formTemplate.description,
        status: schema.formTemplate.status,
        versionId: latestVersionId,
        canChange: canChangeFormTemplate(userId, schema.formTemplate.id),
      })
      .from(schema.formTemplate)
      .where(and(eq(schema.formTemplate.id, formId), onFormPages(userId)));
    if (!form) return null;
    const fields = form.versionId
      ? await db
          .select({
            id: schema.formField.id,
            label: schema.formField.label,
            type: schema.formField.type,
            required: schema.formField.required,
            unit: schema.formField.unit,
            options: schema.formField.options,
          })
          .from(schema.formField)
          .where(eq(schema.formField.versionId, form.versionId))
          .orderBy(asc(schema.formField.position), asc(schema.formField.id))
      : [];
    return { ...form, status: formStatusOf(form.status), fields };
  });
}
