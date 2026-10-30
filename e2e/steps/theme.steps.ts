import { expect } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

Given("my system prefers a dark color scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
});

When("I choose the {string} theme", async ({ page }, name: string) => {
  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name, exact: true }).click();
});

// The theme is the `dark` class on <html>; the tokens in @repo/ui/theme.css hang off it.
Then("the page is dark", async ({ page }) => {
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
});

Then("the page is light", async ({ page }) => {
  await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);
});
