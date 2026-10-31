/**
 * Local dev only: fills one user's workspace with demo customers, projects and tasks in every state.
 *   pnpm --filter @repo/dashboard seed:demo --email you@example.com [--workspace "Workspace name"]
 * Reruns replace the previous demo data (customers tagged "demo" and their projects); nothing else is touched.
 */
import path from "node:path";
import { parseArgs } from "node:util";

import { loadEnvConfig } from "@next/env";
import { and, asc, eq, inArray, schema, sql } from "@repo/db";
import { getMaintenanceDb } from "@repo/db/maintenance";

import { buildDemoPlan, DEMO_TAG } from "@/features/demo/seed-plan";
import { currentWorkspaceId } from "@/features/workspaces/current-workspace";

// Load the repo-root .env, like next.config.ts (tsx runs this as CommonJS, so __dirname is defined).
loadEnvConfig(path.join(__dirname, "../../.."));

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { email: { type: "string" }, workspace: { type: "string" } } });
  if (!values.email) {
    console.error('Usage: pnpm --filter @repo/dashboard seed:demo --email you@example.com [--workspace "Name"]');
    return 1;
  }

  // The maintenance connection: seeding writes past row-level security, as the owner.
  const db = getMaintenanceDb();
  const [user] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, values.email));
  if (!user) {
    console.error(`No user with email ${values.email}. Sign up first.`);
    return 1;
  }

  const memberships = await db
    .select({ workspaceId: schema.workspaceMember.workspaceId, joinedAt: schema.workspaceMember.joinedAt, name: schema.workspace.name })
    .from(schema.workspaceMember)
    .innerJoin(schema.workspace, eq(schema.workspaceMember.workspaceId, schema.workspace.id))
    .where(eq(schema.workspaceMember.userId, user.id))
    .orderBy(asc(schema.workspaceMember.joinedAt), asc(schema.workspaceMember.workspaceId));
  const workspaceId = values.workspace
    ? memberships.find((m) => m.name === values.workspace)?.workspaceId
    : currentWorkspaceId(memberships, undefined);
  if (!workspaceId) {
    console.error(values.workspace ? `${values.email} isn't in a workspace named "${values.workspace}".` : "Open the dashboard once first, so the user has a workspace.");
    return 1;
  }

  const plan = buildDemoPlan(new Date());
  const id = () => crypto.randomUUID();

  const removed = await db.transaction(async (tx) => {
    const previous = await tx
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(and(eq(schema.organization.workspaceId, workspaceId), sql`${schema.organization.tags} @> array[${DEMO_TAG}]::text[]`));
    const previousIds = previous.map((o) => o.id);
    if (previousIds.length > 0) {
      // Projects only lose their customer when it's deleted, so remove the demo projects (and their tasks) first.
      await tx.delete(schema.project).where(inArray(schema.project.organizationId, previousIds));
      await tx.delete(schema.organization).where(inArray(schema.organization.id, previousIds));
    }

    for (const customer of plan) {
      const organizationId = id();
      await tx.insert(schema.organization).values({
        id: organizationId,
        ownerId: user.id,
        workspaceId,
        kind: "customer",
        name: customer.name,
        status: customer.status,
        email: customer.email,
        phone: customer.phone,
        website: customer.website,
        about: customer.about,
        tags: customer.tags,
      });
      const contacts = customer.contacts.map((c) => ({ id: id(), organizationId, name: c.name, role: c.role, email: c.email, phone: c.phone, primary: c.primary }));
      await tx.insert(schema.organizationContact).values(contacts.map(({ primary: _, ...c }) => c));
      await tx
        .update(schema.organization)
        .set({ primaryContactId: contacts.find((c) => c.primary)!.id })
        .where(eq(schema.organization.id, organizationId));
      await tx.insert(schema.organizationNote).values(customer.notes.map((n) => ({ id: id(), organizationId, authorId: user.id, ...n })));

      for (const project of customer.projects) {
        const projectId = id();
        await tx.insert(schema.project).values({
          id: projectId,
          name: project.name,
          description: project.description,
          ownerId: user.id,
          workspaceId,
          organizationId,
          createdAt: project.createdAt,
          updatedAt: project.createdAt,
        });
        if (project.tasks.length > 0) {
          await tx.insert(schema.task).values(
            project.tasks.map((t) => ({
              id: id(),
              projectId,
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate,
              completedAt: t.completedAt,
              assigneeId: t.assignedToMe ? user.id : null,
              organizationId: t.linkCustomer ? organizationId : null,
              createdAt: t.createdAt,
              updatedAt: t.completedAt ?? t.createdAt,
            })),
          );
        }
      }
    }
    return previousIds.length;
  });

  const projects = plan.reduce((n, c) => n + c.projects.length, 0);
  const tasks = plan.reduce((n, c) => n + c.projects.reduce((m, p) => m + p.tasks.length, 0), 0);
  const workspaceName = memberships.find((m) => m.workspaceId === workspaceId)!.name;
  console.log(`Seeded "${workspaceName}": ${plan.length} customers, ${projects} projects, ${tasks} tasks${removed ? ` (replaced ${removed} demo customers)` : ""}.`);
  return 0;
}

// Exit explicitly: the database pool would otherwise keep this one-shot script alive.
main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
