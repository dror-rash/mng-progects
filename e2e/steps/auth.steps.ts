import { expect } from "@playwright/test";

import { Given, Then, When } from "./fixtures";

const origin = process.env.BASE_URL ?? "http://localhost:3000";

// `request` is a separate cookie jar from `page`, so registering doesn't sign the browser in.
Given("an existing account", async ({ request, account }) => {
  const response = await request.post("/api/auth/sign-up/email", {
    data: { name: "Test User", email: account.email, password: account.password },
    headers: { origin },
  });
  expect(response.ok()).toBeTruthy();
});

Given("I am signed in with an existing account", async ({ request, page, account }) => {
  const signUp = await request.post("/api/auth/sign-up/email", {
    data: { name: "Test User", email: account.email, password: account.password },
    headers: { origin },
  });
  expect(signUp.ok()).toBeTruthy();

  // page.request shares cookies with the browser context.
  const signIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: account.email, password: account.password },
    headers: { origin },
  });
  expect(signIn.ok()).toBeTruthy();
});

Given("I am on the login page", async ({ page }) => {
  await page.goto("/login");
});

Given("I am on the sign up page", async ({ page }) => {
  await page.goto("/signup");
});

When("I sign up with a new account", async ({ page, account }) => {
  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Create account" }).click();
});

When("I log in with my email and password", async ({ page, account }) => {
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Log in" }).click();
});

When("I log in with the wrong password", async ({ page, account }) => {
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill("not-the-password-123");
  await page.getByRole("button", { name: "Log in" }).click();
});

When("I log out", async ({ page }) => {
  await page.getByRole("button", { name: "Log out" }).click();
});

Then("I see my email address", async ({ page, account }) => {
  await expect(page.getByText(account.email)).toBeVisible();
});

Then("I see the error {string}", async ({ page }, message: string) => {
  // Next.js also renders an empty role="alert" route announcer, so match on the text.
  await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();
});

Then("I am sent to the login page", async ({ page }) => {
  await expect(page).toHaveURL(/\/login(\?.*)?$/);
});
