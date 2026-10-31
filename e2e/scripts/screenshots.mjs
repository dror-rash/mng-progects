// Screenshots of every page and form (error states included) for a validation report.
// Run against running dev servers (`pnpm dev`): `pnpm --filter @repo/e2e screenshots`.
// Signs up two throwaway people with fictional sample data; writes PNGs and manifest.json to e2e/screenshots/.
/* global process, console */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { chromium, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = fileURLToPath(new URL("../screenshots", import.meta.url));
mkdirSync(OUT, { recursive: true });
const manifest = [];
const run = Date.now().toString(36);
const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

async function settle(page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(600);
}
async function shot(page, id, area, title, what, opts = {}) {
  await settle(page);
  // The Next.js dev-mode badge isn't part of the app; hide it so it covers nothing.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `${OUT}/${id}.png`, fullPage: opts.fullPage ?? true });
  manifest.push({ id, area, title, what, url: page.url().replace(BASE, "") || "/", ok: true });
  console.log("shot", id);
}
async function step(id, fn) {
  try {
    await fn();
  } catch (e) {
    manifest.push({ id, ok: false, error: String(e.message ?? e).split("\n").slice(0, 3).join(" ") });
    console.log("FAIL", id, String(e.message ?? e).split("\n")[0]);
  }
}
async function press(page, name) {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST").catch(() => {}),
    page.getByRole("button", { name, exact: true }).first().click(),
  ]);
  await settle(page);
}
async function apiSignUp(page, name) {
  const creds = { email: `${name.split(" ")[0].toLowerCase()}-${run}@example.com`, password: "correct-horse-battery" };
  const h = { origin: BASE };
  expect((await page.request.post("/api/auth/sign-up/email", { data: { name, ...creds }, headers: h })).ok()).toBeTruthy();
  expect((await page.request.post("/api/auth/sign-in/email", { data: creds, headers: h })).ok()).toBeTruthy();
  return creds;
}
async function fillIf(page, label, value) {
  const field = page.getByLabel(label, { exact: true });
  if (await field.count()) await field.first().fill(value);
}

const browser = await chromium.launch();
const ctx = (viewport = { width: 1280, height: 800 }) => browser.newContext({ baseURL: BASE, viewport });

// ---------- Signed out ----------
const anon = await (await ctx()).newPage();
await step("01-landing", async () => {
  await anon.goto("/");
  await shot(anon, "01-landing", "Public site", "Landing page", "Signed-out landing page with calls to sign up and log in.");
});
await step("02-login", async () => {
  await anon.goto("/login");
  await shot(anon, "02-login", "Public site", "Log in", "Login form (email, password).");
});
await step("03-login-error", async () => {
  await anon.locator("#email").fill(`nobody-${run}@example.com`);
  await anon.locator("#password").fill("wrong-password-123");
  await anon.getByRole("button", { name: "Log in" }).click();
  await anon.getByRole("alert").filter({ hasText: /./ }).first().waitFor({ timeout: 10000 });
  await shot(anon, "03-login-error", "Public site", "Log in: wrong password", "Wrong credentials are rejected with an error on the form.");
});
await step("04-signup", async () => {
  await anon.goto("/signup");
  await shot(anon, "04-signup", "Public site", "Sign up", "Account creation form (name, email, password).");
});
await step("05-protected-redirect", async () => {
  await anon.goto("/dashboard/projects");
  await anon.waitForURL(/\/login/);
  await shot(anon, "05-protected-redirect", "Public site", "Protected page while signed out", "Opening /dashboard/projects while signed out lands on the login page (it returns there after logging in).");
});
await step("06-example-zone", async () => {
  await anon.goto("/example");
  await shot(anon, "06-example-zone", "Public site", "Example zone", "The template's sample zone, served through the shell on the same origin.");
});

// ---------- Admin: Dana ----------
const dana = await (await ctx()).newPage();
let danaEmail;
await step("07-signup-filled", async () => {
  danaEmail = `dana-${run}@example.com`;
  await dana.goto("/signup");
  await dana.locator("#name").fill("Dana Admin");
  await dana.locator("#email").fill(danaEmail);
  await dana.locator("#password").fill("correct-horse-battery");
  await shot(dana, "07-signup-filled", "Public site", "Sign up: filled in", "A new account about to be created.");
  await dana.getByRole("button", { name: "Create account" }).click();
  await dana.waitForURL((u) => !u.pathname.startsWith("/signup"), { timeout: 15000 });
});
await step("08-example-account", async () => {
  await dana.goto("/example/account");
  await shot(dana, "08-example-account", "Public site", "Example zone account page", "The same session works in another zone (one login across zones).");
});

// Customers
let acmeUrl;
await step("09-customer-new", async () => {
  await dana.goto("/dashboard/customers/new");
  await shot(dana, "09-customer-new", "Customers", "New customer form", "Name, status, email, phone, website, address, company ID, tags and general information.");
});
await step("10-customer-new-error", async () => {
  await dana.getByLabel("Name", { exact: true }).fill("Acme Ltd");
  await fillIf(dana, "Email", "not-an-email");
  await dana.getByLabel("Email", { exact: true }).evaluate((el) => el.setAttribute("type", "text"));
  await press(dana, "Save customer");
  await dana.getByRole("alert").filter({ hasText: /./ }).first().waitFor({ timeout: 10000 });
  await shot(dana, "10-customer-new-error", "Customers", "New customer: invalid email", "The server rejects an invalid email; the error shows on the field and the typed values stay.");
});
await step("customer-acme", async () => {
  await fillIf(dana, "Email", "ops@acme.example");
  await fillIf(dana, "Phone", "+1 555 0100");
  await fillIf(dana, "Website", "https://acme.example");
  await fillIf(dana, "Address", "1 Market Street, Springfield");
  await fillIf(dana, "Company ID", "ACME-4411");
  await fillIf(dana, "Tags", "retail, priority");
  await fillIf(dana, "About", "Long-standing retail customer; quarterly roadmap reviews.");
  await press(dana, "Save customer");
  await dana.waitForURL(/\/dashboard\/customers\/[^/]+$/);
  acmeUrl = dana.url();
  for (const [name, role, email] of [["Jane Cooper", "Head of Operations", "jane@acme.example"], ["Mark Lee", "IT lead", "mark@acme.example"]]) {
    await dana.getByLabel("Contact name", { exact: true }).fill(name);
    await fillIf(dana, "Role", role);
    await fillIf(dana, "Contact email", email);
    await press(dana, "Add contact");
  }
  for (const body of ["Kick-off call: agreed on a new storefront by Q1.", "Sent the redesign proposal; waiting for budget sign-off."]) {
    await dana.getByLabel("Note", { exact: true }).fill(body);
    await press(dana, "Add note");
  }
});
await step("customer-globex", async () => {
  await dana.goto("/dashboard/customers/new");
  await dana.getByLabel("Name", { exact: true }).fill("Globex");
  await dana.getByLabel("Status", { exact: true }).selectOption({ index: 1 }).catch(() => {});
  await fillIf(dana, "Tags", "manufacturing");
  await press(dana, "Save customer");
  await dana.waitForURL(/\/dashboard\/customers\/[^/]+$/);
});

// Projects
const projectUrls = {};
await step("11-project-create-error", async () => {
  await dana.goto("/dashboard/projects/new");
  await dana.getByLabel("Project name").fill("   ");
  await dana.getByLabel("Customer", { exact: true }).selectOption({ label: "Acme Ltd" });
  await press(dana, "Create Project");
  await dana.getByRole("alert").filter({ hasText: /./ }).first().waitFor({ timeout: 10000 });
  await shot(dana, "11-project-create-error", "Projects", "Create project: blank name", "A blank name is rejected inline; the chosen customer (Acme Ltd) stays selected.", { fullPage: false });
});
await step("projects", async () => {
  for (const [name, customer] of [["Website Redesign", "Acme Ltd"], ["Mobile App", "Globex"], ["Q4 Marketing", "Acme Ltd"], ["Internal Ops", null]]) {
    await dana.goto("/dashboard/projects/new");
    await dana.getByLabel("Project name").fill(name);
    if (customer) await dana.getByLabel("Customer", { exact: true }).selectOption({ label: customer });
    await press(dana, "Create Project");
    await dana.waitForURL(/\/dashboard\/projects\/[^/]+$/);
    projectUrls[name] = dana.url();
  }
});

// Tasks on Website Redesign
const board = () => dana.goto(projectUrls["Website Redesign"]);
const card = (title) => dana.getByRole("listitem").filter({ hasText: title });
await step("12-add-task-error", async () => {
  await board();
  await dana.getByLabel("Task title").fill("   ");
  await press(dana, "Add task");
  await dana.getByRole("alert").filter({ hasText: /./ }).first().waitFor({ timeout: 10000 });
  await shot(dana, "12-add-task-error", "Projects", "Add task: blank title", "A blank task title is rejected inline on the board.", { fullPage: false });
});
await step("tasks", async () => {
  await board();
  for (const t of ["Write homepage copy", "Design mockups", "Set up analytics", "Launch checklist", "Fix navigation bug"]) {
    await dana.getByLabel("Task title").fill(t);
    await press(dana, "Add task");
    await card(t).first().waitFor();
  }
  for (const [t, s] of [["Design mockups", "In progress"], ["Fix navigation bug", "In progress"], ["Set up analytics", "Done"]]) {
    await card(t).getByRole("button", { name: `Move to ${s}` }).click();
    await dana.getByRole("region", { name: s }).getByRole("listitem").filter({ hasText: t }).waitFor();
  }
  // Other projects get a few tasks too, so the home page has numbers.
  for (const [p, ts] of [["Mobile App", ["App store listing", "Push notifications"]], ["Q4 Marketing", ["Campaign brief"]]]) {
    await dana.goto(projectUrls[p]);
    for (const t of ts) {
      await dana.getByLabel("Task title").fill(t);
      await press(dana, "Add task");
      await card(t).first().waitFor();
    }
  }
});

async function editTask(title, fields) {
  await board();
  await dana.getByRole("link", { name: title, exact: true }).click();
  await dana.waitForURL(/\/tasks\/[^/]+$/);
  if (fields.description) await dana.getByLabel("Description", { exact: true }).fill(fields.description);
  if (fields.priority) await dana.getByLabel("Priority", { exact: true }).selectOption({ label: fields.priority });
  if (fields.due) await dana.getByLabel("Due date", { exact: true }).fill(fields.due);
  if (fields.assignee) await dana.getByLabel("Assignee", { exact: true }).selectOption({ label: fields.assignee });
  if (fields.customer) await dana.getByLabel("Customer", { exact: true }).selectOption({ label: fields.customer });
  await press(dana, "Save changes");
}
await step("task-fields", async () => {
  await editTask("Write homepage copy", { description: "Hero, features and pricing sections. Tone: friendly, short.", priority: "High", due: day(3) });
  await editTask("Launch checklist", { priority: "High", due: day(-2) });
  await editTask("Design mockups", { due: day(5) });
  await editTask("Fix navigation bug", { priority: "Low" });
});

// Workspace: invite a teammate
let inviteLink;
const sam = await (await ctx()).newPage();
await step("13-workspace-members-admin", async () => {
  await dana.goto("/dashboard/workspace");
  await press(dana, "Create invite link");
  const field = dana.getByLabel("Invite link", { exact: true });
  await field.waitFor();
  inviteLink = await field.inputValue();
  await shot(dana, "13-workspace-members-admin", "Workspaces", "Members page (admin) with a new invite link", "Admins see members and invite links; a new link is shown once (only its hash is stored). Role controls appear once there is another member (next shots).");
});
await step("14-invite-join", async () => {
  await apiSignUp(sam, "Sam Teammate");
  await sam.goto(inviteLink);
  await shot(sam, "14-invite-join", "Workspaces", "Invite link: join page", "A signed-in person opening a valid link sees which workspace they're joining.");
  await press(sam, "Join workspace");
  await sam.waitForURL(/\/dashboard$/);
});
await step("15-members-member-view", async () => {
  await sam.goto("/dashboard/workspace");
  await shot(sam, "15-members-member-view", "Workspaces", "Members page (member)", "Members see who is in the workspace but get no admin controls or invite links.");
});
await step("16-members-with-teammate", async () => {
  await dana.goto("/dashboard/workspace");
  await shot(dana, "16-members-with-teammate", "Workspaces", "Members page after the teammate joined", "Admin view with the teammate listed and Make admin / Remove controls; the open link shows its expiry and Revoke (its URL is never shown again).");
});
await step("17-leave-error", async () => {
  await press(dana, "Leave workspace");
  await dana.getByRole("alert").filter({ hasText: "admin" }).first().waitFor({ timeout: 10000 });
  await dana.getByRole("button", { name: "Leave workspace" }).scrollIntoViewIfNeeded();
  await shot(dana, "17-leave-error", "Workspaces", "Leave workspace: last admin", "The only admin can't leave: \"A workspace needs at least one admin\".", { fullPage: false });
});
await step("assign", async () => {
  await editTask("Write homepage copy", { assignee: "Sam Teammate" });
  await editTask("Design mockups", { assignee: "Dana Admin" });
  await editTask("Launch checklist", { assignee: "Dana Admin" });
});

// Project pages
await step("18-project-board", async () => {
  await board();
  await shot(dana, "18-project-board", "Projects", "Project board", "To do / In progress / Done columns with priority, due dates (overdue in red), assignee and customer on each card; add-task form.");
});
await step("19-task-detail", async () => {
  await dana.getByRole("link", { name: "Write homepage copy", exact: true }).click();
  await dana.waitForURL(/\/tasks\/[^/]+$/);
  await shot(dana, "19-task-detail", "Projects", "Task page", "Edit title, description, priority, due date, assignee (workspace members) and customer; delete the task.");
});
await step("20-task-overdue", async () => {
  await board();
  await dana.getByRole("link", { name: "Launch checklist", exact: true }).click();
  await dana.waitForURL(/\/tasks\/[^/]+$/);
  await shot(dana, "20-task-overdue", "Projects", "Task page: overdue", "An open task past its due date says it is overdue.", { fullPage: false });
});
await step("21-project-edit", async () => {
  await dana.goto(projectUrls["Website Redesign"] + "/edit");
  await shot(dana, "21-project-edit", "Projects", "Edit project", "Rename, describe and link the project to a customer.");
});
await step("22-project-delete", async () => {
  await dana.goto(projectUrls["Internal Ops"] + "/delete");
  await shot(dana, "22-project-delete", "Projects", "Delete project: confirmation", "Deleting asks for confirmation and says the tasks go with it.");
});
await step("23-all-projects", async () => {
  await dana.goto("/dashboard/projects");
  await shot(dana, "23-all-projects", "Projects", "All projects", "Every project in the current workspace with progress and customer; “New project” opens the create page.");
});

// Customers pages
await step("24-customer-detail", async () => {
  await dana.goto(acmeUrl);
  await shot(dana, "24-customer-detail", "Customers", "Customer page", "Details, contacts (add / edit / remove), dated notes with author, the customer's projects and open tasks.");
});
await step("25-customer-edit", async () => {
  await dana.goto(acmeUrl + "/edit");
  await shot(dana, "25-customer-edit", "Customers", "Edit customer", "The customer form with current values.");
});
await step("26-contact-edit", async () => {
  await dana.goto(acmeUrl);
  const href = await dana.locator('a[href*="/contacts/"][href$="/edit"]').first().getAttribute("href");
  await dana.goto(BASE + href);
  await shot(dana, "26-contact-edit", "Customers", "Edit contact person", "Name, role, email and phone of a contact.");
});
await step("27-customer-delete", async () => {
  await dana.goto(acmeUrl + "/delete");
  await shot(dana, "27-customer-delete", "Customers", "Delete customer: confirmation", "Deleting asks for confirmation; its projects are kept without a customer.");
});
await step("28-customers-list", async () => {
  await dana.goto("/dashboard/customers");
  await shot(dana, "28-customers-list", "Customers", "Customers directory", "All customers with status and tags; filter by status (Lead / Active / Past) and tag.");
});
await step("29-customers-filtered", async () => {
  const tag = dana.getByLabel("Filter by tag");
  if ((await tag.evaluate((el) => el.tagName)) === "SELECT") await tag.selectOption({ label: "retail" });
  else await dana.getByRole("link", { name: "retail", exact: true }).first().click();
  await dana.waitForURL(/tag=/);
  await shot(dana, "29-customers-filtered", "Customers", "Customers filtered by tag", "Filtering by the \"retail\" tag (the filter is kept in the URL).");
});

// Home, My tasks, workspaces
await step("30-home", async () => {
  await dana.goto("/dashboard");
  await shot(dana, "30-home", "Home", "Dashboard home (metrics)", "Totals, overdue and due this week, tasks by status, activity this week and the most recently started projects (up to five).");
});
await step("31-my-tasks", async () => {
  await dana.goto("/dashboard/my-tasks");
  await shot(dana, "31-my-tasks", "Home", "My tasks", "My open tasks, soonest due first (overdue on top), then priority. Tasks from all my workspaces are listed together.");
});
await step("32-my-tasks-teammate", async () => {
  await sam.goto("/dashboard/my-tasks");
  await shot(sam, "32-my-tasks-teammate", "Home", "My tasks (teammate)", "The teammate sees the task assigned to them in the shared workspace.");
});
await step("33-workspaces", async () => {
  await dana.goto("/dashboard/workspaces");
  await shot(dana, "33-workspaces", "Workspaces", "Workspaces page", "My workspaces with role and the current one marked; create a new workspace.");
});
await step("34-new-workspace-error", async () => {
  await dana.getByLabel("Workspace name", { exact: true }).fill("   ");
  await press(dana, "Create workspace");
  await dana.getByRole("alert").filter({ hasText: /./ }).first().waitFor({ timeout: 10000 });
  await shot(dana, "34-new-workspace-error", "Workspaces", "New workspace: blank name", "\"Workspace name is required\" on the form.", { fullPage: false });
});
await step("35-workspaces-switch", async () => {
  await dana.getByLabel("Workspace name", { exact: true }).fill("Acme Team");
  await press(dana, "Create workspace");
  await dana.waitForURL(/\/dashboard$/);
  await dana.goto("/dashboard/workspaces");
  await shot(dana, "35-workspaces-switch", "Workspaces", "Workspaces page with two workspaces", "After creating \"Acme Team\" it is current; Switch goes back to the personal workspace.");
  await press(dana, "Switch to Dana Admin's workspace");
});
await step("36-teammate-workspaces", async () => {
  await sam.goto("/dashboard/workspaces");
  await shot(sam, "36-teammate-workspaces", "Workspaces", "Workspaces page (teammate)", "The teammate is a member of Dana's workspace and admin of their own.");
});
await step("37-invite-invalid", async () => {
  await sam.goto("/dashboard/invite/not-a-real-token");
  await shot(sam, "37-invite-invalid", "Workspaces", "Invite link: invalid", "A wrong, expired or revoked link says so instead of joining.", { fullPage: false });
});
await step("38-not-found", async () => {
  await dana.goto("/dashboard/projects/does-not-exist");
  await shot(dana, "38-not-found", "Projects", "Project not found", "A project outside my workspaces (or a wrong id) shows Not found, never its data.", { fullPage: false });
});

// Phone width
const phone = await (await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, storageState: await dana.context().storageState() })).newPage();
await step("39-mobile-home", async () => {
  await phone.goto("/dashboard");
  await shot(phone, "39-mobile-home", "Phone", "Home on a phone (390 px)", "The dashboard home at phone width.");
});
await step("40-mobile-board", async () => {
  await phone.goto(projectUrls["Website Redesign"]);
  await shot(phone, "40-mobile-board", "Phone", "Project board on a phone (390 px)", "The board stacks its columns at phone width.");
});

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log("done", manifest.filter((m) => m.ok).length, "ok,", manifest.filter((m) => !m.ok).length, "failed");
await browser.close();
