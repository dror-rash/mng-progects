import { expect } from "@playwright/test";

import { Then } from "./fixtures";

Then("the {string} stat shows {string}", async ({ page }, label: string, value: string) => {
  await expect(page.getByRole("group", { name: label })).toContainText(value);
});

Then("the {string} project card shows {string}", async ({ page }, name: string, text: string) => {
  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name }) });
  await expect(card).toContainText(text);
});
