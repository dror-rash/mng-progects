"use server";

import { eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";
import { requireWorkspaceForAction } from "@/features/workspaces/require-workspace";

import { parseOrganizationInput } from "./organization-input";
import { requireOrganizationAccess } from "./require-organization-access";

/** Customer names appear on project lists, project and task pages: refresh the whole zone ("/" is /dashboard). */
function revalidateCustomerNames() {
  revalidatePath("/", "layout");
}

export async function createCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction();
  const input = parseOrganizationInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  const id = crypto.randomUUID();
  await getDb()
    .insert(schema.organization)
    .values({ id, kind: "customer", ownerId: session.user.id, workspaceId: workspace.id, ...input.value });
  revalidateCustomerNames();
  redirect(`/customers/${id}`);
}

export async function updateCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const customer = await requireOrganizationAccess(String(formData.get("customerId") ?? ""), "customer");
  const input = parseOrganizationInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  await getDb()
    .update(schema.organization)
    .set({ ...input.value, updatedAt: new Date() })
    .where(eq(schema.organization.id, customer.id));
  revalidateCustomerNames();
  redirect(`/customers/${customer.id}`);
}

export async function deleteCustomerAction(formData: FormData) {
  const customer = await requireOrganizationAccess(String(formData.get("customerId") ?? ""), "customer");

  await getDb().delete(schema.organization).where(eq(schema.organization.id, customer.id));
  revalidateCustomerNames();
  redirect("/customers");
}
