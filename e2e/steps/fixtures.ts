import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test as base, createBdd } from "playwright-bdd";

export type Account = { email: string; password: string };

/** Values a step records for later steps in the same scenario. */
export type ScenarioState = {
  otherUsersProjectUrl?: string;
  otherUsersCustomerUrl?: string;
  dueDate?: string;
  inviteLink?: string;
  teammate?: Page;
};

/** Opens extra browser contexts (other people) and closes them when the scenario ends. */
export type People = { newPerson: () => Promise<Page> };

const origin = process.env.BASE_URL ?? "http://localhost:3000";

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
