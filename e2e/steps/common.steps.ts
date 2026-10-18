import { expect } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

Given("I am on the home page", async ({ page }) => {
  await page.goto("/");
});

When("I open {string}", async ({ page }, path: string) => {
  await page.goto(path);
});

When("I follow the {string} link", async ({ page }, name: string) => {
  await page.getByRole("link", { name }).click();
});

Then("I see the heading {string}", async ({ page }, text: string) => {
  await expect(page.getByRole("heading", { name: text })).toBeVisible();
});

Then("I see the {string} link", async ({ page }, name: string) => {
  await expect(page.getByRole("link", { name })).toBeVisible();
});

Then("the URL path is {string}", async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(`${path}$`));
});

When("I fill in {string} with {string}", async ({ page }, label: string, value: string) => {
  await page.getByLabel(label).fill(value);
});

When("I press {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name }).click();
});

Then("I see the text {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

