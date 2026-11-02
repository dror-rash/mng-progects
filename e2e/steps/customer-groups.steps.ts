import { expect, type Page } from "@playwright/test";
import { and, eq, inArray, schema, sql } from "@repo/db";
import { getMaintenanceDb } from "@repo/db/maintenance";

import { Given, Then, userId, When } from "./fixtures";
import { ids, idOf } from "./partner-access.steps";
import { pressAndWait } from "./workspaces.steps";

// Customer groups (task 053, ADR-0008): sub-companies, one level under a top-level customer.

async function createSubCompany(page: Page, parent: string, name: string, status = "Active") {
  await page.goto("/dashboard/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Status", { exact: true }).selectOption({ label: status });
  await page.getByLabel("Part of", { exact: true }).selectOption({ label: parent });
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

Given("{string} has a sub-company {string}", async ({ page }, parent: string, name: string) => {
  await createSubCompany(page, parent, name);
});

Given(
  "{string} has a sub-company {string} with status {string}",
  async ({ page }, parent: string, name: string, status: string) => {
    await createSubCompany(page, parent, name, status);
  },
);

When("I add the contact {string} with the role {string}", async ({ page }, name: string, role: string) => {
  await page.getByLabel("Contact name", { exact: true }).fill(name);
  await page.getByLabel("Role", { exact: true }).fill(role);
  await page.getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByRole("region", { name: "Contacts", exact: true })).toContainText(name);
});

/** The customers list as "<name>" or "<name> (part of <parent>)", in order. */
Then("the customers listed are {string}", async ({ page }, expected: string) => {
  const list = page.getByRole("list", { name: "Customers", exact: true });
  const want = expected.split(",").map((c) => c.trim());
  await expect(list.getByRole("listitem")).toHaveCount(want.length);
  const shown = await Promise.all(
    (await list.getByRole("listitem").all()).map(async (row) => {
      const name = (await row.getByRole("link").first().innerText()).trim();
      const partOf = row.getByText(/^part of /);
      return (await partOf.count()) > 0 ? `${name} (${(await partOf.innerText()).trim()})` : name;
    }),
  );
  expect(shown).toEqual(want);
});

When("I open the edit page of the customer {string}", async ({ page }, name: string) => {
  await page.goto("/dashboard/customers");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Edit customer" }).click();
  await expect(page.getByLabel("Part of", { exact: true })).toBeVisible();
});

When("I restore {string} from the Deleted page", async ({ page }, name: string) => {
  await page.goto("/dashboard/deleted");
  await pressAndWait(page, `Restore ${name}`);
});

// A tampered form: puts the id of one of my customers that the select doesn't offer into it.
When("I choose {string} in {string} by editing the page", async ({ page }, customer: string, label: string) => {
  const db = getMaintenanceDb();
  const mine = db
    .select({ id: schema.workspaceMember.workspaceId })
    .from(schema.workspaceMember)
    .where(eq(schema.workspaceMember.userId, await userId(page)));
  const [row] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(and(eq(schema.organization.name, customer), inArray(schema.organization.workspaceId, mine)));
  expect(row).toBeDefined();
  await page.getByLabel(label, { exact: true }).evaluate((select, id) => {
    const option = document.createElement("option");
    option.value = id;
    option.text = "Tampered";
    select.appendChild(option);
    (select as HTMLSelectElement).value = id;
  }, row!.id);
});

// --- The leak suite's two-partner workspace (partner-access.steps.ts) --------------------------------------

Given("the customer {string} has a sub-company {string}", async ({ state }, parent: string, name: string) => {
  const id = crypto.randomUUID();
  const db = getMaintenanceDb();
  await db.insert(schema.organization).values({ id, workspaceId: idOf(state, "workspace"), name });
  await db.execute(sql`update organization set parent_id = ${idOf(state, parent)} where id = ${id}`);
  ids(state)[name] = id;
});
