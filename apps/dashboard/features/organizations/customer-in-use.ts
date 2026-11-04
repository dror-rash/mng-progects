/**
 * Why a customer or sub-company can't be deleted (task 071): the projects for it or at one of its sites, by
 * name. Like `siteInUseMessage`; `listProjectsOfCustomer` finds them.
 */
export function customerInUseMessage(projects: string[]) {
  return `Projects for this customer or at its sites: ${projects.join(", ")}. Move or delete them first.`;
}
