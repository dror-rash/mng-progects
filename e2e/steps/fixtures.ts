import { test as base, createBdd } from "playwright-bdd";

export type Account = { email: string; password: string };

/** Every scenario gets its own unique account, so runs never collide in a persistent database. */
export const test = base.extend<{ account: Account }>({
  // eslint-disable-next-line no-empty-pattern
  account: async ({}, use) => {
    await use({ email: `user-${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" });
  },
});

export const { Given, When, Then } = createBdd(test);
