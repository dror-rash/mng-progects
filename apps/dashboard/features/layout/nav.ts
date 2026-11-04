import type { WorkspaceRole } from "@/features/access/roles";
import { canSeeCustomers } from "@/features/access/scope";

export type NavItem = { href: string; label: string };

const NAV: readonly NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "All projects" },
  { href: "/customers", label: "Customers" },
];

/**
 * The dashboard menu for my role (task 070): Overview and All projects, plus Customers for admins and
 * auditors (`canSeeCustomers`). Partners, My tasks and Deleted are out of the menu but open by address.
 */
export function navFor(role: WorkspaceRole): NavItem[] {
  return canSeeCustomers(role) ? [...NAV] : NAV.filter((item) => item.href !== "/customers");
}
