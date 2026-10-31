import type { WorkspaceRole } from "./roles";

/**
 * Whether someone with `role` may change anything at all, for hiding forms on pages. Auditors see
 * everything and change nothing (ADR-0006). The server checks each write again (`require-change.ts`).
 */
export function canChange(role: WorkspaceRole): boolean {
  return role !== "auditor";
}

/** Whether someone with `role` may create or change customers, their contacts and notes: admins only (`can_change_customer`). */
export function canChangeCustomers(role: WorkspaceRole): boolean {
  return role === "admin";
}

/** Whether someone with `role` sees the partner companies pages: admins and auditors (admins change them). */
export function canSeePartners(role: WorkspaceRole): boolean {
  return role !== "partner";
}

/** Whether someone with `role` sees customer pages (list, details, contacts, notes); partners see only names (`can_see_customer`). */
export function canSeeCustomers(role: WorkspaceRole): boolean {
  return role !== "partner";
}

/** Whether someone with `role` sees the Deleted page: admins and auditors; partners never see deleted items (design rule 8). */
export function canSeeDeleted(role: WorkspaceRole): boolean {
  return role !== "partner";
}

/** Whether someone with `role` restores deleted items: admins only (`restoreAction` checks again). */
export function canRestore(role: WorkspaceRole): boolean {
  return role === "admin";
}
