/** What a deleted project depends on (task 071): whether its customer, its site, and the site's company are deleted. */
export type ProjectParents = { customerDeleted: boolean; siteDeleted: boolean; siteCompanyDeleted: boolean };

/**
 * Why a deleted project can't come back yet, or null when it can (task 071): every project that isn't
 * deleted has a customer and a site that aren't either. Its customer first, then its site, then the
 * sub-company the site belongs to (when that isn't the project's customer).
 */
export function projectRestoreBlock(parents: ProjectParents): string | null {
  if (parents.customerDeleted) return "Restore its customer first";
  if (parents.siteDeleted) return "Restore its site first";
  if (parents.siteCompanyDeleted) return "Restore its site's customer first";
  return null;
}
