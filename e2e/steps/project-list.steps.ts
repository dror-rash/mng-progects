import { expect } from "@playwright/test";

import { Then, When } from "./fixtures";

// Project names are the table's row headers; toHaveText retries, so this also waits for a filter to apply.
Then("the projects shown are {string}", async ({ page }, names: string) => {
  const table = page.getByRole("table", { name: "Projects" });
  await expect(table.getByRole("rowheader")).toHaveText(names.split(",").map((n) => n.trim()));
});

Then("the {string} row shows {string}", async ({ page }, name: string, text: string) => {
  const row = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name, exact: true }) });
  await expect(row).toContainText(text);
});

When("I check {string}", async ({ page }, label: string) => {
  await page.getByLabel(label, { exact: true }).check();
});

When("I search projects for {string}", async ({ page }, text: string) => {
  await page.getByLabel("Search projects", { exact: true }).fill(text);
  await page.getByLabel("Search projects", { exact: true }).press("Enter");
  await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(text)}`));
});

// Column headers are links that sort; wait for the new order's URL so the next step can't pass against the old page.
When("I sort projects by {string}", async ({ page }, column: string) => {
  const header = page.getByRole("table", { name: "Projects" }).getByRole("columnheader", { name: column });
  const before = page.url();
  await header.getByRole("link").click();
  await expect(page).not.toHaveURL(before);
});

Then("the {string} column is sorted {string}", async ({ page }, column: string, direction: string) => {
  const header = page.getByRole("table", { name: "Projects" }).getByRole("columnheader", { name: column });
  await expect(header).toHaveAttribute("aria-sort", direction);
});
