/**
 * Tables required by Better Auth (email + password). Add your own domain tables below,
 * then run `pnpm db:generate` and commit the new migration.
 * If you enable Better Auth plugins that need tables, regenerate with `npx @better-auth/cli generate`.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
  index,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Workspaces own projects, tasks and customers (ADR-0005). */
export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workspaceMember = pgTable(
  "workspace_member",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** `admin`, `auditor` or `partner` (features/access/roles.ts, ADR-0006). */
    role: text("role").notNull().default("admin"),
    /** The partner company of a `partner` membership; set exactly then. A partner of the same workspace. */
    partnerId: text("partner_id"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_member_user_idx").on(table.userId),
    index("workspace_member_partner_idx").on(table.partnerId),
    foreignKey({
      name: "workspace_member_partner_fk",
      columns: [table.partnerId, table.workspaceId],
      foreignColumns: [partner.id, partner.workspaceId],
    }),
    check("workspace_member_role_check", sql`${table.role} in ('admin', 'auditor', 'partner')`),
    check("workspace_member_partner_check", sql`(${table.role} = 'partner') = (${table.partnerId} is not null)`),
  ],
);

/** Partner companies (ADR-0006): outside companies working on their own projects for customers assigned to them. */
export const partner = pgTable(
  "partner",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  // (id, workspace_id) is unique so memberships, invites, projects and assignments can require a partner of their own workspace.
  (table) => [unique("partner_id_workspace_unique").on(table.id, table.workspaceId), index("partner_workspace_idx").on(table.workspaceId)],
);

/** Which customers each partner works for (ADR-0006); many to many, both in the same workspace. */
export const customerPartner = pgTable(
  "customer_partner",
  {
    organizationId: text("organization_id").notNull(),
    partnerId: text("partner_id").notNull(),
    /** Shared by the customer and the partner (both foreign keys include it). */
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.partnerId] }),
    index("customer_partner_partner_idx").on(table.partnerId),
    foreignKey({
      name: "customer_partner_organization_fk",
      columns: [table.organizationId, table.workspaceId],
      foreignColumns: [organization.id, organization.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "customer_partner_partner_fk",
      columns: [table.partnerId, table.workspaceId],
      foreignColumns: [partner.id, partner.workspaceId],
    }).onDelete("cascade"),
  ],
);

/** Invite links (task 023). Only a SHA-256 hash of the token is stored; links expire and can be revoked. */
export const workspaceInvite = pgTable(
  "workspace_invite",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    /** The role joining gives (ADR-0006); `partner` links name their partner company. */
    role: text("role").notNull().default("auditor"),
    partnerId: text("partner_id"),
  },
  (table) => [
    index("workspace_invite_workspace_idx").on(table.workspaceId),
    // The SET NULL when the inviting user is deleted (task 033).
    index("workspace_invite_created_by_idx").on(table.createdBy),
    foreignKey({
      name: "workspace_invite_partner_fk",
      columns: [table.partnerId, table.workspaceId],
      foreignColumns: [partner.id, partner.workspaceId],
    }),
    check("workspace_invite_role_check", sql`${table.role} in ('admin', 'auditor', 'partner')`),
    check("workspace_invite_partner_check", sql`(${table.role} = 'partner') = (${table.partnerId} is not null)`),
  ],
);

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  /** Who created it; cleared if they're deleted, so shared work stays. Access is by workspace membership (ADR-0005). */
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  /** The customer this project is for (task 016). Cleared if the customer is deleted. */
  organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
  /** The fixed owner (ADR-0006): `internal`, or `partner` with `partnerId` set (and a customer). */
  visibility: text("visibility").notNull().default("internal"),
  partnerId: text("partner_id"),
  /**
   * `active` or `canceled`, set by hand (ADR-0006). Named `lifecycle` here so it never collides with the
   * status derived from the project's tasks (features/projects/project-status.ts).
   */
  lifecycle: text("status").notNull().default("active"),
  /** The project this one was copied from, if any (ADR-0006). */
  copiedFromId: text("copied_from_id").references((): AnyPgColumn => project.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
}, (table) => [
  // A workspace's projects, a customer's projects, and the SET NULL when a customer is deleted.
  index("project_workspace_organization_idx").on(table.workspaceId, table.organizationId),
  index("project_partner_idx").on(table.partnerId),
  foreignKey({
    name: "project_partner_fk",
    columns: [table.partnerId, table.workspaceId],
    foreignColumns: [partner.id, partner.workspaceId],
  }),
  check("project_visibility_check", sql`${table.visibility} in ('internal', 'partner')`),
  check("project_partner_check", sql`(${table.visibility} = 'partner') = (${table.partnerId} is not null)`),
  check("project_partner_customer_check", sql`${table.visibility} <> 'partner' or ${table.organizationId} is not null`),
  check("project_status_check", sql`${table.lifecycle} in ('active', 'canceled')`),
]);

export const task = pgTable("task", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  /** The customer this task is about (task 017); may differ from the project's. Cleared if it is deleted. */
  organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  /** Set when the task moves to Done, cleared when it moves out. Null for tasks completed before this column existed. */
  completedAt: timestamp("completed_at"),
  /** A calendar day (task 019); `date` so no time zone can shift it. Read as "YYYY-MM-DD". */
  dueDate: date("due_date", { mode: "string" }),
  /** One member of the task's workspace (task 025); cleared if they leave or are removed. */
  assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
}, (table) => [
  // A project's board, and the cascade when a project is deleted (task 033).
  index("task_project_idx").on(table.projectId),
  // A customer's open tasks, and the SET NULL when a customer is deleted.
  index("task_organization_idx").on(table.organizationId),
  // "My tasks", and clearing assignments when a member leaves.
  index("task_assignee_idx").on(table.assigneeId),
]);

/** Customers and other outside organizations, in one directory with a `kind` (ADR-0004). */
export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    /** Who created it; cleared if they're deleted, so shared work stays. Access is by workspace membership (ADR-0005). */
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("customer"),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    website: text("website"),
    companyId: text("company_id"),
    /** "General information": one editable text. Dated notes live in their own table (task 015). */
    about: text("about"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Who to reach first (task 038). A pointer keeps "only one primary" true; cleared when that contact is removed. */
    primaryContactId: text("primary_contact_id").references((): AnyPgColumn => organizationContact.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    index("organization_workspace_kind_idx").on(table.workspaceId, table.kind),
    // Lets customer_partner require a customer of its own workspace.
    unique("organization_id_workspace_unique").on(table.id, table.workspaceId),
  ],
);

/** People at an organization (task 014). Deleted with the organization. */
export const organizationContact = pgTable(
  "organization_contact",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    phone: text("phone"),
    email: text("email"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [index("organization_contact_organization_idx").on(table.organizationId)],
);

/** Dated notes about an organization, newest first in the UI (task 015). Deleted with the organization. */
export const organizationNote = pgTable(
  "organization_note",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** Who wrote it (task 025); null for notes from before authors were recorded. */
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    index("organization_note_organization_idx").on(table.organizationId, table.createdAt),
    // The SET NULL when the author is deleted (task 033).
    index("organization_note_author_idx").on(table.authorId),
  ],
);

/**
 * Customer names a user may see (`can_see_customer_name`, ADR-0006): partners read the names of their
 * assigned customers here, never `organization` itself. Customers only, not deleted ones. Created in
 * migration 0020 (task 047), narrowed in 0023 (task 049).
 */
export const customerName = pgView("customer_name", {
  id: text("id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
}).existing();
