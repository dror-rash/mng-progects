import { and, asc, eq, getDb, inArray, schema } from "@repo/db";

export async function listContacts(organizationId: string) {
  return getDb()
    .select()
    .from(schema.organizationContact)
    .where(eq(schema.organizationContact.organizationId, organizationId))
    .orderBy(asc(schema.organizationContact.createdAt));
}

/** The contact, only if it belongs to `organizationId`. Callers check organization ownership first. */
export async function getOrganizationContact(organizationId: string, contactId: string) {
  const [contact] = await getDb()
    .select()
    .from(schema.organizationContact)
    .where(
      and(eq(schema.organizationContact.id, contactId), eq(schema.organizationContact.organizationId, organizationId)),
    );
  return contact ?? null;
}

/** The first-added contact's name for each organization, for list views. */
export async function firstContactNames(organizationIds: string[]) {
  if (organizationIds.length === 0) return new Map<string, string>();
  const rows = await getDb()
    .select({ organizationId: schema.organizationContact.organizationId, name: schema.organizationContact.name })
    .from(schema.organizationContact)
    .where(inArray(schema.organizationContact.organizationId, organizationIds))
    .orderBy(asc(schema.organizationContact.createdAt));
  const names = new Map<string, string>();
  for (const row of rows) if (!names.has(row.organizationId)) names.set(row.organizationId, row.name);
  return names;
}
