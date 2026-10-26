import { expect } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

Given("I am on the home page", async ({ page }) => {
  await page.goto("/");
});

When("I open {string}", async ({ page }, path: string) => {
  await page.goto(path);
});

When("I follow the {string} link", async ({ page }, name: string) => {
  const link = page.getByRole("link", { name, exact: true });
  const href = await link.getAttribute("href");
  await link.click();
  // Wait for the navigation (query string included), so the next step can't pass against the page we just left.
  if (href?.startsWith("/")) {
    const target = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(page).toHaveURL(new RegExp(`${target}$`));
  }
});

Then("I see the heading {string}", async ({ page }, text: string) => {
  await expect(page.getByRole("heading", { name: text })).toBeVisible();
});

Then("I see the {string} link", async ({ page }, name: string) => {
  await expect(page.getByRole("link", { name })).toBeVisible();
});

Then("I do not see the {string} link", async ({ page }, name: string) => {
  await expect(page.getByRole("link", { name })).toHaveCount(0);
});

Then("the URL path is {string}", async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(`${path}$`));
});

When("I fill in {string} with {string}", async ({ page }, label: string, value: string) => {
  await page.getByLabel(label).fill(value);
});

// Every button these scenarios press submits a form. Wait for that request's response, so a
// following navigation can't cancel the submission (networkidle doesn't wait for fetch-based actions).
When("I press {string}", async ({ page }, name: string) => {
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name }).click(),
  ]);
});

// Text the page shows, not values sitting in form fields.
Then("I see the text {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text).and(page.locator(":not(textarea):not(input):not(option)")).first()).toBeVisible();
});


Then("the {string} field contains {string}", async ({ page }, label: string, value: string) => {
  await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
});

When("I select {string} from {string}", async ({ page }, option: string, label: string) => {
  await page.getByLabel(label, { exact: true }).selectOption({ label: option });
});

Then("the {string} section shows {string}", async ({ page }, section: string, text: string) => {
  await expect(page.getByRole("region", { name: section, exact: true })).toContainText(text);
});

Then("the {string} section does not show {string}", async ({ page }, section: string, text: string) => {
  await expect(page.getByRole("region", { name: section, exact: true })).not.toContainText(text);
});
