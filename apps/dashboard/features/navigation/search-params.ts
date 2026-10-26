/** The first value of a search param (Next gives an array when it repeats), trimmed; blank means missing. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

/** `path` with the given params, leaving out empty ones. */
export function withParams(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
