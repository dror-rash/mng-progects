/** A site a project may be at, as `listSiteChoices` returns it: the site and the customer it belongs to. */
export type SiteChoice = {
  id: string;
  name: string;
  organizationId: string;
  /** The site's customer's parent, for a sub-company's site. */
  customerParentId: string | null;
  customerName: string;
};

/**
 * The Site options for a project of `customerId` (task 055): the customer's own sites and its sub-companies'
 * sites, a sub-company's shown as "Site (Sub-company)", sorted by what they show. None without a customer.
 * Pure, so the project form filters on the client as the customer changes.
 */
export function siteOptionsFor(customerId: string, choices: SiteChoice[]): { id: string; label: string }[] {
  if (!customerId) return [];
  return choices
    .filter((c) => c.organizationId === customerId || c.customerParentId === customerId)
    .map((c) => ({ id: c.id, label: c.organizationId === customerId ? c.name : `${c.name} (${c.customerName})` }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}
