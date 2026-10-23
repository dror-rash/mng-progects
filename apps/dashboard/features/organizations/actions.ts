"use server";

import { getSession } from "@repo/auth/server";
import { eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";

import { parseOrganizationInput } from "./organization-input";
import { requireOwnedOrganization } from "./require-owned-organization";

export async function createCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const input = parseOrganizationInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  const id = crypto.randomUUID();
  await getDb().insert(schema.organization).values({ id, kind: "customer", ownerId: session.user.id, ...input.value });
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function updateCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const customer = await requireOwnedOrganization(String(formData.get("customerId") ?? ""), "customer");
  const input = parseOrganizationInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  await getDb()
    .update(schema.organization)
    .set({ ...input.value, updatedAt: new Date() })
    .where(eq(schema.organization.id, customer.id));
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function deleteCustomerAction(formData: FormData) {
  const customer = await requireOwnedOrganization(String(formData.get("customerId") ?? ""), "customer");

  await getDb().delete(schema.organization).where(eq(schema.organization.id, customer.id));
  revalidatePath("/customers");
  redirect("/customers");
}
