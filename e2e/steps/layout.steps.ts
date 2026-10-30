import { expect, type Page } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

/** The dashboard zone's header (the page's banner landmark). */
function header(page: Page) {
  return page.getByRole("banner");
}

Given("my screen is {int} pixels wide", async ({ page }, width: number) => {
  await page.setViewportSize({ width, height: 800 });
});

Then("the page does not scroll sideways", async ({ page }) => {
  await expect(header(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

Then("every dashboard nav link is on screen", async ({ page }) => {
  const width = page.viewportSize()!.width;
  const links = header(page).getByRole("navigation", { name: "Dashboard" }).getByRole("link");
  await expect(links).toHaveCount(4);
  for (const link of await links.all()) {
    await expect(link).toBeVisible();
    const box = (await link.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});

Then("the header shows the workspace {string}", async ({ page }, name: string) => {
  await expect(header(page).getByRole("link", { name: `${name}: switch workspace`, exact: true })).toBeVisible();
});

Then("the header says {string}", async ({ page }, text: string) => {
  await expect(header(page).getByText(text)).toBeVisible();
});

Then("the header does not say {string}", async ({ page }, text: string) => {
  await expect(header(page)).toBeVisible();
  await expect(header(page).getByText(text)).toHaveCount(0);
});

When("I open the customer from my other workspace", async ({ page, state }) => {
  await page.goto(state.foreignCustomerUrl!);
});
