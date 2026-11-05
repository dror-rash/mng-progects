import type { WorkspaceRole } from "./roles";

/**
 * Whether someone with `role` may create projects, for hiding the New project link and page: admins and
 * partners' users. Auditors see everything and change nothing (ADR-0006); workers work on their crew's
 * projects but create none (task 056). The server checks each write again (`require-change.ts`); a
 * record's own `canChange` / `canWork` decide what shows on its page.
 */
export function canChange(role: WorkspaceRole): boolean {
  return role === "admin" || role === "partner";
}

/** Whether someone with `role` may create or change customers, their contacts and notes: admins only (`can_change_customer`). */
export function canChangeCustomers(role: WorkspaceRole): boolean {
  return role === "admin";
}

/** Whether someone with `role` sees the partner companies pages: admins and auditors (admins change them). */
export function canSeePartners(role: WorkspaceRole): boolean {
  return role === "admin" || role === "auditor";
}

/**
 * Whether someone with `role` sees customer pages (list, details, contacts, notes); partners and workers see
 * only names (`can_see_customer`).
 */
export function canSeeCustomers(role: WorkspaceRole): boolean {
  return role === "admin" || role === "auditor";
}

/**
 * Whether someone with `role` sees the Deleted page: admins and auditors; partners and workers never see
 * deleted items (design rule 8).
 */
export function canSeeDeleted(role: WorkspaceRole): boolean {
  return role === "admin" || role === "auditor";
}

/** Whether someone with `role` restores deleted items: admins only (`restoreAction` checks again). */
export function canRestore(role: WorkspaceRole): boolean {
  return role === "admin";
}

/**
 * Whether someone with `role` sees the Reading forms pages (task 060): admins and auditors. Workers and
 * partners' users read published forms only to fill them in (task 061).
 */
export function canSeeReadingForms(role: WorkspaceRole): boolean {
  return role === "admin" || role === "auditor";
}

/** Whether someone with `role` builds, publishes and archives reading forms: admins only (the actions check again). */
export function canBuildReadingForms(role: WorkspaceRole): boolean {
  return role === "admin";
}
