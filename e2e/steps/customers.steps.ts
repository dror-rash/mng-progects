import { expect, type Page } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

const origin = process.env.BASE_URL ?? "http://localhost:3000";

async function createCustomer(page: Page, name: string, status = "Active", tags = "") {
  await page.goto("/dashboard/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Status", { exact: true }).selectOption({ label: status });
  await page.getByLabel("Tags", { exact: true }).fill(tags);
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers\/[^/]+$/);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

Given(
  "I have a customer {string} with status {string} and tags {string}",
  async ({ page }, name: string, status: string, tags: string) => {
    await createCustomer(page, name, status, tags);
  },
);

Given("I am on the {string} customer page", async ({ page }, name: string) => {
  await page.goto("/dashboard/customers");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers\/[^/]+$/);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

// A separate browser context is a separate user with its own cookies.
Given("another user has a customer named {string}", async ({ browser, state }, name: string) => {
  const context = await browser.newContext({ baseURL: origin });
  const other = await context.newPage();
  const credentials = { email: `other-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" };
  expect((await other.request.post("/api/auth/sign-up/email", { data: { name: "Other User", ...credentials }, headers: { origin } })).ok()).toBeTruthy();
  expect((await other.request.post("/api/auth/sign-in/email", { data: credentials, headers: { origin } })).ok()).toBeTruthy();

  await createCustomer(other, name);
  state.otherUsersCustomerUrl = other.url();
  await context.close();
});

When("I open the other user's customer page", async ({ page, state }) => {
  expect(state.otherUsersCustomerUrl).toBeDefined();
  await page.goto(state.otherUsersCustomerUrl!);
});

Given("the customer has a contact {string}", async ({ page }, name: string) => {
  await page.getByLabel("Contact name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByRole("region", { name: "Contacts" })).toContainText(name);
});

function notesSection(page: Page) {
  return page.getByRole("region", { name: "Notes", exact: true });
}

When("I add the note {string}", async ({ page }, body: string) => {
  await page.getByLabel("Note", { exact: true }).fill(body);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(notesSection(page)).toContainText(body);
});

Then("the notes are {string}", async ({ page }, bodies: string) => {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expected = bodies.split(",").map((b) => new RegExp(escape(b.trim())));
  await expect(notesSection(page).getByRole("listitem")).toHaveText(expected);
});

// Dates are stamped and shown in UTC for now (time-zone item parked in task 010).
Then("each note shows today's date", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const stamps = notesSection(page).getByRole("listitem").locator("time");
  await expect(stamps.first()).toBeVisible();
  for (const stamp of await stamps.all()) {
    expect((await stamp.getAttribute("datetime"))?.slice(0, 10)).toBe(today);
  }
});

Given("I have a project named {string} for customer {string}", async ({ page }, name: string, customer: string) => {
  await page.goto("/dashboard/projects");
  await page.getByLabel("Project name", { exact: true }).fill(name);
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: customer });
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
});

When("I delete the customer {string}", async ({ page }, name: string) => {
  await page.goto("/dashboard/customers");
  await page.getByRole("link", { name, exact: true }).click();
  await page.getByRole("link", { name: "Delete customer" }).click();
  await page.getByRole("button", { name: "Yes, delete customer" }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers$/);
});

Given(
  "the project {string} has a task {string} for customer {string}",
  async ({ page }, project: string, title: string, customer: string) => {
    await page.goto("/dashboard/projects");
    await page.getByRole("link", { name: project, exact: true }).click();
    await expect(page.getByRole("heading", { name: project, level: 1 })).toBeVisible();
    await page.getByLabel("Task title", { exact: true }).fill(title);
    await page.getByRole("button", { name: "Add task" }).click();
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await page.getByLabel("Customer", { exact: true }).selectOption({ label: customer });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("link", { name: customer, exact: true })).toBeVisible();
  },
);

Then("{string} is selected in {string}", async ({ page }, option: string, label: string) => {
  await expect(page.getByLabel(label, { exact: true }).locator("option:checked")).toHaveText(option);
});

// Simulates a tampered form: puts another user's customer id into the select and chooses it.
When("I choose the other user's customer in {string}", async ({ page, state }, label: string) => {
  expect(state.otherUsersCustomerUrl).toBeDefined();
  const foreignId = new URL(state.otherUsersCustomerUrl!).pathname.split("/").pop()!;
  await page.getByLabel(label, { exact: true }).evaluate((select, id) => {
    const option = document.createElement("option");
    option.value = id;
    option.text = "Someone else's customer";
    select.appendChild(option);
    (select as HTMLSelectElement).value = id;
  }, foreignId);
});

// Same browser context = same signed-in user, like a second tab.
When("the contact {string} is removed in another tab", async ({ context, page }, name: string) => {
  const tab = await context.newPage();
  await tab.goto(new URL(page.url()).pathname.replace(/\/contacts\/[^/]+\/edit$/, ""));
  await Promise.all([
    tab.waitForResponse((r) => r.request().method() === "POST"),
    tab.getByRole("button", { name: `Remove ${name}` }).click(),
  ]);
  await expect(tab.getByRole("region", { name: "Contacts" })).not.toContainText(name);
  await tab.close();
});
