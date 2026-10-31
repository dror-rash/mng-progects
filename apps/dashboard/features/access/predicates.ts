import { type AnyColumn, sql } from "@repo/db";

// SQL conditions for queries, each calling one of the access functions defined in the database
// (migration 0018, ADR-0006). The one access rule: every query and lookup goes through these.

/** `userId` can see the project in `projectId` (admins and auditors of its workspace; its own partner). */
export function canSeeProject(userId: string, projectId: AnyColumn) {
  return sql<boolean>`can_see_project(${userId}, ${projectId})`;
}

/** `userId` can change the project in `projectId` and its tasks (not auditors; never a deleted project). */
export function canChangeProject(userId: string, projectId: AnyColumn) {
  return sql<boolean>`can_change_project(${userId}, ${projectId})`;
}

/** `userId` can see everything about the customer in `orgId` (admins and auditors). */
export function canSeeCustomer(userId: string, orgId: AnyColumn) {
  return sql<boolean>`can_see_customer(${userId}, ${orgId})`;
}

/** `userId` can see the name of the customer in `orgId` (also partners it is assigned to). */
export function canSeeCustomerName(userId: string, orgId: AnyColumn) {
  return sql<boolean>`can_see_customer_name(${userId}, ${orgId})`;
}

/** `userId` can change the customer in `orgId`, its contacts and notes (admins only). */
export function canChangeCustomer(userId: string, orgId: AnyColumn) {
  return sql<boolean>`can_change_customer(${userId}, ${orgId})`;
}

/**
 * `userId` has one of `roles` in the workspace in `workspaceId` (`has_workspace_role`; a deleted
 * partner's users have none). Partner companies are seen by admins and auditors and changed by admins.
 */
export function hasWorkspaceRole(userId: string, workspaceId: AnyColumn, roles: ("admin" | "auditor")[]) {
  return sql<boolean>`has_workspace_role(${userId}, ${workspaceId}, ${`{${roles.join(",")}}`}::text[])`;
}

/**
 * The partner in `partnerId` works for the customer in `orgId`: it is assigned to the partner, and neither
 * is deleted (`partner_serves_customer`). A partner's project must have such a customer (rule 4).
 */
export function partnerServesCustomer(partnerId: string, orgId: AnyColumn) {
  return sql<boolean>`partner_serves_customer(${partnerId}, ${orgId})`;
}
