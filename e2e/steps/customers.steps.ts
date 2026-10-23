import { expect, type Page } from "@playwright/test";

import { Given, When } from "./fixtures";

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
