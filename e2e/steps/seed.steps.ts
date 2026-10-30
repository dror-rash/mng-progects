import { expect } from "@playwright/test";
import { and, eq, getDb, inArray, schema } from "@repo/db";

import { Given, origin, userId, When } from "./fixtures";

// Data the app's forms can't produce, written straight to the test database (DATABASE_URL), to check
// that pages don't trust it. Only rows belonging to this scenario's own people are touched.

/** The ids of the workspaces `memberId` belongs to, as a subquery. */
function workspacesOf(memberId: string) {
  return getDb()
    .select({ id: schema.workspaceMember.workspaceId })
    .from(schema.workspaceMember)
    .where(eq(schema.workspaceMember.userId, memberId));
}

// Removing a member through the app clears their assignments; this leaves one behind.
When("the teammate's membership is removed directly, keeping the assignment", async ({ page, state }) => {
  const me = await userId(page);
  const teammate = await userId(state.teammate!);
  const removed = await getDb()
    .delete(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.userId, teammate), inArray(schema.workspaceMember.workspaceId, workspacesOf(me))))
    .returning({ workspaceId: schema.workspaceMember.workspaceId });
  expect(removed).toHaveLength(1);
});

// The task form only accepts the project's own customers; this links one from another workspace.
Given(
  "the task {string} is linked directly to the customer from my other workspace",
  async ({ page, state }, title: string) => {
    expect(state.foreignCustomerUrl).toBeDefined();
    const customerId = new URL(state.foreignCustomerUrl!, origin).pathname.split("/").pop()!;
    const myProjects = getDb()
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(inArray(schema.project.workspaceId, workspacesOf(await userId(page))));
    const [task] = await getDb()
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
