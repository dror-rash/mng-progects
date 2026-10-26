import { expect } from "@playwright/test";

import { Then } from "./fixtures";

// The tile's value is its own element, so match it exactly: "1" mustn't also pass for "10".
Then("the {string} stat shows {string}", async ({ page }, label: string, value: string) => {
  await expect(page.getByRole("group", { name: label }).getByText(value, { exact: true })).toBeVisible();
});

Then("the {string} project card shows {string}", async ({ page }, name: string, text: string) => {
  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name }) });
  await expect(card).toContainText(text);
});

Then("the {string} chart shows {string} as {string}", async ({ page }, chart: string, label: string, value: string) => {
  const entry = page.getByRole("figure", { name: chart }).getByRole("listitem").filter({ hasText: label });
  await expect(entry).toContainText(value);
});

Then("the recently started projects are {string}", async ({ page }, names: string) => {
  const links = page.getByRole("region", { name: "Recently started" }).getByRole("listitem").getByRole("link");
  await expect(links).toHaveText(names.split(",").map((n) => n.trim()));
});

Then("the {string} progress meter is at {int} percent", async ({ page }, name: string, percent: number) => {
  await expect(page.getByRole("progressbar", { name: `${name} progress` })).toHaveAttribute("aria-valuenow", String(percent));
});

Then("I do not see the {string} button", async ({ page }, name: string) => {
  await expect(page.getByRole("button", { name })).toHaveCount(0);
});
