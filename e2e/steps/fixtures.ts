import { type Browser, type BrowserContext, expect, type Page } from "@playwright/test";
import { test as base, createBdd } from "playwright-bdd";

export type Account = { email: string; password: string };

/** Values a step records for later steps in the same scenario. */
export type ScenarioState = {
  otherUsersProjectUrl?: string;
  otherUsersCustomerUrl?: string;
  dueDate?: string;
  inviteLink?: string;
  teammate?: Page;
  /** Another person (not a member of my workspaces), when a later step needs them again. */
  otherPerson?: Page;
  otherWorkspaceId?: string;
  otherTaskUrl?: string;
  /** A customer in a workspace other than the one a later step works in. */
  foreignCustomerUrl?: string;
  keptUrl?: string;
  /** Partner-access scenarios: the ids of records written to the database, by name (projects, tasks, people, …). */
  ids?: Record<string, string>;
  /** Accounts that sign in only when a step needs them ("admin", "auditor"), and their pages once they have. */
  accounts?: Record<string, { account: Account; page?: Page }>;
  /** Posts the last tampered form again with another id, to compare the refusals. */
  replay?: (id: string) => Promise<void>;
};

/** Opens extra browser contexts (other people) and closes them when the scenario ends. */
export type People = { newPerson: () => Promise<Page> };

export const origin = process.env.BASE_URL ?? "http://localhost:3000";

/** Signs up and signs in a new person (in their own browser context) with a unique email. */
export async function signUp(page: Page, name: string) {
  const credentials = { email: `${name.toLowerCase().replace(/\W+/g, "-")}-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" };
  expect((await page.request.post("/api/auth/sign-up/email", { data: { name, ...credentials }, headers: { origin } })).ok()).toBeTruthy();
  expect((await page.request.post("/api/auth/sign-in/email", { data: credentials, headers: { origin } })).ok()).toBeTruthy();
}

/** The signed-in user's id, as Better Auth reports it. */
export async function userId(page: Page): Promise<string> {
  const response = await page.request.get("/api/auth/get-session");
  expect(response.ok()).toBeTruthy();
  return (await response.json()).user.id;
}

/** Every scenario gets its own unique account, so runs never collide in a persistent database. */
export const test = base.extend<{ account: Account; state: ScenarioState; people: People }>({
  // eslint-disable-next-line no-empty-pattern
  account: async ({}, use) => {
    await use({ email: `user-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" });
  },
  // eslint-disable-next-line no-empty-pattern
  state: async ({}, use) => {
    await use({});
  },
  people: async ({ browser }: { browser: Browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use({
      newPerson: async () => {
        const context = await browser.newContext({ baseURL: origin });
        contexts.push(context);
        return context.newPage();
      },
    });
    await Promise.all(contexts.map((c) => c.close()));
  },
});

export const { Given, When, Then } = createBdd(test);
