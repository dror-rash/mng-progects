import { expect, type Page, type Request } from "@playwright/test";

import { Given, origin, signUp, Then, When } from "./fixtures";

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

Given("a teammate opens the invite link", async ({ people, state }) => {
  const teammate = await people.newPerson();
  await signUp(teammate, "Teammate");
  await teammate.goto(state.inviteLink!);
  await expect(teammate.getByRole("button", { name: "Join workspace" })).toBeVisible();
  state.teammate = teammate;
});

When("a signed-out teammate opens the invite link", async ({ people, state }) => {
  const teammate = await people.newPerson();
  await teammate.goto(state.inviteLink!);
  await expect(teammate).toHaveURL((url) => url.pathname === "/login");
  state.teammate = teammate;
});

Then("the login page's address doesn't contain the invite token", async ({ state }) => {
  const token = new URL(state.inviteLink!).pathname.split("/").pop()!;
  expect(token.length).toBeGreaterThan(20);
  expect(decodeURIComponent(state.teammate!.url())).not.toContain(token);
});

// The account is registered through `request` (its own cookie jar), so the teammate's browser stays signed out.
When("the teammate logs in", async ({ request, state }) => {
  const teammate = state.teammate!;
  const credentials = { email: `teammate-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" };
  expect((await request.post("/api/auth/sign-up/email", { data: { name: "Teammate", ...credentials }, headers: { origin } })).ok()).toBeTruthy();
  await teammate.getByLabel("Email").fill(credentials.email);
  await teammate.getByLabel("Password").fill(credentials.password);
  await teammate.getByRole("button", { name: "Log in" }).click();
  // Wait for "load" like `goto` does: a form submitted before hydration fails on the dev server.
  await teammate.waitForURL((url) => url.pathname === "/dashboard/invite", { waitUntil: "load" });
  await expect(teammate.getByRole("button", { name: "Join workspace" })).toBeVisible();
});

When("the teammate presses {string}", async ({ state }, name: string) => {
  await pressAndWait(state.teammate!, name);
});

// The response to the link itself (the URL with the token), even when it redirects on.
Then("opening the invite link answers with the header {string}", async ({ page, state }, header: string) => {
  const [name, value] = header.split(/:\s*/);
  const response = await page.goto(state.inviteLink!);
  expect(response).not.toBeNull();
  let request: Request = response!.request();
  while (request.redirectedFrom()) request = request.redirectedFrom()!;
  expect(request.url()).toBe(state.inviteLink);
  expect((await request.response())!.headers()[name!.toLowerCase()]).toBe(value);
});

async function createWorkspace(page: Page, name: string) {
  await page.goto("/dashboard/workspaces");
  await page.getByLabel("Workspace name", { exact: true }).fill(name);
  await pressAndWait(page, "Create workspace");
  await expect(page).toHaveURL(/\/dashboard$/);
}

Given("I create a workspace named {string}", async ({ page }, name: string) => {
  await createWorkspace(page, name);
});

async function switchTo(page: Page, name: string) {
  await page.goto("/dashboard/workspaces");
  await pressAndWait(page, `Switch to ${name}`);
  await expect(page).toHaveURL(/\/dashboard$/);
}

When("I switch to {string}", async ({ page }, name: string) => {
  await switchTo(page, name);
});

When("the teammate switches to {string}", async ({ state }, name: string) => {
  await switchTo(state.teammate!, name);
});

Then("the teammate sees the text {string}", async ({ state }, text: string) => {
  await expect(state.teammate!.getByText(text).first()).toBeVisible();
});

/** The id of one of my other workspaces, from its Switch form. */
async function workspaceIdOf(page: Page, name: string) {
  await page.goto("/dashboard/workspaces");
  return page
    .locator("form", { has: page.getByRole("button", { name: `Switch to ${name}`, exact: true }) })
    .locator('input[name="workspaceId"]')
    .inputValue();
}

/** Simulates a tampered form: sets (or adds) its hidden workspaceId. */
async function setWorkspaceIdOn(page: Page, button: string, workspaceId: string) {
  await page.locator("form", { has: page.getByRole("button", { name: button, exact: true }) }).evaluate((form, id) => {
    let input = form.querySelector<HTMLInputElement>('input[name="workspaceId"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = "workspaceId";
      form.appendChild(input);
    }
    input.value = id;
  }, workspaceId);
}

Given("the teammate joins with the invite link", async ({ state }) => {
  const teammate = state.teammate!;
  await teammate.goto(state.inviteLink!);
  await pressAndWait(teammate, "Join workspace");
  await expect(teammate).toHaveURL(/\/dashboard$/);
});

Given("I make the teammate an admin", async ({ page }) => {
  await page.goto("/dashboard/workspace");
  await pressAndWait(page, "Make admin Teammate");
  await expect(page.getByRole("button", { name: "Make member Teammate" })).toBeVisible();
});

When("the teammate removes {string} from the workspace", async ({ state }, name: string) => {
  const teammate = state.teammate!;
  await teammate.goto("/dashboard/workspace");
  await pressAndWait(teammate, `Remove ${name}`);
  await expect(teammate.getByRole("region", { name: "Members", exact: true })).not.toContainText(name);
});

When("the teammate and I remove each other at the same time", async ({ page, state }) => {
  const teammate = state.teammate!;
  await page.goto("/dashboard/projects");
  state.keptUrl = (await page.getByRole("link", { name: "Website Redesign", exact: true }).getAttribute("href"))!;
  await Promise.all([page.goto("/dashboard/workspace"), teammate.goto("/dashboard/workspace")]);
  await Promise.all([pressAndWait(page, "Remove Teammate"), pressAndWait(teammate, "Remove Test User")]);
});

Then("exactly one of us can still open the {string} project", async ({ page, state }, name: string) => {
  const canOpen = async (person: Page) => {
    await person.goto(state.keptUrl!);
    const heading = person.getByRole("heading", { name, level: 1 });
    await expect(heading.or(person.getByText("Project not found")).first()).toBeVisible();
    return heading.isVisible();
  };
  const results = [await canOpen(page), await canOpen(state.teammate!)];
  expect(results.filter(Boolean)).toHaveLength(1);
});

// Same browser context = same signed-in user, like a second tab.
When("I switch to {string} in another tab", async ({ context }, name: string) => {
  const tab = await context.newPage();
  await switchTo(tab, name);
  await tab.close();
});

async function teammatesWorkspaces(teammate: Page) {
  await teammate.goto("/dashboard/workspaces");
  return teammate.getByRole("region", { name: "Your workspaces", exact: true });
}

Then("the teammate's workspaces include {string}", async ({ state }, name: string) => {
  await expect((await teammatesWorkspaces(state.teammate!)).getByText(name, { exact: true })).toBeVisible();
});

Then("the teammate's workspaces don't include {string}", async ({ state }, name: string) => {
  const list = await teammatesWorkspaces(state.teammate!);
  await expect(list.getByRole("listitem").first()).toBeVisible();
  await expect(list.getByText(name, { exact: true })).toHaveCount(0);
});

// The teammate is an admin of their own workspace, so the form is there; only its workspaceId is changed.
When(
  "the teammate posts {string} for my workspace from their own members page",
  async ({ state }, button: string) => {
    const teammate = state.teammate!;
    await switchTo(teammate, "Teammate's workspace");
    const mine = await workspaceIdOf(teammate, "Test User's workspace");
    await teammate.goto("/dashboard/workspace");
    await setWorkspaceIdOn(teammate, button, mine);
    await pressAndWait(teammate, button);
  },
);

Then("the teammate sees the error {string}", async ({ state }, message: string) => {
  await expect(state.teammate!.getByRole("alert").filter({ hasText: message })).toBeVisible();
});

Then("{string} is marked as the current workspace", async ({ page }, name: string) => {
  const rows = page.getByRole("region", { name: "Your workspaces", exact: true }).getByRole("listitem");
  await expect(rows.filter({ hasText: name })).toContainText("Current");
  await expect(rows.filter({ hasNotText: name }).filter({ hasText: "Current" })).toHaveCount(0);
});

Given("another user has a workspace named {string}", async ({ people, state }, name: string) => {
  const other = await people.newPerson();
  await signUp(other, "Other User");
  await createWorkspace(other, name);
  await switchTo(other, "Other User's workspace");
  state.otherWorkspaceId = await workspaceIdOf(other, name);
});

When("I try to switch to the other user's workspace", async ({ page, state }) => {
  await page.goto("/dashboard/workspaces");
  await setWorkspaceIdOn(page, "Switch to Test User's workspace", state.otherWorkspaceId!);
  await pressAndWait(page, "Switch to Test User's workspace");
});

When("my workspace cookie is set to the other user's workspace", async ({ context, state }) => {
  await context.addCookies([{ name: "workspace", value: state.otherWorkspaceId!, url: origin }]);
});

Given("I keep the link to the {string} project", async ({ page, state }, name: string) => {
  await page.goto("/dashboard/projects");
  state.keptUrl = (await page.getByRole("link", { name, exact: true }).getAttribute("href"))!;
});

When("I open the kept project link", async ({ page, state }) => {
  await page.goto(state.keptUrl!);
});
