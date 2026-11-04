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
