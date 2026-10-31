import { createHash, randomBytes } from "node:crypto";

import { expect, type Page } from "@playwright/test";
import { eq, schema } from "@repo/db";
import { getMaintenanceDb } from "@repo/db/maintenance";

import { Given, signUp, Then, When } from "./fixtures";
import { ids, idOf, pageOf, shownText } from "./partner-access.steps";
import { pressAndWait } from "./workspaces.steps";

// Soft delete and the Deleted page (task 051), in the leak suite's two-partner workspace
// (partner-access.steps.ts). Deletions written straight to the database are dated a minute ago, so the
// ones made through the app afterwards are newer.

const aMinuteAgo = () => new Date(Date.now() - 60_000);

Given("{string} also has the task {string}", async ({ state }, project: string, task: string) => {
  const db = getMaintenanceDb();
  const projectId = idOf(state, project);
  const [row] = await db.select({ organizationId: schema.project.organizationId }).from(schema.project).where(eq(schema.project.id, projectId));
  const id = crypto.randomUUID();
  await db.insert(schema.task).values({ id, projectId, title: task, organizationId: row!.organizationId, createdAt: aMinuteAgo() });
  Object.assign(ids(state), { [task]: id, [`${task}:project`]: projectId });
});

Given("the task {string} was deleted on its own", async ({ state }, task: string) => {
  await getMaintenanceDb()
    .update(schema.task)
    .set({ deletedAt: aMinuteAgo(), deletedBy: idOf(state, "Admin") })
    .where(eq(schema.task.id, idOf(state, task)));
});

Given("the project {string} was deleted by the admin", async ({ state }, project: string) => {
  await getMaintenanceDb()
    .update(schema.project)
    .set({ deletedAt: aMinuteAgo(), deletedBy: idOf(state, "Admin") })
    .where(eq(schema.project.id, idOf(state, project)));
});

Given(
  "the customer {string} has the contact {string} and the note {string}",
  async ({ state }, customer: string, contact: string, note: string) => {
    const db = getMaintenanceDb();
    const organizationId = idOf(state, customer);
    await db.insert(schema.organizationContact).values({ id: crypto.randomUUID(), organizationId, name: contact });
    await db.insert(schema.organizationNote).values({ id: crypto.randomUUID(), organizationId, authorId: idOf(state, "Admin"), body: note });
  },
);

/** An open partner invite link, written straight to the database; the token is kept to open it later. */
Given("{string} has an open invite link", async ({ state }, partner: string) => {
  const token = randomBytes(32).toString("base64url");
  await getMaintenanceDb()
    .insert(schema.workspaceInvite)
    .values({
      id: crypto.randomUUID(),
      workspaceId: idOf(state, "workspace"),
      tokenHash: createHash("sha256").update(token).digest("hex"),
      createdBy: idOf(state, "Admin"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
      role: "partner",
      partnerId: idOf(state, partner),
    });
  ids(state)[`${partner}:invite`] = token;
});

Then(
  "someone opening the invite link of {string} sees {string}",
  async ({ people, state }, partner: string, text: string) => {
    const someone = await people.newPerson();
    await signUp(someone, "Someone");
    await someone.goto(`/dashboard/invite/${idOf(state, `${partner}:invite`)}`);
    await expect(shownText(someone, text)).toBeVisible();
  },
);

// --- The admin's deletes ----------------------------------------------------------------------------------

When("the admin deletes the customer {string}", async ({ people, state }, customer: string) => {
  const admin = await pageOf(state, people, "admin");
  await admin.goto(`/dashboard/customers/${idOf(state, customer)}/delete`);
  await admin.getByRole("button", { name: "Yes, delete customer" }).click();
  await expect(admin).toHaveURL(/\/dashboard\/customers$/);
});

When("the admin deletes the partner {string}", async ({ people, state }, partner: string) => {
  const admin = await pageOf(state, people, "admin");
  await admin.goto(`/dashboard/partners/${idOf(state, partner)}`);
  await admin.getByRole("button", { name: "Delete partner" }).click();
  await expect(admin).toHaveURL(/\/dashboard\/partners$/);
});

When(
  "the admin removes the contact {string} and deletes the note {string}",
  async ({ people, state }, contact: string, note: string) => {
    const admin = await pageOf(state, people, "admin");
    await admin.goto(`/dashboard/customers/${idOf(state, "Acme Ltd")}`);
    await pressAndWait(admin, `Remove ${contact}`);
    await expect(shownText(admin, contact)).toHaveCount(0);
    await pressAndWait(admin, "Delete note");
    await expect(shownText(admin, note)).toHaveCount(0);
  },
);

Then(
  "the admin sees the customer {string} with the contact {string} and the note {string}",
  async ({ people, state }, customer: string, contact: string, note: string) => {
    const admin = await pageOf(state, people, "admin");
    await admin.goto(`/dashboard/customers/${idOf(state, customer)}`);
    await expect(admin.getByRole("heading", { name: customer, level: 1 })).toBeVisible();
    await expect(shownText(admin, contact)).toBeVisible();
    await expect(shownText(admin, note)).toBeVisible();
  },
);

// --- The Deleted page -------------------------------------------------------------------------------------

/** The Deleted page's rows as "<name> (<kind>)", newest deletion first. */
async function expectDeletedItems(page: Page, items: string) {
  await page.goto("/dashboard/deleted");
  const table = page.getByRole("table", { name: "Deleted items" });
  const expected = items.split(",").map((i) => i.trim());
  await expect(table.locator("tbody tr")).toHaveCount(expected.length);
  const rows = await table.locator("tbody tr").all();
  const shown = await Promise.all(
    rows.map(async (row) => `${(await row.getByRole("rowheader").innerText()).trim()} (${(await row.getByRole("cell").first().innerText()).trim()})`),
  );
  expect(shown).toEqual(expected);
}

Then("the admin's deleted items are {string}", async ({ people, state }, items: string) => {
  await expectDeletedItems(await pageOf(state, people, "admin"), items);
});

Then("the auditor's deleted items are {string}", async ({ people, state }, items: string) => {
  await expectDeletedItems(await pageOf(state, people, "auditor"), items);
});

Then("the admin's Deleted page is empty", async ({ people, state }) => {
  const admin = await pageOf(state, people, "admin");
  await admin.goto("/dashboard/deleted");
  await expect(shownText(admin, "Nothing has been deleted.")).toBeVisible();
});

When("the admin restores {string}", async ({ people, state }, name: string) => {
  const admin = await pageOf(state, people, "admin");
  await admin.goto("/dashboard/deleted");
  await pressAndWait(admin, `Restore ${name}`);
});

When("the auditor opens the Deleted page from the header", async ({ people, state }) => {
  const auditor = await pageOf(state, people, "auditor");
  await auditor.goto("/dashboard");
  await auditor.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Deleted", exact: true }).click();
  await expect(auditor.getByRole("heading", { name: "Deleted items", level: 1 })).toBeVisible();
});

Then("the auditor sees no {string} button", async ({ people, state }, name: string) => {
  const auditor = await pageOf(state, people, "auditor");
  await expect(auditor.getByRole("table", { name: "Deleted items" })).toBeVisible();
  await expect(auditor.getByRole("button", { name })).toHaveCount(0);
});
