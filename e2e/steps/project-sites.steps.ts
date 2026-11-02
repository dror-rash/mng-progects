import { expect, type Page } from "@playwright/test";
import { sql } from "@repo/db";
import { getMaintenanceDb } from "@repo/db/maintenance";

import { Given, userId, When } from "./fixtures";
import { chooseValue, idOf } from "./partner-access.steps";
import { chooseSite, createProject } from "./project-form";
import { myRecordId } from "./sites.steps";
import { pressAndWait } from "./workspaces.steps";

// A project's site (task 055, ADR-0008).

/** How the customer select shows the site's customer: "Parent › Sub-company" for a sub-company. */
async function customerLabelOfSite(siteId: string) {
  const { rows } = await getMaintenanceDb().execute<{ label: string }>(
    sql`select case when p.name is null then o.name else p.name || ' › ' || o.name end as label
        from site s join organization o on o.id = s.organization_id left join organization p on p.id = o.parent_id
        where s.id = ${siteId}`,
  );
  return rows[0]!.label;
}

/** My workspace: the one I joined first. */
async function myWorkspaceId(page: Page) {
  const { rows } = await getMaintenanceDb().execute<{ workspace_id: string }>(
    sql`select workspace_id from workspace_member where user_id = ${await userId(page)} order by joined_at limit 1`,
  );
  return rows[0]!.workspace_id;
}

/** A project written straight to the database, as projects were before every project needed a site. */
async function insertOldProject(workspaceId: string, name: string, organizationId: string | null) {
  await getMaintenanceDb().execute(
    sql`insert into project (id, name, workspace_id, organization_id) values (${crypto.randomUUID()}, ${name}, ${workspaceId}, ${organizationId})`,
  );
}

Given("I have a project named {string} at the site {string}", async ({ page }, name: string, site: string) => {
  const customer = await customerLabelOfSite(await myRecordId(page, "site", site));
  await createProject(page, name, customer, site);
});

Given(
  "I have a project named {string} for {string} at the site {string}",
  async ({ page }, name: string, customer: string, site: string) => {
    await createProject(page, name, customer, site);
  },
);

Given(
  "a project {string} for {string} from before sites were required, with no site",
  async ({ page }, name: string, customer: string) => {
    await insertOldProject(await myWorkspaceId(page), name, await myRecordId(page, "organization", customer));
  },
);

Given("a project {string} from before sites were required, with no customer or site", async ({ page }, name: string) => {
  await insertOldProject(await myWorkspaceId(page), name, null);
});

When("I open the copy page of the project {string}", async ({ page }, name: string) => {
  await page.goto(`/dashboard/projects/${await myRecordId(page, "project", name)}/copy`);
  await expect(page.getByRole("heading", { name: "Copy to new project" })).toBeVisible();
});

// A tampered form: a site the select doesn't offer for the chosen customer.
When("I choose the site {string} in {string} by editing the page", async ({ page }, site: string, label: string) => {
  await chooseValue(page.getByLabel(label, { exact: true }), await myRecordId(page, "site", site));
});

/** On a new project form: the customer and site of the project `name`. */
When("I choose the customer and site of {string}", async ({ page }, name: string) => {
  const { rows } = await getMaintenanceDb().execute<{ site_id: string; site: string }>(
    sql`select s.id as site_id, s.name as site from project pr join site s on s.id = pr.site_id
        where pr.id = ${await myRecordId(page, "project", name)}`,
  );
  expect(rows, `"${name}" has no site`).toHaveLength(1);
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: await customerLabelOfSite(rows[0]!.site_id) });
  await chooseSite(page, rows[0]!.site);
});

// --- The leak suite's two-partner workspace (partner-access.steps.ts) --------------------------------------

Given("the project {string} is at the site {string}", async ({ state }, project: string, site: string) => {
  await getMaintenanceDb().execute(sql`update project set site_id = ${idOf(state, site)} where id = ${idOf(state, project)}`);
});

When("I post the new project with the site id of {string}", async ({ page, state }, site: string) => {
  const name = await page.getByLabel("Project name").inputValue();
  state.replay = async (id) => {
    await page.goto("/dashboard/projects/new");
    await page.getByLabel("Project name").fill(name);
    await chooseValue(page.getByLabel("Site", { exact: true }), id);
    await pressAndWait(page, "Create Project");
  };
  await state.replay(idOf(state, site));
});
