"use server";

import { withAccess } from "@repo/db";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";
import { requireWorkspaceForAction } from "@/features/workspaces/require-workspace";

import { copyProject } from "./copy";
import { parseProjectInput } from "./project-input";
import { customerAllowed, newProjectOwner } from "./project-owner-check";
import { getProjectForUser } from "./queries";
import { revalidateOverviews } from "./revalidate";

/**
 * The copy page's form (rule 4a): a new project from `sourceId`, with the chosen name, customer and owner
 * (partners: their own partner; admins: the Owner select). Posts the source's `workspaceId`, where the
 * copy goes. Redirects to the new project.
 */
export async function copyProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  const sourceId = String(formData.get("sourceId") ?? "");
  const result = await withAccess(session.user.id, async () => {
    const source = await getProjectForUser(session.user.id, sourceId);
    // Someone else's project, a made-up id, or a form posted for another workspace: all look missing.
    if (!source?.canChange || source.workspaceId !== workspace.id) {
      throw new Error("Not found");
    }
    const owner = await newProjectOwner(session.user.id, workspace, formData);
    if (!owner) {
      return invalid("Choose an owner", formData, "owner");
    }
    const input = parseProjectInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData);
    }
    if (!(await customerAllowed(workspace.id, owner.partnerId, input.value.organizationId))) {
      const error = owner.partnerId && workspace.role === "admin" ? "Choose a customer assigned to this partner" : "Choose one of your customers";
      return invalid(error, formData, "customerId");
    }
    const id = await copyProject(session.user.id, source.id, {
      name: input.value.name,
      ownerPartnerId: owner.partnerId,
      customerId: input.value.organizationId,
    });
    return { id };
  });
  if (!("id" in result)) {
    return result;
  }
  revalidateOverviews();
  redirect(`/projects/${result.id}`);
}
