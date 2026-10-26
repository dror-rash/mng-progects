import { expect, type Page } from "@playwright/test";

import { Given, Then } from "./fixtures";

const origin = process.env.BASE_URL ?? "http://localhost:3000";

/** Signs up and signs in a new person in their own browser context. */
async function signUp(page: Page, name: string) {
  const credentials = { email: `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" };
  expect((await page.request.post("/api/auth/sign-up/email", { data: { name, ...credentials }, headers: { origin } })).ok()).toBeTruthy();
  expect((await page.request.post("/api/auth/sign-in/email", { data: credentials, headers: { origin } })).ok()).toBeTruthy();
}

async function pressAndWait(page: Page, name: string) {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name }).click(),
  ]);
}

Given("I create an invite link", async ({ page, state }) => {
  await page.goto("/dashboard/workspace");
  await pressAndWait(page, "Create invite link");
  const field = page.getByLabel("Invite link", { exact: true });
  await expect(field).toHaveValue(/\/dashboard\/invite\/.+/);
  state.inviteLink = await field.inputValue();
});

Given("a teammate joins with the invite link", async ({ people, state }) => {
  expect(state.inviteLink).toBeDefined();
  const teammate = await people.newPerson();
  await signUp(teammate, "Teammate");
  await teammate.goto(state.inviteLink!);
  await pressAndWait(teammate, "Join workspace");
  await expect(teammate).toHaveURL(/\/dashboard$/);
  state.teammate = teammate;
});

Then("the teammate sees the {string} project", async ({ state }, name: string) => {
  const teammate = state.teammate!;
  await teammate.goto("/dashboard/projects");
  await expect(teammate.getByRole("link", { name, exact: true })).toBeVisible();
});

Then("the teammate can no longer open the {string} project", async ({ page, state }, name: string) => {
  await page.goto("/dashboard/projects");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+$/);
  await state.teammate!.goto(page.url());
  await expect(state.teammate!.getByText("Project not found")).toBeVisible();
});

Then("the teammate doesn't see the {string} button on the members page", async ({ state }, name: string) => {
  const teammate = state.teammate!;
  await teammate.goto("/dashboard/workspace");
  await expect(teammate.getByRole("region", { name: "Members", exact: true })).toBeVisible();
  await expect(teammate.getByRole("button", { name })).toHaveCount(0);
});

Then("a teammate opening the invite link sees {string}", async ({ people, state }, text: string) => {
  const teammate = await people.newPerson();
  await signUp(teammate, "Teammate");
  await teammate.goto(state.inviteLink!);
  await expect(teammate.getByText(text)).toBeVisible();
});

Then("a signed-out visitor opening the invite link is sent to the login page", async ({ people, state }) => {
  const visitor = await people.newPerson();
  await visitor.goto(state.inviteLink!);
  await expect(visitor).toHaveURL((url) => url.pathname === "/login" && (url.searchParams.get("next") ?? "").startsWith("/dashboard/invite/"));
});
