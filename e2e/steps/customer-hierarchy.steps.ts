import { expect } from "@playwright/test";

import { origin, Then, When } from "./fixtures";

// From a customer to its sites and their projects (task 072, ADR-0008).

/** A cell of the Customers table: the row by its customer link, the column by its header. */
Then(
  "the {string} row shows {string} under {string}",
  async ({ page }, customer: string, text: string, column: string) => {
    const table = page.getByRole("table", { name: "Customers", exact: true });
    const headers = table.getByRole("columnheader");
    await expect(headers.filter({ hasText: column })).toHaveCount(1);
    const index = (await headers.allInnerTexts()).findIndex((h) => h.trim() === column);
    expect(index, `no "${column}" column`).toBeGreaterThanOrEqual(0);
    const row = table
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader").filter({ has: page.getByRole("link", { name: customer, exact: true }) }) });
    // The row header and the data cells, in column order.
    await expect(row.locator(":scope > th, :scope > td").nth(index)).toHaveText(text);
  },
);

// The same name can be a link twice on a page (a sub-company's name, a project's site): pick it by section.
When("I follow the {string} link in the {string} section", async ({ page }, name: string, section: string) => {
  const link = page.getByRole("region", { name: section, exact: true }).getByRole("link", { name, exact: true });
  const href = await link.getAttribute("href");
  await link.click();
  if (href?.startsWith("/")) {
    const target = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(page).toHaveURL(new RegExp(`${target}$`));
  }
});

When("I open the new project page for the other user's site", async ({ page, state }) => {
  expect(state.otherUsersSiteUrl).toBeDefined();
  const siteId = new URL(state.otherUsersSiteUrl!, origin).pathname.split("/").pop()!;
  await page.goto(`/dashboard/projects/new?site=${siteId}`);
});
