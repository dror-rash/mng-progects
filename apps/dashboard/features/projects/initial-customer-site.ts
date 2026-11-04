import type { SiteChoice } from "@/features/sites/site-options";

/**
 * The customer and site a new project starts with, from the page's `?site=` and `?customer=` (task 072).
 * A site I may choose wins and brings its own customer (the sub-company for a sub-company's site); else a
 * customer I may choose. Anything else (an unknown id, another workspace's, a deleted one) is ignored.
 */
export function initialCustomerAndSite(
  requested: { customer?: string; site?: string },
  customers: { id: string }[],
  sites: SiteChoice[],
): { customerId?: string; siteId?: string } {
  const canChoose = (customerId: string) => customers.some((c) => c.id === customerId);
  const site = sites.find((s) => s.id === requested.site);
  if (site && canChoose(site.organizationId)) return { customerId: site.organizationId, siteId: site.id };
  if (requested.customer && canChoose(requested.customer)) return { customerId: requested.customer };
  return {};
}

/**
 * Where Cancel goes on a new project started from `start` (task 072): back to the site when I can see it
 * (`can_see_site`), else All projects; back to the customer when I can see customers; else the form's
 * default (undefined).
 */
export function newProjectCancelHref(
  start: { customerId?: string; siteId?: string },
  can: { canSeeSite: boolean; canSeeCustomers: boolean },
) {
  if (start.siteId) return can.canSeeSite ? `/sites/${start.siteId}` : "/projects";
  if (start.customerId && can.canSeeCustomers) return `/customers/${start.customerId}`;
  return undefined;
}
