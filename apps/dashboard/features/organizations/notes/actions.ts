"use server";

import { and, eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";

import { type FormState, invalid } from "@/features/forms/form-state";

import { requireOrganizationAccess, requireOrganizationSession } from "../require-organization-access";
import { parseNoteInput } from "./note-input";

export async function addNoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, organization: customer } = await requireOrganizationSession(
    String(formData.get("customerId") ?? ""),
    "customer",
  );
  const input = parseNoteInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  await getDb()
    .insert(schema.organizationNote)
    .values({ id: crypto.randomUUID(), organizationId: customer.id, authorId: session.user.id, ...input.value });
  revalidatePath(`/customers/${customer.id}`);
  return {};
}

export async function deleteNoteAction(formData: FormData) {
  const customer = await requireOrganizationAccess(String(formData.get("customerId") ?? ""), "customer");

  await getDb()
    .delete(schema.organizationNote)
    .where(
      and(
        eq(schema.organizationNote.id, String(formData.get("noteId") ?? "")),
        eq(schema.organizationNote.organizationId, customer.id),
      ),
    );
  revalidatePath(`/customers/${customer.id}`);
}
