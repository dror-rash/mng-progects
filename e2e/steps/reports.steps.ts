import { expect, type Page } from "@playwright/test";
import { schema } from "@repo/db";
import { getMaintenanceDb } from "@repo/db/maintenance";

import { adminAttachment, attachmentPath, expectDownloadAs, fileOf, uploadError } from "./attachments.steps";
import { Given, type People, type ScenarioState, signUp, Then, userId, When } from "./fixtures";
import { idOf, pageOf, projectPath, shownText } from "./partner-access.steps";

// Uploaded reports (task 064, ADR-0008): attachments of kind "report" on a project, in its "Reports" section.
// The upload scenarios go through the page only, so task 069 can run them against a preview.

const reports = (page: Page) => page.getByRole("region", { name: "Reports", exact: true });

Then("the reports listed are {string}", async ({ page }, names: string) => {
  await expect(reports(page).getByRole("link")).toHaveText(names.split(",").map((n) => n.trim()));
});

Then("the report {string} downloads as {string}", async ({ page }, name: string, fileName: string) => {
  const link = reports(page).getByRole("link", { name, exact: true });
  await expect(link).toBeVisible();
  await expectDownloadAs(page, (await link.getAttribute("href"))!, fileName);
});

// --- The leak suite's two-partner workspace (partner-access.steps.ts) --------------------------------------

Given("the admin uploaded the report {string} to {string}", async ({ state }, name: string, project: string) => {
  await adminAttachment(state, "report", name, idOf(state, project), null);
});

When("I open the address of the report {string}", async ({ state }, name: string) => {
  state.keptUrl = attachmentPath(idOf(state, `${name}:attachment`));
});

When(
  "I start a report upload on {string} with the project id of {string}",
  async ({ page, state }, project: string, other: string) => {
    state.replay = async (id) => {
      await page.goto(projectPath(state, project));
      await reports(page)
        .locator('input[name="projectId"]')
        .evaluate((input, value) => {
          (input as HTMLInputElement).value = value;
        }, id);
      await page.getByLabel("Upload a report", { exact: true }).setInputFiles(fileOf("sneaky-report.pdf"));
      await expect(uploadError(page)).toBeVisible();
    };
    await state.replay(idOf(state, other));
  },
);

Then("the admin sees no reports on {string}", async ({ people, state }, project: string) => {
  const admin = await pageOf(state, people, "admin");
  await admin.goto(projectPath(state, project));
  await expect(reports(admin)).toContainText("No reports yet.");
  await expect(reports(admin).getByRole("link")).toHaveCount(0);
});

/** A user of the partner (signed up and made a member on first use), in a browser of their own. */
async function partnerUser(state: ScenarioState, people: People, partner: string) {
  const key = `${partner} user`;
  const known = state.accounts?.[key]?.page;
  if (known) return known;
  const page = await people.newPerson();
  const account = await signUp(page, `${partner} User`);
  await getMaintenanceDb()
    .insert(schema.workspaceMember)
    .values({ workspaceId: idOf(state, "workspace"), userId: await userId(page), role: "partner", partnerId: idOf(state, partner) });
  state.accounts = { ...state.accounts, [key]: { account, page } };
  return page;
}

When("the {string} user opens the {string} project page", async ({ people, state }, partner: string, project: string) => {
  const page = await partnerUser(state, people, partner);
  await page.goto(projectPath(state, project));
  await expect(page.getByRole("heading", { name: project, level: 1 })).toBeVisible();
});

Then("the {string} user sees the text {string}", async ({ people, state }, partner: string, text: string) => {
  await expect(shownText(await partnerUser(state, people, partner), text)).toBeVisible();
});
