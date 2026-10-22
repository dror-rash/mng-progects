import { test as base, createBdd } from "playwright-bdd";

export type Account = { email: string; password: string };

/** Values a step records for later steps in the same scenario. */
export type ScenarioState = { otherUsersProjectUrl?: string };

/** Every scenario gets its own unique account, so runs never collide in a persistent database. */
export const test = base.extend<{ account: Account; state: ScenarioState }>({
  // eslint-disable-next-line no-empty-pattern
  account: async ({}, use) => {
    await use({ email: `user-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" });
  },
  // eslint-disable-next-line no-empty-pattern
  state: async ({}, use) => {
    await use({});
  },
});

export const { Given, When, Then } = createBdd(test);
