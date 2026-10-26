/** Tags across many organizations, merged case-insensitively (the first spelling seen wins), sorted. */
export function distinctTags(tagLists: string[][]): string[] {
  const byKey = new Map<string, string>();
  for (const tag of tagLists.flat()) {
    if (!byKey.has(tag.toLowerCase())) byKey.set(tag.toLowerCase(), tag);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function sameTag(a: string | undefined, b: string): boolean {
  return a !== undefined && a.toLowerCase() === b.toLowerCase();
}
