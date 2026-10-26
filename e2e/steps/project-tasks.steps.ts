import { expect, type Page } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

const origin = process.env.BASE_URL ?? "http://localhost:3000";

async function createProject(page: Page, name: string) {
  await page.goto("/dashboard/projects");
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

Given("I have projects named {string}", async ({ page }, names: string) => {
  for (const name of names.split(",").map((n) => n.trim())) {
    await createProject(page, name);
  }
});

Given("I am on the {string} project page", async ({ page }, name: string) => {
  await page.goto("/dashboard/projects");
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

// Opens a task from the project board the browser is on.
Given("I am on the {string} task page", async ({ page }, title: string) => {
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+\/tasks\/[^/]+$/);
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
});

Then("the task {string} shows {string}", async ({ page }, title: string, text: string) => {
  await expect(taskCard(page, title)).toContainText(text);
});

// Same browser context = same signed-in user, like a second tab.
When("the task {string} is deleted in another tab", async ({ context, page }, title: string) => {
  const tab = await context.newPage();
  await tab.goto(page.url());
  await Promise.all([
    tab.waitForResponse((r) => r.request().method() === "POST"),
    tab.getByRole("button", { name: "Delete task" }).click(),
  ]);
  await expect(tab.getByRole("heading", { name: title, level: 1 })).toHaveCount(0);
  await tab.close();
});

// Opens a task from the project board the browser is on.
async function openTaskFromBoard(page: Page, title: string) {
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+\/tasks\/[^/]+$/);
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
}

// Saves the task form and waits for the server action's response.
async function saveTask(page: Page) {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: "Save changes" }).click(),
  ]);
}

async function backToBoard(page: Page) {
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+$/);
}

// Sets a task's priority from its page, starting and ending on the project board.
// Use a non-default priority: the check below is already true for Medium before saving.
Given("the task {string} has priority {string}", async ({ page }, title: string, priority: string) => {
  await openTaskFromBoard(page, title);
  await page.getByLabel("Priority", { exact: true }).selectOption({ label: priority });
  await saveTask(page);
  await expect(page.getByText(`${priority} priority`).first()).toBeVisible();
  await backToBoard(page);
});

Then("the {string} column lists {string}", async ({ page }, column: string, titles: string) => {
  // The column's name includes its task count ("To do 2"), so match it loosely.
  const links = page.getByRole("region", { name: column }).getByRole("listitem").getByRole("link");
  await expect(links).toHaveText(titles.split(",").map((t) => t.trim()));
});

// Calendar days in UTC, like the app ("today" is the server's UTC date). Scenarios keep a margin of
// several days so the runner and the server can't disagree about which day it is (clock skew, midnight).
function daysFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

When("I set the due date to {int} days from today", async ({ page, state }, days: number) => {
  state.dueDate = daysFromToday(days);
  await page.getByLabel("Due date", { exact: true }).fill(state.dueDate);
});

When("I clear the due date", async ({ page }) => {
  await page.getByLabel("Due date", { exact: true }).fill("");
});

Then("I see the due date {int} days from today", async ({ page, state }, days: number) => {
  const due = state.dueDate ?? daysFromToday(days);
  await expect(page.locator(`time[datetime="${due}"]`).first()).toBeVisible();
});

// Sets a task's due date from its page, starting and ending on the project board.
async function taskIsDue(page: Page, title: string, days: number) {
  const due = daysFromToday(days);
  await openTaskFromBoard(page, title);
  await page.getByLabel("Due date", { exact: true }).fill(due);
  await saveTask(page);
  await expect(page.locator(`time[datetime="${due}"]`).first()).toBeVisible();
  await backToBoard(page);
}

Given("the task {string} is due {int} days ago", async ({ page }, title: string, days: number) => {
  await taskIsDue(page, title, -days);
});

Given("the task {string} is due {int} days from today", async ({ page }, title: string, days: number) => {
  await taskIsDue(page, title, days);
});

Then("the task {string} does not show {string}", async ({ page }, title: string, text: string) => {
  await expect(taskCard(page, title)).not.toContainText(text);
});

// Assigns a task from its page, starting and ending on the project board.
Given("the task {string} is assigned to {string}", async ({ page }, title: string, person: string) => {
  await openTaskFromBoard(page, title);
  await page.getByLabel("Assignee", { exact: true }).selectOption({ label: person });
  await saveTask(page);
  await expect(page.getByText(`Assigned to ${person}`)).toBeVisible();
  await backToBoard(page);
});

// Simulates a tampered form: an assignee id that isn't a member of this workspace.
When("I choose someone outside the workspace in {string}", async ({ page }, label: string) => {
  await page.getByLabel(label, { exact: true }).evaluate((select) => {
    const option = document.createElement("option");
    option.value = "someone-outside";
    option.text = "Someone outside";
    select.appendChild(option);
    (select as HTMLSelectElement).value = "someone-outside";
  });
});
