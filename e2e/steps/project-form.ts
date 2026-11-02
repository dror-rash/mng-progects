import { expect, type Page } from "@playwright/test";
import { sql } from "@repo/db";
import { getMaintenanceDb } from "@repo/db/maintenance";

// Every project is at one of its customer's sites (task 055). Steps that only need "a project" choose a
// customer and a site on the project form with these helpers; no steps are defined here.

/** The customer used when a scenario names none, and its site. */
export const EVERYDAY_CUSTOMER = "Everyday Client";
export const EVERYDAY_SITE = "Everyday site";

/** The workspace the project form on `page` posts to. */
async function formWorkspaceId(page: Page) {
  const input = page.locator('form input[name="workspaceId"]');
  await expect(input).toHaveCount(1);
  return (await input.inputValue())!;
}

async function customerIdIn(workspaceId: string, name: string) {
  const { rows } = await getMaintenanceDb().execute<{ id: string }>(
    sql`select id from organization where workspace_id = ${workspaceId} and name = ${name} and deleted_at is null`,
  );
  return rows[0]?.id;
}

/** Adds the customer (when missing) and a site of it (when it has none) straight to the database. */
async function ensureCustomerWithSite(workspaceId: string, customer: string, site: string) {
  const db = getMaintenanceDb();
  let customerId = await customerIdIn(workspaceId, customer);
  if (!customerId) {
    customerId = crypto.randomUUID();
    await db.execute(sql`insert into organization (id, workspace_id, name) values (${customerId}, ${workspaceId}, ${customer})`);
  }
  const { rows } = await db.execute<{ id: string }>(
    sql`select id from site where organization_id = ${customerId} and deleted_at is null limit 1`,
  );
  if (rows.length === 0) {
    await db.execute(
      sql`insert into site (id, workspace_id, organization_id, name) values (${crypto.randomUUID()}, ${workspaceId}, ${customerId}, ${site})`,
    );
    return true;
  }
  return false;
}

/** Chooses the site whose option is `site`, or `site (Sub-company)` on a parent's list. */
export async function chooseSite(page: Page, site: string) {
  const select = page.getByLabel("Site", { exact: true });
  const options = await select.locator("option").allInnerTexts();
  const label = options.find((o) => o === site || o.startsWith(`${site} (`));
  expect(label, `no site "${site}" in ${options.join(", ")}`).toBeDefined();
  await select.selectOption({ label: label! });
}

/**
 * On a project form, chooses `customer` (or the everyday customer) and `site` (or the customer's first
 * site, adding one when it has none). Keeps what was typed in the name: the page reloads only before
 * anything is filled in, so call it first.
 */
export async function chooseCustomerAndSite(page: Page, customer?: string, site?: string) {
  const name = customer ?? EVERYDAY_CUSTOMER;
  if (!site && (await ensureCustomerWithSite(await formWorkspaceId(page), name, customer ? `${customer} site` : EVERYDAY_SITE))) {
    await page.reload();
  }
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: name });
  if (site) {
    await chooseSite(page, site);
  } else {
    const select = page.getByLabel("Site", { exact: true });
    const first = (await select.locator("option").allInnerTexts())[1];
    expect(first, `no site of "${name}"`).toBeDefined();
    await select.selectOption({ label: first! });
  }
}

/** Creates a project through the form; ends on its page. */
export async function createProject(page: Page, name: string, customer?: string, site?: string) {
  await page.goto("/dashboard/projects/new");
  await chooseCustomerAndSite(page, customer, site);
  await page.getByLabel("Project name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+$/);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}
