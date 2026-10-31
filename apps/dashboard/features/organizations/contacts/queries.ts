import { and, asc, eq, getDb, isNull, schema } from "@repo/db";

/** In the order they were added; the page lists them with `primaryFirst`. */
export async function listContacts(organizationId: string) {
  return getDb()
    .select()
    .from(schema.organizationContact)
    .where(and(eq(schema.organizationContact.organizationId, organizationId), isNull(schema.organizationContact.deletedAt)))
    .orderBy(asc(schema.organizationContact.createdAt));
}

/** The contact, only if it belongs to `organizationId`. Callers check the organization is visible to the user (`getOrganizationForUser`) first. */
export async function getOrganizationContact(organizationId: string, contactId: string) {
  const [contact] = await getDb()
    .select()
    .from(schema.organizationContact)
    .where(
      and(
        eq(schema.organizationContact.id, contactId),
        eq(schema.organizationContact.organizationId, organizationId),
        isNull(schema.organizationContact.deletedAt),
      ),
    );
  return contact ?? null;
}
