/** Why a site can't be deleted (task 055): the projects at it, by name. */
export function siteInUseMessage(projects: string[]) {
  return `Projects at this site: ${projects.join(", ")}. Move them to another site first.`;
}
