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
