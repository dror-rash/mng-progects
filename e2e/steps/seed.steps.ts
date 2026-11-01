import { expect } from "@playwright/test";
import { and, eq, inArray, schema } from "@repo/db";
import { getMaintenanceDb } from "@repo/db/maintenance";

import { Given, origin, userId, When } from "./fixtures";

// Data the app's forms can't produce, written straight to the test database (DATABASE_URL) through the
// maintenance connection (row-level security doesn't apply), to check that pages don't trust it. Only
// rows belonging to this scenario's own people are touched.

/** The ids of the workspaces `memberId` belongs to, as a subquery. */
function workspacesOf(memberId: string) {
  return getMaintenanceDb()
    .select({ id: schema.workspaceMember.workspaceId })
    .from(schema.workspaceMember)
    .where(eq(schema.workspaceMember.userId, memberId));
}

// Removing a member through the app clears their assignments; this leaves one behind.
When("the teammate's membership is removed directly, keeping the assignment", async ({ page, state }) => {
  const me = await userId(page);
  const teammate = await userId(state.teammate!);
  const removed = await getMaintenanceDb()
    .delete(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.userId, teammate), inArray(schema.workspaceMember.workspaceId, workspacesOf(me))))
    .returning({ workspaceId: schema.workspaceMember.workspaceId });
  expect(removed).toHaveLength(1);
});

// Making someone an auditor through the app clears their assignments; this keeps one (an older row, say).
Given("the teammate is made an auditor directly, keeping the assignment", async ({ page, state }) => {
  const me = await userId(page);
  const teammate = await userId(state.teammate!);
  const changed = await getMaintenanceDb()
    .update(schema.workspaceMember)
    .set({ role: "auditor" })
    .where(and(eq(schema.workspaceMember.userId, teammate), inArray(schema.workspaceMember.workspaceId, workspacesOf(me))))
    .returning({ workspaceId: schema.workspaceMember.workspaceId });
  expect(changed).toHaveLength(1);
  // A production build's links have already prefetched the pages they point to, with the teammate still
  // an admin; a direct write doesn't revalidate them as the app's own actions do. Reload, as a user
  // coming back to the board would, so the next page shows what is in the database now.
  await page.reload();
});

// The task form only accepts the project's own customers; this links one from another workspace.
Given(
  "the task {string} is linked directly to the customer from my other workspace",
  async ({ page, state }, title: string) => {
    expect(state.foreignCustomerUrl).toBeDefined();
    const customerId = new URL(state.foreignCustomerUrl!, origin).pathname.split("/").pop()!;
    const myProjects = getMaintenanceDb()
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(inArray(schema.project.workspaceId, workspacesOf(await userId(page))));
    const [task] = await getMaintenanceDb()
      .update(schema.task)
      .set({ organizationId: customerId })
      .where(and(eq(schema.task.title, title), inArray(schema.task.projectId, myProjects)))
      .returning({ id: schema.task.id, projectId: schema.task.projectId });
    expect(task).toBeDefined();
    state.keptUrl = `/dashboard/projects/${task!.projectId}/tasks/${task!.id}`;
  },
);

When("I open the {string} task", async ({ page, state }, title: string) => {
  await page.goto(state.keptUrl!);
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
});

// Partners create their own projects with task 049; until then a partner's project is written directly.
Given(
  "{string} has a project {string} for the customer {string}",
  async ({ page }, partnerName: string, name: string, customer: string) => {
    const db = getMaintenanceDb();
    const mine = workspacesOf(await userId(page));
    const [partner] = await db
      .select({ id: schema.partner.id, workspaceId: schema.partner.workspaceId })
      .from(schema.partner)
      .where(and(eq(schema.partner.name, partnerName), inArray(schema.partner.workspaceId, mine)));
    expect(partner).toBeDefined();
    const [organization] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(and(eq(schema.organization.name, customer), eq(schema.organization.workspaceId, partner!.workspaceId)));
    expect(organization).toBeDefined();
    await db.insert(schema.project).values({
      id: crypto.randomUUID(),
      name,
      workspaceId: partner!.workspaceId,
      organizationId: organization!.id,
      visibility: "partner",
      partnerId: partner!.id,
    });
  },
);
