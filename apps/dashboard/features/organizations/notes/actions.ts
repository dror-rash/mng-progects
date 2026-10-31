"use server";

import { and, eq, getDb, schema, withAccess } from "@repo/db";
import { revalidatePath } from "next/cache";

import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";

import { requireOrganizationAccess } from "../require-organization-access";
import { parseNoteInput } from "./note-input";

export async function addNoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireActionSession();
  const result = await withAccess(session.user.id, async () => {
    const customer = await requireOrganizationAccess(session.user.id, String(formData.get("customerId") ?? ""), "customer");
    const input = parseNoteInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData, input.field);
    }

    await getDb()
      .insert(schema.organizationNote)
      .values({ id: crypto.randomUUID(), organizationId: customer.id, authorId: session.user.id, ...input.value });
    return { customerId: customer.id };
  });
  if (!("customerId" in result)) {
    return result;
  }
  revalidatePath(`/customers/${result.customerId}`);
  return {};
}

export async function deleteNoteAction(formData: FormData) {
  const session = await requireActionSession();
  const customerId = await withAccess(session.user.id, async () => {
    const customer = await requireOrganizationAccess(session.user.id, String(formData.get("customerId") ?? ""), "customer");
    await getDb()
      .delete(schema.organizationNote)
      .where(
        and(
          eq(schema.organizationNote.id, String(formData.get("noteId") ?? "")),
          eq(schema.organizationNote.organizationId, customer.id),
        ),
      );
    return customer.id;
  });
  revalidatePath(`/customers/${customerId}`);
}
