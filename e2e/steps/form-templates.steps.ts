import { expect, type Page } from "@playwright/test";

import { Given, type ScenarioState, signUp, Then, When } from "./fixtures";
import { idOf, ids, pageOf, shownText } from "./partner-access.steps";
import { createWorkspace, pressAndWait } from "./workspaces.steps";

// Reading forms (task 060, ADR-0008). Every form is built through the app's pages (no database writes), so
// task 069 can run these steps against a preview. A form's fields are the row headers of the table in its
// "Fields" section.

const formPath = (id: string) => `/dashboard/forms/${id}`;

const fieldsOf = (page: Page) => page.getByRole("region", { name: "Fields", exact: true });

const lines = (text: string) => text.split(",").map((t) => t.trim());

/** Creates a draft form in the current workspace and returns its id (from the address it lands on). */
async function createForm(page: Page, name: string) {
  expect((await page.goto("/dashboard/forms/new"))?.status(), "the New form page").toBe(200);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await pressAndWait(page, "Create form");
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/forms\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

/** Adds a field to the draft form the page shows. */
async function addField(page: Page, label: string, type: string) {
  await page.getByLabel("Label", { exact: true }).fill(label);
  await page.getByLabel("Type", { exact: true }).selectOption({ label: type });
  await pressAndWait(page, "Add field");
  await expect(fieldsOf(page).getByRole("button", { name: `Remove ${label}`, exact: true })).toBeVisible();
}

/** The hidden fields (name → value) of the form with the button `button`, React's own left out. */
async function hiddenFieldsOf(page: Page, button: string) {
  return page.locator("form", { has: page.getByRole("button", { name: button, exact: true }) }).evaluate((form) =>
    Object.fromEntries(
      [...form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')]
        .filter((input) => input.name && !input.name.startsWith("$"))
        .map((input) => [input.name, input.value]),
    ),
  );
}

/** Sets the hidden fields of the form with the button `button`; each one must be on that form. */
async function setHiddenFields(page: Page, button: string, values: Record<string, string>) {
  await page.locator("form", { has: page.getByRole("button", { name: button, exact: true }) }).evaluate((form, fields) => {
    for (const [name, value] of Object.entries(fields)) {
      const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) throw new Error(`no hidden field "${name}" on the form`);
      input.value = value;
    }
  }, values);
}

/**
 * Builds the form `name` with one Number field through the pages, as `page` (an admin of its current
 * workspace), and publishes it unless `draft`. Keeps the hidden fields of its "Add field", "Publish" and
 * "Remove <field>" forms while it is a draft, so later steps can post them from another form.
 */
async function buildForm(page: Page, state: ScenarioState, name: string, field: string, draft = false) {
  ids(state)[name] = await createForm(page, name);
  await addField(page, field, "Number");
  state.hiddenFields ??= {};
  for (const button of ["Add field", "Publish", `Remove ${field}`]) {
    state.hiddenFields[`${name}:${button}`] = await hiddenFieldsOf(page, button);
  }
  if (!draft) {
    await pressAndWait(page, "Publish");
    await expect(page.getByRole("button", { name: "Add field", exact: true })).toHaveCount(0);
  }
}

/** Opens a form's page and waits for it. */
async function openForm(page: Page, state: ScenarioState, name: string) {
  await page.goto(formPath(idOf(state, name)));
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

// --- Forms through the pages --------------------------------------------------------------------------------

When("I fill in {string} with the lines {string}", async ({ page }, label: string, text: string) => {
  await page.getByLabel(label).fill(lines(text).join("\n"));
});

Then("the fields listed are {string}", async ({ page }, labels: string) => {
  await expect(fieldsOf(page).getByRole("rowheader")).toHaveText(lines(labels));
});

Given(
  "I have a published reading form {string} with the field {string}",
  async ({ page, state }, name: string, field: string) => {
    await buildForm(page, state, name, field);
  },
);

When("I open the form {string}", async ({ page, state }, name: string) => {
  await openForm(page, state, name);
});

When("I open the address of the form {string}", async ({ page, state }, name: string) => {
  state.replay = async (id) => {
    await page.goto(formPath(id));
  };
  await state.replay(idOf(state, name));
});

Given("another user has a reading form {string}", async ({ people, state }, name: string) => {
  const other = await people.newPerson();
  await signUp(other, "Other User");
  ids(state)[name] = await createForm(other, name);
});

// --- The leak suite's two-partner workspace (partner-access.steps.ts) ----------------------------------------

Given(
  "the admin published the reading form {string} with the field {string}",
  async ({ people, state }, name: string, field: string) => {
    await buildForm(await pageOf(state, people, "admin"), state, name, field);
  },
);

Given(
  "the admin has a draft reading form {string} with the field {string}",
  async ({ people, state }, name: string, field: string) => {
    await buildForm(await pageOf(state, people, "admin"), state, name, field, true);
  },
);

When("the auditor opens the form {string}", async ({ people, state }, name: string) => {
  await openForm(await pageOf(state, people, "auditor"), state, name);
});

Then(
  "the admin sees the draft form {string} with the fields {string}",
  async ({ people, state }, name: string, labels: string) => {
    const admin = await pageOf(state, people, "admin");
    await openForm(admin, state, name);
    await expect(shownText(admin, "Draft")).toBeVisible();
    await expect(fieldsOf(admin).getByRole("rowheader")).toHaveText(lines(labels));
  },
);

// --- Tampered forms: the real form's hidden fields, posted from a draft form of mine ----------------------------
// A published form has no add-field or remove forms, and a partner user has no form pages at all. So I post the
// forms of a draft ("Decoy", in a workspace of my own where I am an admin) with the hidden fields the target
// form's page had while it was a draft. The server must refuse on the target form, not on the missing form.

/** My draft form "Decoy" with the field "Decoy field", in a new workspace of mine (built once per scenario). */
async function decoyForm(page: Page, state: ScenarioState) {
  if (!state.ids?.Decoy) {
    await createWorkspace(page, "Decoy workspace");
    ids(state).Decoy = await createForm(page, "Decoy");
    await addField(page, "Decoy field", "Text");
  }
  return idOf(state, "Decoy");
}

/**
 * Posts the decoy's form with `decoyButton`, carrying the hidden fields `form`'s `button` form had; `state.replay`
 * posts it again with another id in place of the form's.
 */
async function postAs(page: Page, state: ScenarioState, form: string, button: string, decoyButton: string, label?: string) {
  const values = state.hiddenFields?.[`${form}:${button}`];
  expect(values, `no "${button}" form kept for "${form}"`).toBeDefined();
  const formId = idOf(state, form);
  expect(Object.values(values!), `the "${button}" form must carry the form's id in a hidden field`).toContain(formId);
  const decoy = await decoyForm(page, state);
  state.replay = async (id) => {
    await page.goto(formPath(decoy));
    await expect(page.getByRole("heading", { name: "Decoy", level: 1 })).toBeVisible();
    if (label !== undefined) await page.getByLabel("Label", { exact: true }).fill(label);
    await setHiddenFields(page, decoyButton, Object.fromEntries(Object.entries(values!).map(([k, v]) => [k, v === formId ? id : v])));
    await pressAndWait(page, decoyButton);
  };
  await state.replay(formId);
}

When(
  "I post the add-field form of the form {string} with the label {string}",
  async ({ page, state }, form: string, label: string) => {
    await postAs(page, state, form, "Add field", "Add field", label);
  },
);

When(
  "I post the remove form of the field {string} of the form {string}",
  async ({ page, state }, field: string, form: string) => {
    await postAs(page, state, form, `Remove ${field}`, "Remove Decoy field");
  },
);

When("I post the publish form of the form {string}", async ({ page, state }, form: string) => {
  await postAs(page, state, form, "Publish", "Publish");
});
