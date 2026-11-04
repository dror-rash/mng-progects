import { expect } from "@playwright/test";

import { When } from "./fixtures";
import { myRecordId } from "./sites.steps";

// Every project belongs to a customer and one of its sites (task 071, ADR-0008). Deletes go through the
// app's own pages, as a user would make them.

When("I delete the project {string}", async ({ page }, name: string) => {
  await page.goto(`/dashboard/projects/${await myRecordId(page, "project", name)}`);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Delete project" }).click();
  await page.getByRole("button", { name: "Yes, delete project" }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
});

When("I delete the site {string}", async ({ page }, name: string) => {
  await page.goto(`/dashboard/sites/${await myRecordId(page, "site", name)}`);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Delete site" }).click();
  await page.getByRole("button", { name: "Yes, delete site" }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers\/[^/]+$/);
});
