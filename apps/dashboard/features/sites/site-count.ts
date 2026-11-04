/** How many sites a company has, for its row on its parent's page (task 072): "No sites", "1 site", "2 sites". */
export function siteCountLabel(count: number) {
  if (count === 0) return "No sites";
  return count === 1 ? "1 site" : `${count} sites`;
}
