import { expect, type Page } from "@playwright/test";

import { Given, signUp, Then, When } from "./fixtures";
import { createInviteLink, pressAndWait, switchTo } from "./workspaces.steps";

/** The address of one of my projects, from the All projects list. */
async function projectUrl(page: Page, name: string) {
  await page.goto("/dashboard/projects");
  return (await page.getByRole("link", { name, exact: true }).first().getAttribute("href"))!;
}

/** Opens a page and waits for its main heading, so a following "no such control" check runs on the loaded page. */
async function openLoaded(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

Given("an auditor joins my workspace", async ({ page, people, state }) => {
  const link = await createInviteLink(page, "Auditor");
  const auditor = await people.newPerson();
  await signUp(auditor, "Auditor");
  await auditor.goto(link);
  await pressAndWait(auditor, "Join workspace");
  await expect(auditor).toHaveURL(/\/dashboard$/);
  state.teammate = auditor;
});

Then(
  "the auditor sees the {string} project with the customer {string} and the task {string}",
  async ({ state }, project: string, customer: string, title: string) => {
    const auditor = state.teammate!;
    await auditor.goto("/dashboard/projects");
    await auditor.getByRole("link", { name: project, exact: true }).first().click();
    await expect(auditor.getByRole("heading", { name: project, level: 1 })).toBeVisible();
    await expect(auditor.getByRole("link", { name: customer, exact: true })).toBeVisible();
    await expect(auditor.getByRole("link", { name: title, exact: true })).toBeVisible();
  },
);

Then("the auditor sees the {string} customer with its details", async ({ state }, name: string) => {
  const auditor = state.teammate!;
  await auditor.goto("/dashboard/customers");
  await auditor.getByRole("link", { name, exact: true }).click();
  await expect(auditor.getByRole("heading", { name, level: 1 })).toBeVisible();
  await expect(auditor.getByText("Details", { exact: true })).toBeVisible();
  await expect(auditor.getByText("retail", { exact: true })).toBeVisible();
});

Then("the auditor sees no {string} link on {string}", async ({ state }, name: string, path: string) => {
  const auditor = state.teammate!;
  await openLoaded(auditor, path);
  await expect(auditor.getByRole("link", { name, exact: true })).toHaveCount(0);
});

Then(
  "the auditor sees no {string} link or {string} button on the {string} project",
  async ({ page, state }, link: string, button: string, project: string) => {
    const auditor = state.teammate!;
    await auditor.goto(await projectUrl(page, project));
    await expect(auditor.getByRole("heading", { name: project, level: 1 })).toBeVisible();
    await expect(auditor.getByRole("link", { name: link, exact: true })).toHaveCount(0);
    await expect(auditor.getByRole("button", { name: button, exact: true })).toHaveCount(0);
  },
);

Then("the auditor opening {string} sees {string}", async ({ state }, path: string, text: string) => {
  const auditor = state.teammate!;
  await auditor.goto(path);
  await expect(auditor.getByText(text, { exact: true })).toBeVisible();
});

Then(
  "the auditor opening the {string} project's {string} page sees {string}",
  async ({ page, state }, project: string, subpage: string, text: string) => {
    const auditor = state.teammate!;
    await auditor.goto(`${await projectUrl(page, project)}/${subpage}`);
    await expect(auditor.getByText(text, { exact: true })).toBeVisible();
  },
);

// The auditor has no edit form for my project, so they use the one of a project in their own workspace
// (where they are an admin), pointed at mine: the server must refuse it on the role, not on the missing form.
When(
  "the auditor posts the edit form of the {string} project with the name {string}",
  async ({ page, state }, project: string, name: string) => {
    const auditor = state.teammate!;
    const target = await projectUrl(page, project);
    state.keptUrl = target;
    await switchTo(auditor, "Auditor's workspace");
    await auditor.goto("/dashboard/projects/new");
    await auditor.getByLabel("Project name").fill("Decoy");
    await auditor.getByRole("button", { name: "Create Project" }).click();
    await expect(auditor.getByRole("heading", { name: "Decoy", level: 1 })).toBeVisible();
    await auditor.goto(`${auditor.url()}/edit`);
    await auditor.getByLabel("Project name").fill(name);
    await auditor.locator("form", { has: auditor.getByRole("button", { name: "Save changes" }) }).evaluate((form, id) => {
      form.querySelector<HTMLInputElement>('input[name="projectId"]')!.value = id;
    }, target.split("/").pop()!);
    await pressAndWait(auditor, "Save changes");
  },
);

Then("the {string} project is still named {string}", async ({ page, state }, _project: string, name: string) => {
  await page.goto(state.keptUrl!);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

Then("the {string} select offers {string} with {string} chosen", async ({ page }, label: string, options: string, chosen: string) => {
  const select = page.getByLabel(label, { exact: true });
  await expect(select.locator("option")).toHaveText(options.split(",").map((o) => o.trim()));
  await expect(select.locator("option:checked")).toHaveText(chosen);
});

Then("the auditor sees {string} in the members list", async ({ state }, name: string) => {
  const auditor = state.teammate!;
  await auditor.goto("/dashboard/workspace");
  await expect(auditor.getByRole("region", { name: "Members", exact: true })).toContainText(name);
});

Then(
  "the auditor sees no {string} button, role select or invite form on the members page",
  async ({ state }, button: string) => {
    const auditor = state.teammate!;
    await expect(auditor.getByRole("region", { name: "Members", exact: true })).toBeVisible();
    await expect(auditor.getByRole("button", { name: new RegExp(`^${button}\\b`) })).toHaveCount(0);
    await expect(auditor.getByRole("combobox")).toHaveCount(0);
    await expect(auditor.getByRole("button", { name: "Create invite link" })).toHaveCount(0);
    await expect(auditor.getByRole("region", { name: "Invite links", exact: true })).toHaveCount(0);
  },
);
