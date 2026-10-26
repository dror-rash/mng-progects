/**
 * Tables required by Better Auth (email + password). Add your own domain tables below,
 * then run `pnpm db:generate` and commit the new migration.
 * If you enable Better Auth plugins that need tables, regenerate with `npx @better-auth/cli generate`.
 */
import { sql } from "drizzle-orm";
import { boolean, date, index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

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
    /** `admin` or `member` (features/workspaces/roles.ts). */
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] }), index("workspace_member_user_idx").on(table.userId)],
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
  },
  (table) => [index("workspace_invite_workspace_idx").on(table.workspaceId)],
);

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  /** Who created it. Access is by workspace membership, not by this column (ADR-0005). */
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  /** The customer this project is for (task 016). Cleared if the customer is deleted. */
  organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // A workspace's projects, a customer's projects, and the SET NULL when a customer is deleted.
  index("project_workspace_organization_idx").on(table.workspaceId, table.organizationId),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // A customer's open tasks, and the SET NULL when a customer is deleted.
  index("task_organization_idx").on(table.organizationId),
]);

/** Customers and other outside organizations, in one directory with a `kind` (ADR-0004). */
export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    /** Who created it. Access is by workspace membership (ADR-0005). */
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("organization_workspace_kind_idx").on(table.workspaceId, table.kind)],
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("organization_note_organization_idx").on(table.organizationId, table.createdAt)],
);
