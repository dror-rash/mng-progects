"use server";

import { eq, getDb, schema, withAccess } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/features/access/require-change";
import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";
import { requireWorkspaceForAction } from "@/features/workspaces/require-workspace";

import { parseOrganizationInput } from "./organization-input";
import { requireOrganizationAccess } from "./require-organization-access";

// Each action does its reads and writes in one `withAccess` transaction, and redirects after it commits.

/** Customer names appear on project lists, project and task pages: refresh the whole zone ("/" is /dashboard). */
function revalidateCustomerNames() {
  revalidatePath("/", "layout");
}

export async function createCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  const result = await withAccess(session.user.id, async () => {
    await requireAdmin(session.user.id, workspace.id);
    const input = parseOrganizationInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData, input.field);
    }

    const id = crypto.randomUUID();
    await getDb()
      .insert(schema.organization)
      .values({ id, kind: "customer", ownerId: session.user.id, workspaceId: workspace.id, ...input.value });
    return { id };
  });
  if (!("id" in result)) {
    return result;
  }
  revalidateCustomerNames();
  redirect(`/customers/${result.id}`);
}

export async function updateCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireActionSession();
  const result = await withAccess(session.user.id, async () => {
    const customer = await requireOrganizationAccess(session.user.id, String(formData.get("customerId") ?? ""), "customer");
    const input = parseOrganizationInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData, input.field);
    }

    await getDb()
      .update(schema.organization)
      .set({ ...input.value, updatedAt: new Date() })
      .where(eq(schema.organization.id, customer.id));
    return { id: customer.id };
  });
  if (!("id" in result)) {
    return result;
  }
  revalidateCustomerNames();
  redirect(`/customers/${result.id}`);
}

/**
 * Soft delete (design rule 8b): the customer, its contacts and notes disappear (they stay as they are and
 * come back when it is restored); its projects stay, hidden from partners. Admins only.
 */
export async function deleteCustomerAction(formData: FormData) {
  const session = await requireActionSession();
  await withAccess(session.user.id, async () => {
    const customer = await requireOrganizationAccess(session.user.id, String(formData.get("customerId") ?? ""), "customer");
    await getDb()
      .update(schema.organization)
      .set({ deletedAt: new Date(), deletedBy: session.user.id })
      .where(eq(schema.organization.id, customer.id));
  });
  revalidateCustomerNames();
  redirect("/customers");
}
