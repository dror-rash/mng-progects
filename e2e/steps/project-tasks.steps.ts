import { expect, type Page } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

const origin = process.env.BASE_URL ?? "http://localhost:3000";

async function createProject(page: Page, name: string) {
  await page.goto("/dashboard");
  await page.getByLabel("Project name").fill(name);
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("link", { name })).toBeVisible();
}

// Dashboard card titles are headings too, so wait for the project URL before checking the page.
async function openProjectFromDashboard(page: Page, name: string) {
  await page.getByRole("link", { name }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+$/);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

function taskCard(page: Page, title: string) {
  return page.getByRole("listitem").filter({ hasText: title });
}

function taskInColumn(page: Page, title: string, column: string) {
  return page.getByRole("region", { name: column }).getByRole("listitem").filter({ hasText: title });
}

Given("I have a project named {string}", async ({ page }, name: string) => {
  await createProject(page, name);
});

Given("I am on the {string} project page", async ({ page }, name: string) => {
  await page.goto("/dashboard");
  await openProjectFromDashboard(page, name);
});

Given("the project has a task {string}", async ({ page }, title: string) => {
  await page.getByLabel("Task title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(taskCard(page, title)).toBeVisible();
});

// A separate browser context is a separate user with its own cookies.
Given("another user has a project named {string}", async ({ browser, state }, name: string) => {
  const context = await browser.newContext({ baseURL: origin });
  const other = await context.newPage();
  const credentials = { email: `other-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" };
  expect((await other.request.post("/api/auth/sign-up/email", { data: { name: "Other User", ...credentials }, headers: { origin } })).ok()).toBeTruthy();
  expect((await other.request.post("/api/auth/sign-in/email", { data: credentials, headers: { origin } })).ok()).toBeTruthy();

  await createProject(other, name);
  await openProjectFromDashboard(other, name);
  state.otherUsersProjectUrl = other.url();
  await context.close();
});

When("I open the other user's project", async ({ page, state }) => {
  expect(state.otherUsersProjectUrl).toBeDefined();
  await page.goto(state.otherUsersProjectUrl!);
});

When("I open the other user's project {string} page", async ({ page, state }, subpage: string) => {
  expect(state.otherUsersProjectUrl).toBeDefined();
  await page.goto(`${state.otherUsersProjectUrl!}/${subpage}`);
});

When("I move the task {string} to {string}", async ({ page }, title: string, status: string) => {
  await taskCard(page, title).getByRole("button", { name: `Move to ${status}` }).click();
  // Wait for the save to land, so a following navigation can't cancel it.
  await expect(taskInColumn(page, title, status)).toBeVisible();
});

When("I delete the task {string}", async ({ page }, title: string) => {
  await taskCard(page, title).getByRole("button", { name: "Delete task" }).click();
  await expect(taskCard(page, title)).toHaveCount(0);
});

Then("the task {string} is in the {string} column", async ({ page }, title: string, column: string) => {
  await expect(taskInColumn(page, title, column)).toBeVisible();
});

Then("I do not see the task {string}", async ({ page }, title: string) => {
  await expect(taskCard(page, title)).toHaveCount(0);
});

Then("I do not see the text {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text)).toHaveCount(0);
});
