"use server";

import { and, eq, exists, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";

import { requireOrganizationAccess } from "../require-organization-access";
import { parseContactInput } from "./contact-input";

function contactOf(formData: FormData, organizationId: string) {
  return and(
    eq(schema.organizationContact.id, String(formData.get("contactId") ?? "")),
    eq(schema.organizationContact.organizationId, organizationId),
  );
}

function revalidateCustomer(customerId: string) {
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}

export async function addContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const customer = await requireOrganizationAccess(String(formData.get("customerId") ?? ""), "customer");
  const input = parseContactInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  await getDb()
    .insert(schema.organizationContact)
    .values({ id: crypto.randomUUID(), organizationId: customer.id, ...input.value });
  revalidateCustomer(customer.id);
  return {};
}

export async function updateContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const customer = await requireOrganizationAccess(String(formData.get("customerId") ?? ""), "customer");
  const input = parseContactInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  const updated = await getDb()
    .update(schema.organizationContact)
    .set({ ...input.value, updatedAt: new Date() })
    .where(contactOf(formData, customer.id))
    .returning({ id: schema.organizationContact.id });
  if (updated.length === 0) {
    return invalid("This contact no longer exists", formData);
  }
  revalidateCustomer(customer.id);
  redirect(`/customers/${customer.id}`);
}

export async function removeContactAction(formData: FormData) {
  const customer = await requireOrganizationAccess(String(formData.get("customerId") ?? ""), "customer");

  await getDb().delete(schema.organizationContact).where(contactOf(formData, customer.id));
  revalidateCustomer(customer.id);
}

/** Makes the contact the customer's primary one; only a contact of that same customer qualifies. */
export async function makePrimaryContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const customer = await requireOrganizationAccess(String(formData.get("customerId") ?? ""), "customer");
  const db = getDb();

  const contactId = String(formData.get("contactId") ?? "");
  const updated = await db
    .update(schema.organization)
    .set({ primaryContactId: contactId })
    .where(
      and(
        eq(schema.organization.id, customer.id),
        exists(db.select({ id: schema.organizationContact.id }).from(schema.organizationContact).where(contactOf(formData, customer.id))),
      ),
    )
    .returning({ id: schema.organization.id });
  if (updated.length === 0) {
    return invalid("This contact no longer exists", formData);
  }
  revalidateCustomer(customer.id);
  return {};
}
