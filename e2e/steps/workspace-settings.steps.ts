import { expect } from "@playwright/test";

import { Then, When } from "./fixtures";
import { createWorkspace, pressAndWait, setWorkspaceIdOn, switchTo, teammatesWorkspaces, workspaceIdOf } from "./workspaces.steps";

const SETTINGS = "/dashboard/workspace/settings";

When("I delete the workspace {string}", async ({ page }, name: string) => {
  await page.goto(SETTINGS);
  await page.getByLabel("Type the name to confirm", { exact: true }).fill(name);
  await pressAndWait(page, "Delete workspace");
  await expect(page).toHaveURL(/\/dashboard$/);
});

Then("the teammate opening {string} sees {string}", async ({ state }, path: string, text: string) => {
  const teammate = state.teammate!;
  await teammate.goto(path);
  await expect(teammate.getByText(text)).toBeVisible();
  await expect(teammate.getByRole("button", { name: "Delete workspace" })).toHaveCount(0);
});

// The teammate is an admin of their own workspace, so the forms are there; only the workspaceId is
// changed, and the form's name field is filled with my workspace's name (what a delete would need).
When("the teammate posts {string} for my workspace from their own settings page", async ({ state }, button: string) => {
  const teammate = state.teammate!;
  await teammate.goto("/dashboard/workspaces");
  if (await teammate.getByRole("button", { name: "Switch to Teammate's workspace", exact: true }).isVisible()) {
    await switchTo(teammate, "Teammate's workspace");
  }
  const mine = await workspaceIdOf(teammate, "Test User's workspace");
  await teammate.goto(SETTINGS);
  const form = teammate.locator("form", { has: teammate.getByRole("button", { name: button, exact: true }) });
  await form.getByRole("textbox").fill("Test User's workspace");
  await setWorkspaceIdOn(teammate, button, mine);
  await pressAndWait(teammate, button);
});

Then("neither the teammate nor I can open the kept project link", async ({ page, state }) => {
  for (const person of [page, state.teammate!]) {
    await person.goto(state.keptUrl!);
    await expect(person.getByText("Project not found")).toBeVisible();
  }
});

When("the teammate creates a workspace named {string}", async ({ state }, name: string) => {
  await createWorkspace(state.teammate!, name);
});

Then("the teammate's workspaces show {string} as {string}", async ({ state }, name: string, details: string) => {
  const rows = (await teammatesWorkspaces(state.teammate!)).getByRole("listitem");
  await expect(rows.filter({ hasText: name }).filter({ hasText: details })).toHaveCount(1);
});

Then("the {string} field accepts at most {int} characters", async ({ page }, label: string, max: number) => {
  await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("maxlength", String(max));
});

// The browser stops typing at maxlength; a tampered or scripted post doesn't, so the server checks too.
When("I post a workspace name of {int} characters", async ({ page }, length: number) => {
  const field = page.getByLabel("Workspace name", { exact: true });
  await field.evaluate((input) => input.removeAttribute("maxlength"));
  await field.fill("x".repeat(length));
  await pressAndWait(page, "Create workspace");
});
